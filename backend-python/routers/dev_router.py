import json
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from db import get_db
from auth import get_dev_user, create_dev_token, validate_dev_credentials
from services.eval_service import score_chunk_background
from models.dev import (
    DevLoginRequest, DevLoginResponse,
    LLMCallOut, LLMStatsOut, HourlyTokens,
    FunnelOut, DevUserOut,
    SimStatsOut, SimLogOut, DailyCount,
    CommunityStatsOut, FeatureFlagsOut, FeatureFlagsIn,
    BroadcastIn, ActionResponse,
    ChunkEvalStats, ChunkEvalOut, UserChunkSummary,
    SimEvalOut, SimEvalStats, EnhanceStats, EnhanceLogOut,
)

router = APIRouter()

# TODO: Estimates Cost, need to update it
COST_PER_TOKEN = 0.00003


def _quality_label(chunks: int) -> str:
    if chunks >= 10:
        return "Strong"
    if chunks >= 4:
        return "Moderate"
    if chunks >= 1:
        return "Thin"
    return "Empty"


def _today_start() -> str:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()


# Auth Router
@router.post("/auth", response_model=DevLoginResponse)
async def dev_login(payload: DevLoginRequest):
    if not validate_dev_credentials(payload.email, payload.password):
        raise HTTPException(status_code=401, detail="Invalid developer credentials")
    token = create_dev_token(payload.email)
    return DevLoginResponse(token=token, email=payload.email)


# LLM Health Router

@router.get("/llm/stats", response_model=LLMStatsOut)
async def llm_stats(_=Depends(get_dev_user), db=Depends(get_db)):
    today = _today_start()

    cur = await db.execute(
        "SELECT tokens_in+tokens_out AS t, duration_ms, status FROM llm_logs WHERE created_at >= ?",
        (today,),
    )
    rows = await cur.fetchall()
    tokens_today = sum(r["t"] for r in rows)
    total_calls_today = len(rows)
    fallbacks = sum(1 for r in rows if r["status"] == "fallback")
    fallback_rate = round((fallbacks / total_calls_today * 100) if total_calls_today else 0, 1)
    avg_dur = round(sum(r["duration_ms"] for r in rows) / total_calls_today if total_calls_today else 0, 0)

    cur2 = await db.execute("SELECT SUM(tokens_in+tokens_out) FROM llm_logs")
    row2 = await cur2.fetchone()
    tokens_total = row2[0] or 0

    return LLMStatsOut(
        tokens_today=tokens_today,
        tokens_total=tokens_total,
        cost_today_usd=round(tokens_today * COST_PER_TOKEN, 4),
        fallback_rate=fallback_rate,
        avg_duration_ms=avg_dur,
        total_calls_today=total_calls_today,
    )

# Recent LLM Calls -> get 40 recent calls
# if wondering, ** unpacks dictionary to named arguments trying to match LLMCallOutFields

@router.get("/llm/recent", response_model=list[LLMCallOut])
async def llm_recent(_=Depends(get_dev_user), db=Depends(get_db)):
    cur = await db.execute(
        "SELECT * FROM llm_logs ORDER BY created_at DESC LIMIT 40"
    )
    rows = await cur.fetchall()
    return [LLMCallOut(**dict(r)) for r in rows]

# LLM Calls by Hour (for last 24 hour)

@router.get("/llm/hourly", response_model=list[HourlyTokens])
async def llm_hourly(_=Depends(get_dev_user), db=Depends(get_db)):
    results = []
    now = datetime.now(timezone.utc)
    for h in range(23, -1, -1):
        hour_start = (now - timedelta(hours=h)).replace(minute=0, second=0, microsecond=0)
        hour_end   = hour_start + timedelta(hours=1)
        cur = await db.execute(
            "SELECT SUM(tokens_in+tokens_out) FROM llm_logs WHERE created_at >= ? AND created_at < ?",
            (hour_start.isoformat(), hour_end.isoformat()),
        )
        row = await cur.fetchone()
        results.append(HourlyTokens(
            hour=hour_start.strftime("%H:00"),
            tokens=row[0] or 0,
        ))
    return results


# Onboarding Funnel i.e, info of the users who signed up, posted, ran simulation and etc etc

