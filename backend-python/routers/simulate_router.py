import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends

from db import get_db
from auth import get_current_user
from services.azure_openai import simulate_life
from services.eval_service import score_simulation_background
from services import orchestrator, llm_cache

router = APIRouter()

_FALLBACK = {
    "paths": [
        {
            "title": "The Builder",
            "icon": "🏗",
            "probability": 45,
            "tagline": "You ship something the world uses.",
            "milestones": [
                {"month": 1, "event": "Define your core idea and validate it"},
                {"month": 3, "event": "Ship MVP to first 50 users"},
                {"month": 6, "event": "Full-time founder with real traction"},
            ],
            "agent_match": "ARIA — shares your builder trajectory and career-switch energy",
        },
        {
            "title": "The Scholar",
            "icon": "📚",
            "probability": 35,
            "tagline": "You become the world's authority on what you love.",
            "milestones": [
                {"month": 1, "event": "Commit to one domain and go deep"},
                {"month": 3, "event": "Publish your first original insight"},
                {"month": 6, "event": "Recognized expert with a growing network"},
            ],
            "agent_match": "VEDA — mastered the research-to-impact pipeline before you",
        },
        {
            "title": "The Explorer",
            "icon": "🌍",
            "probability": 20,
            "tagline": "You move to where the opportunity is.",
            "milestones": [
                {"month": 1, "event": "Research and apply to target opportunities abroad"},
                {"month": 3, "event": "Secure a position or program"},
                {"month": 6, "event": "Settled in new environment, network growing fast"},
            ],
            "agent_match": "NOX — navigated the leap from local to global",
        },
    ],
    "collective_insight": "The network has spoken — your signal is clear. Move.",
}


@router.post("/simulate")
async def run_simulation(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    # Gather knowledge chunks to personalise the simulation
    cursor = await db.execute(
        "SELECT content, category FROM knowledge_chunks WHERE user_id = ? ORDER BY created_at DESC LIMIT 15",
        (current_user["id"],),
    )
    rows = await cursor.fetchall()
    knowledge = "\n".join(
        f"- [{row['category'] or 'general'}] {row['content']}" for row in rows
    ) if rows else ""

    user_profile = {
        "name": current_user.get("name"),
        "bio": current_user.get("agent_bio") or "",
        "score": current_user.get("agent_score", 100),
        "knowledge": knowledge,
    }
    onboarding = {
        "focus": current_user.get("focus") or "exploring",
        "goal": current_user.get("goal") or "personal growth",
        "fear": current_user.get("fear") or "uncertainty",
    }

    # ── Exact-match cache: identical profile+knowledge → reuse (free) ──────────
    cache_key = llm_cache.make_key(
        "simulate", current_user["id"],
        onboarding, knowledge, current_user.get("agent_bio") or "",
    )
    cached = await llm_cache.cache_get(db, cache_key)
    if cached:
        return cached

    # ── Graph-RAG: retrieve real peer outcomes relevant to this person (free) ──
    rag_query = (
        f"{onboarding['focus']} {onboarding['goal']} {onboarding['fear']} {knowledge}"
    )
    rag = await orchestrator.graph_rag_context(db, rag_query, current_user["id"], k=8)
    peer_context = rag["context_text"]

    result_text, usage = await simulate_life(user_profile, onboarding, peer_context=peer_context)

    # Parse structured JSON from LLM; fall back to static template if malformed
    output_type = "llm"
    try:
        raw = result_text.strip()
        # Strip markdown code fences if present
        if "```" in raw:
            parts = raw.split("```")
            for part in parts:
                candidate = part.strip()
                if candidate.startswith("json"):
                    candidate = candidate[4:].strip()
                if candidate.startswith("{"):
                    raw = candidate
                    break
        simulation = json.loads(raw.strip())
        # Validate required structure
        if "paths" not in simulation or not isinstance(simulation["paths"], list):
            raise ValueError("missing paths")
    except Exception:
        simulation = _FALLBACK
        output_type = "fallback"

    now = datetime.now(timezone.utc).isoformat()
    user_name = current_user.get("name", "Unknown")

    # Log to llm_logs and simulation_logs
    await db.execute(
        "INSERT INTO llm_logs (id,user_id,user_name,call_type,tokens_in,tokens_out,duration_ms,status,created_at)"
        " VALUES (?,?,?,?,?,?,?,?,?)",
        (str(uuid.uuid4()), current_user["id"], user_name, "simulation",
         usage["tokens_in"], usage["tokens_out"], usage["duration_ms"], output_type, now),
    )
    sim_log_id = str(uuid.uuid4())
    await db.execute(
        "INSERT INTO simulation_logs (id,user_id,user_name,chunks_used,duration_ms,output_type,created_at)"
        " VALUES (?,?,?,?,?,?,?)",
        (sim_log_id, current_user["id"], user_name,
         len(rows), usage["duration_ms"], output_type, now),
    )
    # Update user last_active
    await db.execute("UPDATE users SET last_active=? WHERE id=?", (now, current_user["id"]))
    await db.commit()

    # Pipeline 2 — score this simulation in the background (only for real LLM output)
    if output_type == "llm":
        chunks_for_eval = [{"content": r["content"], "category": r["category"]} for r in rows]
        background_tasks.add_task(
            score_simulation_background,
            sim_log_id, current_user["id"], user_name,
            chunks_for_eval, json.dumps(simulation),
        )

    response = {
        "simulation": simulation,
        "knowledge_count": len(rows),
        "grounding": {
            "peers": rag["peer_count"],
            "peer_chunks": rag["chunk_count"],
            "grounded": rag["chunk_count"] > 0,
        },
    }
    # Cache real outputs; invalidated automatically when the user's chunks change.
    if output_type == "llm":
        await llm_cache.cache_put(db, cache_key, "simulate", current_user["id"], response)
        await db.commit()

    return response
