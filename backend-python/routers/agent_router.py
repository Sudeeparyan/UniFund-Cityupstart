"""Expert-agent council endpoints.

POST /api/agent/council  — route a question to the relevant expert agents, run
                           them on the cheap tier in parallel, fuse with one
                           big-model synthesis. Returns the answer, each
                           expert's real contribution, and agent_logs for the
                           SpaceArena visualisation.
GET  /api/agent/experts  — the public roster (for UI).
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from db import get_db
from auth import get_current_user
from services import orchestrator, llm_cache, personas
from services.expert_agents import public_roster, special_roster

router = APIRouter()


class CouncilRequest(BaseModel):
    query: str
    k: int = 3


class DebateRequest(BaseModel):
    query: str


@router.get("/agent/experts")
async def list_experts():
    return {"experts": public_roster(), "special": special_roster()}


@router.get("/agent/network")
async def featured_network():
    """The featured human persona agents (real, seeded, matchable)."""
    return {"agents": personas.featured_leaderboard()}


@router.get("/agent/population")
async def population(db=Depends(get_db)):
    """Live, dynamic count of agents — proof the network is real, not static."""
    async def count(sql, *p):
        cur = await db.execute(sql, p)
        return (await cur.fetchone())[0]

    students = await count("SELECT COUNT(*) FROM users WHERE id LIKE 'student-%'")
    persona_ct = await count("SELECT COUNT(*) FROM users WHERE id LIKE 'persona-%'")
    cards = await count("SELECT COUNT(*) FROM agent_cards")
    embeds = await count("SELECT COUNT(*) FROM chunk_embeddings")
    from services.agent_seed import AGENTS
    ambient = len(AGENTS)
    return {
        "real_student_agents": students,
        "featured_personas": persona_ct,
        "ambient_test_agents": ambient,
        "total_agents": students + persona_ct + ambient,
        "embedded_agent_cards": cards,
        "knowledge_embeddings": embeds,
    }


@router.get("/agent/mentors")
async def mentors(
    k: int = 3,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """MENTOR-MATCH — real network agents most similar to you."""
    matches = await orchestrator.match_mentors(db, current_user["id"], k=max(1, min(6, k)))
    return {"mentors": matches}


@router.post("/agent/debate")
async def agent_debate(
    body: DebateRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    query = (body.query or "").strip()
    if not query:
        return {"verdict": "Give me a plan or decision and I'll convene the debate.",
                "advocate": "", "skeptic": "", "agent_logs": []}
    user_id = current_user["id"]
    user_name = current_user.get("name", "User")
    cursor = await db.execute(
        "SELECT content, category FROM knowledge_chunks WHERE user_id=? ORDER BY created_at DESC LIMIT 12",
        (user_id,))
    rows = await cursor.fetchall()
    context = "\n".join(f"- [{r['category'] or 'general'}] {r['content']}" for r in rows)
    result = await orchestrator.run_debate(db, query, user_id, user_name, context=context)
    await db.commit()
    return result


@router.post("/agent/council")
async def agent_council(
    body: CouncilRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    query = (body.query or "").strip()
    if not query:
        return {"answer": "Ask me anything about your path and I'll convene the council.",
                "experts": [], "agent_logs": [], "confidence": 0}

    user_id = current_user["id"]
    user_name = current_user.get("name", "User")

    # Personal context = the user's own knowledge chunks.
    cursor = await db.execute(
        "SELECT content, category FROM knowledge_chunks WHERE user_id=? ORDER BY created_at DESC LIMIT 15",
        (user_id,),
    )
    rows = await cursor.fetchall()
    context = "\n".join(f"- [{r['category'] or 'general'}] {r['content']}" for r in rows)

    k = max(1, min(5, body.k))
    cache_key = llm_cache.make_key("council", user_id, query, k, context)
    cached = await llm_cache.cache_get(db, cache_key)
    if cached:
        return cached

    result = await orchestrator.run_council(
        db, query, user_id, user_name, context=context, k=k,
    )
    await db.execute(
        "UPDATE users SET last_active=? WHERE id=?",
        (datetime.now(timezone.utc).isoformat(), user_id),
    )
    if result.get("output_type") == "llm":
        await llm_cache.cache_put(db, cache_key, "council", user_id, result)
    await db.commit()
    return result