@router.get("/funnel", response_model=FunnelOut)
async def funnel(_=Depends(get_dev_user), db=Depends(get_db)):

    # Total signups
    cur = await db.execute("SELECT COUNT(*) FROM users")
    signed_up = (await cur.fetchone())[0]

    # Chatbot complete = users with >= 3 knowledge chunks
    cur = await db.execute(
        "SELECT COUNT(DISTINCT user_id) FROM knowledge_chunks GROUP BY user_id HAVING COUNT(*) >= 3"
    )
    rows = await cur.fetchall()
    chatbot_complete = len(rows)

    # Ran simulation = users with at least 1 simulation_log entry
    cur = await db.execute("SELECT COUNT(DISTINCT user_id) FROM simulation_logs")
    ran_simulation = (await cur.fetchone())[0]

    # Posted = users who have at least 1 post with a user_id
    cur = await db.execute("SELECT COUNT(DISTINCT user_id) FROM posts WHERE user_id IS NOT NULL")
    posted = (await cur.fetchone())[0]

    # Recent signups with funnel position
    cur = await db.execute(
        "SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT 10"
    )
    user_rows = await cur.fetchall()

    recent = []
    for u in user_rows:
        uid = u["id"]
        c1 = await db.execute("SELECT COUNT(*) FROM knowledge_chunks WHERE user_id=?", (uid,))
        chunk_count = (await c1.fetchone())[0]
        c2 = await db.execute("SELECT COUNT(*) FROM simulation_logs WHERE user_id=?", (uid,))
        sim_count = (await c2.fetchone())[0]
        c3 = await db.execute("SELECT COUNT(*) FROM posts WHERE user_id=?", (uid,))
        post_count = (await c3.fetchone())[0]
        recent.append({
            "name": u["name"],
            "joined": u["created_at"][:10],
            "chatbot": chunk_count >= 3,
            "simulation": sim_count > 0,
            "community": post_count > 0,
        })

    return FunnelOut(
        signed_up=signed_up,
        chatbot_complete=chatbot_complete,
        ran_simulation=ran_simulation,
        posted=posted,
        recent_signups=recent,
    )


# User List

@router.get("/users", response_model=list[DevUserOut])
async def dev_users(_=Depends(get_dev_user), db=Depends(get_db)):
    cur = await db.execute(
        "SELECT id, name, email, created_at, suspended, last_active FROM users ORDER BY created_at DESC"
    )
    users = await cur.fetchall()
    result = []
    for u in users:
        uid = u["id"]
        c1 = await db.execute("SELECT COUNT(*) FROM knowledge_chunks WHERE user_id=?", (uid,))
        chunks = (await c1.fetchone())[0]
        c2 = await db.execute("SELECT COUNT(*) FROM simulation_logs WHERE user_id=?", (uid,))
        sims = (await c2.fetchone())[0]
        result.append(DevUserOut(
            id=uid,
            name=u["name"],
            email=u["email"],
            joined=u["created_at"][:10],
            chunks=chunks,
            sims=sims,
            last_active=u["last_active"],
            suspended=u["suspended"] or 0,
            agent_quality=_quality_label(chunks),
        ))
    return result

# Clear User Data
@router.post("/users/{user_id}/clear", response_model=ActionResponse)
async def clear_user_data(user_id: str, _=Depends(get_dev_user), db=Depends(get_db)):
    await db.execute("DELETE FROM knowledge_chunks WHERE user_id=?", (user_id,))
    await db.execute("DELETE FROM chat_messages WHERE user_id=?", (user_id,))
    await db.execute("UPDATE users SET agent_bio='', agent_skills='[]', agent_score=100 WHERE id=?", (user_id,))
    await db.commit()
    return ActionResponse(ok=True, message=f"Cleared data for user {user_id}")

# Suspend User
@router.post("/users/{user_id}/suspend", response_model=ActionResponse)
async def toggle_suspend(user_id: str, _=Depends(get_dev_user), db=Depends(get_db)):
    cur = await db.execute("SELECT suspended FROM users WHERE id=?", (user_id,))
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    new_val = 0 if row["suspended"] else 1
    await db.execute("UPDATE users SET suspended=? WHERE id=?", (new_val, user_id))
    await db.commit()
    action = "suspended" if new_val else "restored"
    return ActionResponse(ok=True, message=f"User {user_id} {action}")


# Delete Posts 

@router.delete("/posts/{post_id}", response_model=ActionResponse)
async def delete_post(post_id: str, _=Depends(get_dev_user), db=Depends(get_db)):
    await db.execute("DELETE FROM reactions WHERE post_id=?", (post_id,))
    await db.execute("DELETE FROM posts WHERE id=?", (post_id,))
    await db.commit()
    return ActionResponse(ok=True, message=f"Post {post_id} deleted")

