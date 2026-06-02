import uuid
import json
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File

from db import get_db
from auth import get_current_user
from models.chat import (
    ChatMessageIn, ChatMessageOut, KnowledgeChunkIn, KnowledgeChunkOut,
    ChatResponse, ProfileUpdate, EnhanceRequest, EnhanceResponse, UploadResponse,
)
from services.chatbot_service import (
    OPENING_MESSAGE,
    build_system_prompt,
    extract_knowledge,
    build_agent_bio,
    enhance_content,
    extract_text_from_file,
)
from services.azure_openai import chat_complete
from services.eval_service import score_chunk_background, check_enhancement_hallucinations

router = APIRouter()


async def _get_history(db, user_id: str) -> list[dict]:
    cursor = await db.execute(
        "SELECT id, role, content FROM chat_messages WHERE user_id=? ORDER BY created_at ASC LIMIT 40",
        (user_id,),
    )
    rows = await cursor.fetchall()
    return [{"id": r["id"], "role": r["role"], "content": r["content"]} for r in rows]


async def _get_chunks(db, user_id: str) -> list[dict]:
    cursor = await db.execute(
        "SELECT content, category FROM knowledge_chunks WHERE user_id=? ORDER BY created_at ASC",
        (user_id,),
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def _save_message(db, user_id: str, role: str, content: str) -> tuple[str, str]:
    msg_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "INSERT INTO chat_messages (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        (msg_id, user_id, role, content, created_at),
    )
    return msg_id, created_at


async def _save_chunk(db, user_id: str, content: str, category: str) -> str:
    chunk_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "INSERT INTO knowledge_chunks (id, user_id, content, category, created_at) VALUES (?, ?, ?, ?, ?)",
        (chunk_id, user_id, content, category, created_at),
    )
    return chunk_id


@router.post("/message", response_model=ChatResponse)
async def send_message(
    payload: ChatMessageIn,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    user_id = current_user["id"]
    user_name = current_user["name"]

    history = await _get_history(db, user_id)

    # First-ever message: return canned greeting (idempotent)
    if not history:
        cursor2 = await db.execute(
            "SELECT id FROM chat_messages WHERE user_id=? LIMIT 1", (user_id,)
        )
        already_exists = await cursor2.fetchone()
        if not already_exists:
            msg_id, created_at = await _save_message(db, user_id, "assistant", OPENING_MESSAGE)
            await db.commit()
        else:
            msg_id = None
            created_at = datetime.now(timezone.utc).isoformat()
        return ChatResponse(
            message=ChatMessageOut(
                id=msg_id,
                role="assistant",
                content=OPENING_MESSAGE,
                created_at=created_at,
            ),
            profile_update=None,
        )

    # Save user message
    user_msg_id, user_created_at = await _save_message(db, user_id, "user", payload.content)

    # Fetch knowledge chunks for context
    chunks = await _get_chunks(db, user_id)

    # Build messages for LLM (strip ids for API call)
    system_content = build_system_prompt(user_name, chunks)
    messages = [{"role": "system", "content": system_content}]
    messages.extend([{"role": h["role"], "content": h["content"]} for h in history])
    messages.append({"role": "user", "content": payload.content})

    # LLM response
    llm_result = await chat_complete(messages, temperature=0.8, return_usage=True)
    assistant_reply = llm_result["content"]
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "INSERT INTO llm_logs (id,user_id,user_name,call_type,tokens_in,tokens_out,duration_ms,status,created_at)"
        " VALUES (?,?,?,?,?,?,?,?,?)",
        (str(uuid.uuid4()), user_id, user_name, "chatbot",
         llm_result["tokens_in"], llm_result["tokens_out"], llm_result["duration_ms"], "llm", now_iso),
    )
    await db.execute("UPDATE users SET last_active=? WHERE id=?", (now_iso, user_id))

    # Save assistant response
    asst_id, asst_created_at = await _save_message(db, user_id, "assistant", assistant_reply)

    # Knowledge extraction
    profile_update = None
    try:
        extracted = await extract_knowledge(payload.content)
        if extracted and extracted.get("should_save"):
            chunk_content  = extracted["content"]
            chunk_category = extracted.get("category", "general")
            chunk_id = await _save_chunk(db, user_id, chunk_content, chunk_category)
            background_tasks.add_task(
                score_chunk_background, chunk_id, user_id, user_name, chunk_content, chunk_category
            )
            all_chunks = await _get_chunks(db, user_id)
            new_bio = await build_agent_bio(user_name, all_chunks)
            skills = [c["content"] for c in all_chunks if c["category"] == "skill"][:8]
            await db.execute(
                "UPDATE users SET agent_bio=?, agent_skills=? WHERE id=?",
                (new_bio, json.dumps(skills), user_id),
            )
            profile_update = ProfileUpdate(
                bio=new_bio,
                skills=skills,
                chunks_saved=len(all_chunks),
            )
    except Exception:
        pass

    await db.commit()

    return ChatResponse(
        message=ChatMessageOut(
            id=asst_id,
            role="assistant",
            content=assistant_reply,
            created_at=asst_created_at,
        ),
        profile_update=profile_update,
    )