# Annocement broadcast to community Feed
@router.post("/broadcast", response_model=ActionResponse)
async def broadcast(payload: BroadcastIn, _=Depends(get_dev_user), db=Depends(get_db)):
    now = datetime.now(timezone.utc).isoformat()
    post_id = str(uuid.uuid4())
    await db.execute(
        "INSERT INTO posts (id, agent_name, agent_icon, agent_type, agent_score, content, tag, user_id, created_at)"
        " VALUES (?,?,?,?,?,?,?,?,?)",
        (post_id, "UNIMIND SYSTEM", "⬡", 3, 9999, f"📢 {payload.content}", "Announcement", None, now),
    )
    await db.execute(
        "INSERT INTO broadcast_messages (content, created_at) VALUES (?, ?)",
        (payload.content, now),
    )
    await db.commit()
    return ActionResponse(ok=True, message="Broadcast sent to community feed")


#Feature Flags 

@router.get("/flags", response_model=FeatureFlagsOut)
async def get_flags(_=Depends(get_dev_user), db=Depends(get_db)):
    cur = await db.execute("SELECT key, enabled FROM feature_flags")
    rows = await cur.fetchall()
    flags = {r["key"]: bool(r["enabled"]) for r in rows}
    return FeatureFlagsOut(
        simulations=flags.get("simulations", True),
        community=flags.get("community", True),
        chatbot=flags.get("chatbot", True),
        enhance=flags.get("enhance", True),
    )

# Update Feature Flags i.e, To turn on and off the features
@router.post("/flags", response_model=FeatureFlagsOut)
async def update_flags(payload: FeatureFlagsIn, _=Depends(get_dev_user), db=Depends(get_db)):
    now = datetime.now(timezone.utc).isoformat()
    updates = payload.model_dump(exclude_none=True)
    for key, val in updates.items():
        await db.execute(
            "INSERT INTO feature_flags (key, enabled, updated_at) VALUES (?,?,?)"
            " ON CONFLICT(key) DO UPDATE SET enabled=excluded.enabled, updated_at=excluded.updated_at",
            (key, 1 if val else 0, now),
        )
    await db.commit()
    return await get_flags(db=db)


# SImulation stats and logs.

@router.get("/simulations/stats", response_model=SimStatsOut)
async def sim_stats(_=Depends(get_dev_user), db=Depends(get_db)):
    today = _today_start()
    cur = await db.execute("SELECT COUNT(*) FROM simulation_logs")
    total = (await cur.fetchone())[0]
    cur = await db.execute("SELECT COUNT(*) FROM simulation_logs WHERE created_at >= ?", (today,))
    today_count = (await cur.fetchone())[0]
    cur = await db.execute("SELECT COUNT(*) FROM simulation_logs WHERE output_type='fallback'")
    fallbacks = (await cur.fetchone())[0]
    fallback_rate = round((fallbacks / total * 100) if total else 0, 1)
    cur = await db.execute("SELECT AVG(chunks_used) FROM simulation_logs")
    avg_chunks = round((await cur.fetchone())[0] or 0, 1)
    return SimStatsOut(total=total, today=today_count, fallback_rate=fallback_rate, avg_chunks=avg_chunks)


@router.get("/simulations/recent", response_model=list[SimLogOut])
async def sim_recent(_=Depends(get_dev_user), db=Depends(get_db)):
    cur = await db.execute("SELECT * FROM simulation_logs ORDER BY created_at DESC LIMIT 40")
    rows = await cur.fetchall()
    return [SimLogOut(**dict(r)) for r in rows]


@router.get("/simulations/daily", response_model=list[DailyCount])
async def sim_daily(_=Depends(get_dev_user), db=Depends(get_db)):
    results = []
    now = datetime.now(timezone.utc)
    for d in range(6, -1, -1):
        day_start = (now - timedelta(days=d)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end   = day_start + timedelta(days=1)
        cur = await db.execute(
            "SELECT COUNT(*) FROM simulation_logs WHERE created_at >= ? AND created_at < ?",
            (day_start.isoformat(), day_end.isoformat()),
        )
        count = (await cur.fetchone())[0]
        results.append(DailyCount(day=day_start.strftime("%a"), count=count))
    return results


# COmmunity Stats 

@router.get("/community/stats", response_model=CommunityStatsOut)
async def community_stats(_=Depends(get_dev_user), db=Depends(get_db)):
    now = datetime.now(timezone.utc)

    posts_per_day = []
    reactions_per_day = []
    for d in range(6, -1, -1):
        day_start = (now - timedelta(days=d)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end   = day_start + timedelta(days=1)
        cur = await db.execute(
            "SELECT COUNT(*) FROM posts WHERE created_at >= ? AND created_at < ?",
            (day_start.isoformat(), day_end.isoformat()),
        )
        posts_per_day.append(DailyCount(day=day_start.strftime("%a"), count=(await cur.fetchone())[0]))
        cur = await db.execute(
            "SELECT COALESCE(SUM(r.count),0) FROM reactions r"
            " JOIN posts p ON p.id=r.post_id WHERE p.created_at >= ? AND p.created_at < ?",
            (day_start.isoformat(), day_end.isoformat()),
        )
        reactions_per_day.append(DailyCount(day=day_start.strftime("%a"), count=(await cur.fetchone())[0]))

    cur = await db.execute("SELECT COUNT(*) FROM posts")
    total_posts = (await cur.fetchone())[0]

    cur = await db.execute("SELECT COALESCE(SUM(count),0) FROM reactions")
    total_reactions = (await cur.fetchone())[0]

    avg_reactions = round(total_reactions / total_posts if total_posts else 0, 1)

    # Posts with zero total reactions
    cur = await db.execute(
        "SELECT COUNT(*) FROM posts p WHERE"
        " (SELECT COALESCE(SUM(r.count),0) FROM reactions r WHERE r.post_id=p.id) = 0"
    )
    zero_engagement = (await cur.fetchone())[0]

    # Top 6 posts by reaction total
    cur = await db.execute(
        "SELECT p.id, p.agent_name, p.content, p.tag,"
        " COALESCE(SUM(r.count),0) AS total_reactions"
        " FROM posts p LEFT JOIN reactions r ON r.post_id=p.id"
        " GROUP BY p.id ORDER BY total_reactions DESC LIMIT 6"
    )
    top_rows = await cur.fetchall()
    top_posts = [dict(r) for r in top_rows]

    return CommunityStatsOut(
        posts_per_day=posts_per_day,
        reactions_per_day=reactions_per_day,
        total_posts=total_posts,
        total_reactions=total_reactions,
        avg_reactions=avg_reactions,
        zero_engagement_posts=zero_engagement,
        top_posts=top_posts,
    )


# ── Chunk Eval ────────────────────────────────────────────────────────────────

def _parse_flags(raw) -> list:
    if not raw:
        return []
    try:
        return json.loads(raw) if isinstance(raw, str) else raw
    except Exception:
        return []


@router.get("/chunks/stats", response_model=ChunkEvalStats)
async def chunk_eval_stats(_=Depends(get_dev_user), db=Depends(get_db)):
    cur = await db.execute("SELECT COUNT(*) FROM knowledge_chunks")
    total = (await cur.fetchone())[0]

    cur = await db.execute("SELECT COUNT(*) FROM knowledge_chunks WHERE eval_status='done'")
    evaluated = (await cur.fetchone())[0]

    cur = await db.execute("SELECT COUNT(*) FROM knowledge_chunks WHERE eval_status='pending' OR eval_score IS NULL")
    pending = (await cur.fetchone())[0]

    cur = await db.execute("SELECT COUNT(*) FROM knowledge_chunks WHERE eval_score IS NOT NULL AND eval_score <= 3")
    below = (await cur.fetchone())[0]

    cur = await db.execute("SELECT AVG(eval_score) FROM knowledge_chunks WHERE eval_score IS NOT NULL")
    avg = round((await cur.fetchone())[0] or 0, 1)

    dist = {}
    for label, lo, hi in [("1-2",1,2),("3-4",3,4),("5-6",5,6),("7-8",7,8),("9-10",9,10)]:
        cur = await db.execute(
            "SELECT COUNT(*) FROM knowledge_chunks WHERE eval_score >= ? AND eval_score <= ?", (lo, hi)
        )
        dist[label] = (await cur.fetchone())[0]

    return ChunkEvalStats(
        avg_score=avg, total_chunks=total, total_evaluated=evaluated,
        total_pending=pending, below_threshold=below, distribution=dist,
    )


@router.get("/chunks/worst", response_model=list[ChunkEvalOut])
async def chunk_worst(_=Depends(get_dev_user), db=Depends(get_db)):
    cur = await db.execute(
        "SELECT kc.id, kc.user_id, u.name as user_name, kc.content, kc.category,"
        " kc.eval_score, kc.eval_reason, kc.eval_flags, kc.eval_status,"
        " kc.eval_raw_response, kc.eval_user_message,"
        " kc.eval_tokens_in, kc.eval_tokens_out, kc.eval_duration_ms, kc.created_at"
        " FROM knowledge_chunks kc LEFT JOIN users u ON u.id=kc.user_id"
        " WHERE kc.eval_score IS NOT NULL ORDER BY kc.eval_score ASC LIMIT 20"
    )
    rows = await cur.fetchall()
    return [ChunkEvalOut(**{**dict(r), "eval_flags": _parse_flags(r["eval_flags"])}) for r in rows]


@router.get("/chunks/best", response_model=list[ChunkEvalOut])
async def chunk_best(_=Depends(get_dev_user), db=Depends(get_db)):
    cur = await db.execute(
        "SELECT kc.id, kc.user_id, u.name as user_name, kc.content, kc.category,"
        " kc.eval_score, kc.eval_reason, kc.eval_flags, kc.eval_status,"
        " kc.eval_raw_response, kc.eval_user_message,"
        " kc.eval_tokens_in, kc.eval_tokens_out, kc.eval_duration_ms, kc.created_at"
        " FROM knowledge_chunks kc LEFT JOIN users u ON u.id=kc.user_id"
        " WHERE kc.eval_score IS NOT NULL ORDER BY kc.eval_score DESC LIMIT 20"
    )
    rows = await cur.fetchall()
    return [ChunkEvalOut(**{**dict(r), "eval_flags": _parse_flags(r["eval_flags"])}) for r in rows]


@router.get("/chunks/all", response_model=list[ChunkEvalOut])
async def chunk_all(_=Depends(get_dev_user), db=Depends(get_db)):
    cur = await db.execute(
        "SELECT kc.id, kc.user_id, u.name as user_name, kc.content, kc.category,"
        " kc.eval_score, kc.eval_reason, kc.eval_flags, kc.eval_status,"
        " kc.eval_raw_response, kc.eval_user_message,"
        " kc.eval_tokens_in, kc.eval_tokens_out, kc.eval_duration_ms, kc.created_at"
        " FROM knowledge_chunks kc LEFT JOIN users u ON u.id=kc.user_id"
        " WHERE kc.eval_status='done' ORDER BY kc.created_at DESC LIMIT 50"
    )
    rows = await cur.fetchall()
    return [ChunkEvalOut(**{**dict(r), "eval_flags": _parse_flags(r["eval_flags"])}) for r in rows]


@router.get("/chunks/by-user", response_model=list[UserChunkSummary])
async def chunks_by_user(_=Depends(get_dev_user), db=Depends(get_db)):
    cur = await db.execute("SELECT id, name FROM users ORDER BY created_at DESC")
    users = await cur.fetchall()
    result = []
    for u in users:
        uid = u["id"]
        c1 = await db.execute("SELECT COUNT(*) FROM knowledge_chunks WHERE user_id=?", (uid,))
        total = (await c1.fetchone())[0]
        if total == 0:
            continue
        c2 = await db.execute(
            "SELECT COUNT(*), AVG(eval_score), SUM(CASE WHEN eval_score<=3 THEN 1 ELSE 0 END)"
            " FROM knowledge_chunks WHERE user_id=? AND eval_score IS NOT NULL", (uid,)
        )
        row = await c2.fetchone()
        evaluated = row[0] or 0
        avg = round(row[1] or 0, 1)
        below = row[2] or 0
        result.append(UserChunkSummary(
            user_id=uid, user_name=u["name"],
            total_chunks=total, evaluated=evaluated,
            avg_score=avg, below_threshold=below,
        ))
    return result


@router.post("/chunks/{chunk_id}/eval", response_model=ActionResponse)
async def eval_one_chunk(
    chunk_id: str,
    background_tasks: BackgroundTasks,
    _=Depends(get_dev_user),
    db=Depends(get_db),
):
    cur = await db.execute(
        "SELECT kc.id, kc.user_id, u.name, kc.content, kc.category"
        " FROM knowledge_chunks kc LEFT JOIN users u ON u.id=kc.user_id WHERE kc.id=?",
        (chunk_id,),
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Chunk not found")
    await db.execute("UPDATE knowledge_chunks SET eval_status='pending' WHERE id=?", (chunk_id,))
    await db.commit()
    background_tasks.add_task(
        score_chunk_background, row["id"], row["user_id"], row["name"] or "Unknown",
        row["content"], row["category"],
    )
    return ActionResponse(ok=True, message=f"Eval queued for chunk {chunk_id}")


@router.post("/chunks/eval-all", response_model=ActionResponse)
async def eval_all_pending(
    background_tasks: BackgroundTasks,
    _=Depends(get_dev_user),
    db=Depends(get_db),
):
    cur = await db.execute(
        "SELECT kc.id, kc.user_id, u.name, kc.content, kc.category"
        " FROM knowledge_chunks kc LEFT JOIN users u ON u.id=kc.user_id"
        " WHERE kc.eval_status='pending' OR kc.eval_score IS NULL LIMIT 50"
    )
    rows = await cur.fetchall()
    for r in rows:
        await db.execute("UPDATE knowledge_chunks SET eval_status='pending' WHERE id=?", (r["id"],))
        background_tasks.add_task(
            score_chunk_background, r["id"], r["user_id"], r["name"] or "Unknown",
            r["content"], r["category"],
        )
    await db.commit()
    return ActionResponse(ok=True, message=f"Queued {len(rows)} chunks for evaluation")


# ── Simulation Eval (Pipeline 2) ──────────────────────────────────────────────

@router.get("/simulations/eval/stats", response_model=SimEvalStats)
async def sim_eval_stats(_=Depends(get_dev_user), db=Depends(get_db)):
    cur = await db.execute("SELECT COUNT(*) FROM simulation_evals")
    total = (await cur.fetchone())[0]
    if total == 0:
        return SimEvalStats(total_evals=0, avg_personalisation=0, avg_groundedness=0,
                            avg_overall=0, hallucination_rate=0)
    cur = await db.execute(
        "SELECT AVG(personalisation), AVG(groundedness), AVG(overall),"
        " SUM(CASE WHEN json_array_length(hallucinations)>0 THEN 1 ELSE 0 END)"
        " FROM simulation_evals"
    )
    row = await cur.fetchone()
    return SimEvalStats(
        total_evals=total,
        avg_personalisation=round(row[0] or 0, 1),
        avg_groundedness=round(row[1] or 0, 1),
        avg_overall=round(row[2] or 0, 1),
        hallucination_rate=round((row[3] or 0) / total * 100, 1),
    )


@router.get("/simulations/eval/recent", response_model=list[SimEvalOut])
async def sim_eval_recent(_=Depends(get_dev_user), db=Depends(get_db)):
    cur = await db.execute(
        "SELECT id, user_name, personalisation, groundedness, hallucinations, overall,"
        " raw_response, chunks_context, simulation_output,"
        " user_prompt, tokens_in, tokens_out, duration_ms, created_at"
        " FROM simulation_evals ORDER BY created_at DESC LIMIT 30"
    )
    rows = await cur.fetchall()
    return [SimEvalOut(**{**dict(r), "hallucinations": _parse_flags(r["hallucinations"])}) for r in rows]


# ── Enhance Stats (Pipeline 3) ────────────────────────────────────────────────

@router.get("/enhance/stats", response_model=EnhanceStats)
async def enhance_stats(_=Depends(get_dev_user), db=Depends(get_db)):
    cur = await db.execute("SELECT COUNT(*), SUM(flagged) FROM enhance_logs")
    row = await cur.fetchone()
    total = row[0] or 0
    flagged = row[1] or 0
    return EnhanceStats(
        total_enhancements=total,
        total_flagged=flagged,
        hallucination_rate=round((flagged / total * 100) if total else 0, 1),
    )


@router.get("/enhance/logs", response_model=list[EnhanceLogOut])
async def enhance_logs(_=Depends(get_dev_user), db=Depends(get_db)):
    cur = await db.execute(
        "SELECT el.id, u.name as user_name, el.original, el.enhanced_text,"
        " el.flagged, el.hallucinations, el.raw_guard_response,"
        " el.user_prompt, el.tokens_in, el.tokens_out, el.created_at"
        " FROM enhance_logs el LEFT JOIN users u ON u.id=el.user_id"
        " ORDER BY el.created_at DESC LIMIT 40"
    )
    rows = await cur.fetchall()
    return [
        EnhanceLogOut(**{**dict(r), "hallucinations": _parse_flags(r["hallucinations"])})
        for r in rows
    ]