@router.get("/chunks")
async def get_chunks(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    cursor = await db.execute(
        "SELECT content, category, created_at FROM knowledge_chunks WHERE user_id=? ORDER BY created_at ASC",
        (current_user["id"],),
    )
    rows = await cursor.fetchall()
    return [{"content": r["content"], "category": r["category"], "created_at": r["created_at"]} for r in rows]


@router.get("/history", response_model=list[ChatMessageOut])
async def get_history(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    cursor = await db.execute(
        "SELECT id, role, content, created_at FROM chat_messages WHERE user_id=? ORDER BY created_at ASC",
        (current_user["id"],),
    )
    rows = await cursor.fetchall()
    return [
        ChatMessageOut(id=r["id"], role=r["role"], content=r["content"], created_at=r["created_at"])
        for r in rows
    ]


@router.delete("/history")
async def clear_history(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    await db.execute(
        "DELETE FROM chat_messages WHERE user_id=?", (current_user["id"],)
    )
    await db.commit()
    return {"deleted": True}


@router.delete("/history/{message_id}")
async def delete_message(
    message_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    cursor = await db.execute(
        "SELECT id FROM chat_messages WHERE id=? AND user_id=?",
        (message_id, current_user["id"]),
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Message not found")
    await db.execute("DELETE FROM chat_messages WHERE id=?", (message_id,))
    await db.commit()
    return {"deleted": True}


@router.post("/enhance", response_model=EnhanceResponse)
async def enhance_message(
    payload: EnhanceRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    chunks = await _get_chunks(db, current_user["id"])
    enhanced_text = await enhance_content(payload.content, current_user["name"], chunks)

    # Pipeline 3 — hallucination guard
    guard = await check_enhancement_hallucinations(payload.content, enhanced_text, chunks)
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "INSERT INTO enhance_logs"
        " (id,user_id,original,flagged,hallucinations,enhanced_text,raw_guard_response,"
        "  user_prompt,tokens_in,tokens_out,created_at)"
        " VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (str(uuid.uuid4()), current_user["id"], payload.content,
         1 if guard["flagged"] else 0, json.dumps(guard["hallucinations"]),
         enhanced_text, guard.get("raw_response", ""),
         guard.get("user_prompt", ""), guard.get("tokens_in", 0), guard.get("tokens_out", 0),
         now),
    )
    await db.commit()

    return EnhanceResponse(
        enhanced=enhanced_text,
        flagged=guard["flagged"],
        hallucinations=guard["hallucinations"],
    )


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    allowed = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "image/png", "image/jpeg", "image/webp", "image/gif",
    }
    content_type = file.content_type or ""
    if content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {content_type}")

    data = await file.read()
    extracted, file_type = await extract_text_from_file(data, content_type, file.filename or "")
    return UploadResponse(
        extracted_text=extracted,
        file_type=file_type,
        file_name=file.filename or "upload",
    )


@router.post("/knowledge", response_model=KnowledgeChunkOut)
async def save_knowledge(
    payload: KnowledgeChunkIn,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    if payload.category not in {"skill", "experience", "goal", "fear", "general"}:
        raise HTTPException(status_code=400, detail="Invalid category")

    chunk_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    await db.execute(
        "INSERT INTO knowledge_chunks (id, user_id, content, category, created_at) VALUES (?, ?, ?, ?, ?)",
        (chunk_id, current_user["id"], payload.content, payload.category, created_at),
    )
    await db.commit()

    return KnowledgeChunkOut(
        id=chunk_id,
        content=payload.content,
        category=payload.category,
        created_at=created_at,
    )
