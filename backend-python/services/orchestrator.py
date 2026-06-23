"""The orchestrator — UniMind's real multi-agent brain.

This is the function that powers the "agents communicate with each other"
experience for real, cheaply:

  route_experts(query, k)   pick the few relevant experts        (free, embeddings)
  run_council(...)          run them on MINI in parallel,        (k mini + 1 big)
                            fuse with ONE big-model synthesis
  route_peers(...)          top-k similar real users             (free, embeddings)
  graph_rag_context(...)    retrieve peer outcomes for grounding (free)
  rebuild_agent_card(...)   background: summary + card embedding  (1 mini, on change)
  embed_and_store_chunk()   background: free chunk embedding

Cost discipline: retrieval is €0; routine drafts run on MINI; the expensive BIG
model fires once per user-facing answer (and is cached upstream).
"""

import json
import uuid
import asyncio
from datetime import datetime, timezone

import aiosqlite

from db import DB_PATH
from services import embeddings as emb
from services.azure_openai import chat_complete
from services.expert_agents import (
    EXPERT_AGENTS, AGENTS_BY_ID, ORCHESTRATOR, SPECIAL_AGENTS,
)

# Cached expert domain vectors (computed once, reused for every route).
_expert_vecs: dict[str, "object"] = {}
_expert_vecs_ready = False
_vec_lock = asyncio.Lock()


async def _ensure_expert_vecs():
    global _expert_vecs_ready
    if _expert_vecs_ready:
        return
    async with _vec_lock:
        if _expert_vecs_ready:
            return
        texts = [f"{a['title']}. {a['domain']}" for a in EXPERT_AGENTS]
        vecs = await emb.embed_batch(texts)
        for a, v in zip(EXPERT_AGENTS, vecs):
            _expert_vecs[a["id"]] = v
        _expert_vecs_ready = True


def _keyword_boost(query: str, agent: dict) -> float:
    q = (query or "").lower()
    hits = sum(1 for kw in agent.get("keywords", []) if kw in q)
    return min(0.15, 0.05 * hits)


async def route_experts(query: str, k: int = 3) -> list[dict]:
    """Return the top-k most relevant experts for a query, each with a score."""
    await _ensure_expert_vecs()
    qv = await emb.embed(query)
    scored = []
    for a in EXPERT_AGENTS:
        base = emb.cosine(qv, _expert_vecs[a["id"]])
        score = base + _keyword_boost(query, a)
        scored.append((a, score))
    scored.sort(key=lambda x: x[1], reverse=True)
    chosen = scored[: max(1, k)]
    return [{**a, "route_score": round(float(s), 3)} for a, s in chosen]


async def _run_expert(expert: dict, query: str, context: str) -> dict:
    user = query if not context else f"{query}\n\nWhat we know about this person:\n{context}"
    try:
        res = await chat_complete(
            [
                {"role": "system", "content": expert["system_prompt"]},
                {"role": "user", "content": user},
            ],
            temperature=0.6,
            max_tokens=180,
            return_usage=True,
            mini=True,
        )
        return {"expert": expert, "contribution": res["content"].strip(),
                "tokens_in": res["tokens_in"], "tokens_out": res["tokens_out"],
                "duration_ms": res["duration_ms"], "ok": True}
    except Exception:
        return {"expert": expert,
                "contribution": f"({expert['name']} is offline — skipped.)",
                "tokens_in": 0, "tokens_out": 0, "duration_ms": 0, "ok": False}


def _build_council_logs(query: str, results: list[dict], final: str) -> list[dict]:
    """Real agent_logs (matches the frontend SpaceArena shape) generated from
    the actually-routed experts and their actual contributions."""
    logs = [{
        "from_agent": ORCHESTRATOR["id"], "to_agent": "COUNCIL",
        "message": f"Routing your question to {len(results)} experts: "
                   + ", ".join(r["expert"]["name"] for r in results) + ".",
        "delay_ms": 0,
    }]
    t = 500
    for r in results:
        ex = r["expert"]
        logs.append({"from_agent": ORCHESTRATOR["id"], "to_agent": ex["id"],
                     "message": f"Consulting {ex['title']}.", "delay_ms": t})
        t += 600
        snippet = r["contribution"]
        snippet = (snippet[:160] + "…") if len(snippet) > 161 else snippet
        logs.append({"from_agent": ex["id"], "to_agent": ORCHESTRATOR["id"],
                     "message": snippet, "delay_ms": t})
        t += 700
    logs.append({"from_agent": ORCHESTRATOR["id"], "to_agent": "USER",
                 "message": "Synthesis complete — here's your plan.", "delay_ms": t})
    return logs


SYNTH_SYSTEM = (
    "You are ARIA, lead strategist of UniMind's expert council. Several "
    "specialist agents have each given their take on a person's question. Fuse "
    "them into ONE clear, decisive answer for the person. Lead with the single "
    "most important move, then 2-4 concrete next steps. Reference the "
    "specialists' angles where useful, but speak as one voice. Be specific and "
    "encouraging, never generic. Under 180 words."
)


async def run_council(
    db,
    query: str,
    user_id: str,
    user_name: str,
    context: str = "",
    k: int = 3,
    log_cost: bool = True,
) -> dict:
    """Route → fan-out (MINI, parallel) → synthesize (BIG). Returns answer +
    real per-expert contributions + agent_logs + cost usage."""
    experts = await route_experts(query, k=k)
    results = await asyncio.gather(*[_run_expert(e, query, context) for e in experts])

    panel = "\n\n".join(
        f"{r['expert']['name']} ({r['expert']['title']}): {r['contribution']}"
        for r in results
    )
    synth_user = (
        f"Person's question / situation:\n{query}\n\n"
        + (f"What we know about them:\n{context}\n\n" if context else "")
        + f"Specialist takes:\n{panel}\n\nNow give the fused answer."
    )
    try:
        synth = await chat_complete(
            [{"role": "system", "content": SYNTH_SYSTEM},
             {"role": "user", "content": synth_user}],
            temperature=0.7, max_tokens=420, return_usage=True,
        )
        answer = synth["content"].strip()
        synth_usage = synth
        output_type = "llm"
    except Exception:
        answer = ("Your council is briefly offline. Based on your question, focus "
                  "on the single highest-leverage next step and revisit shortly.")
        synth_usage = {"tokens_in": 0, "tokens_out": 0, "duration_ms": 0, "model": ""}
        output_type = "fallback"

    logs = _build_council_logs(query, results, answer)
    avg_score = sum(e["route_score"] for e in experts) / max(1, len(experts))
    confidence = max(40, min(96, int(60 + avg_score * 40)))

    total_in = sum(r["tokens_in"] for r in results) + synth_usage["tokens_in"]
    total_out = sum(r["tokens_out"] for r in results) + synth_usage["tokens_out"]

    if log_cost:
        now = datetime.now(timezone.utc).isoformat()
        for r in results:
            if r["tokens_in"]:
                await db.execute(
                    "INSERT INTO llm_logs (id,user_id,user_name,call_type,tokens_in,tokens_out,duration_ms,status,created_at)"
                    " VALUES (?,?,?,?,?,?,?,?,?)",
                    (str(uuid.uuid4()), user_id, user_name, "council_expert",
                     r["tokens_in"], r["tokens_out"], r["duration_ms"], "mini", now),
                )
        await db.execute(
            "INSERT INTO llm_logs (id,user_id,user_name,call_type,tokens_in,tokens_out,duration_ms,status,created_at)"
            " VALUES (?,?,?,?,?,?,?,?,?)",
            (str(uuid.uuid4()), user_id, user_name, "council_synth",
             synth_usage["tokens_in"], synth_usage["tokens_out"],
             synth_usage["duration_ms"], output_type, now),
        )

    return {
        "answer": answer,
        "confidence": confidence,
        "output_type": output_type,
        "experts": [
            {"id": r["expert"]["id"], "name": r["expert"]["name"],
             "emoji": r["expert"]["emoji"], "title": r["expert"]["title"],
             "contribution": r["contribution"],
             "route_score": r["expert"]["route_score"]}
            for r in results
        ],
        "agent_logs": logs,
        "usage": {"tokens_in": total_in, "tokens_out": total_out},
    }


# ── Debate mode (ADVOCATE vs SKEPTIC → judge) — higher-accuracy decisions ──────

_JUDGE_SYSTEM = (
    "You are ARIA, judging a debate between an optimist (ADVOCATE) and a "
    "red-team skeptic (SKEPTIC) about a person's plan. Weigh both, then give a "
    "balanced verdict: should they proceed, with what adjustment? End with a "
    "calibrated confidence and the single most important next step. Under 140 words."
)


async def run_debate(db, query: str, user_id: str, user_name: str,
                     context: str = "", log_cost: bool = True) -> dict:
    adv = SPECIAL_AGENTS["ADVOCATE"]
    skp = SPECIAL_AGENTS["SKEPTIC"]
    res = await asyncio.gather(
        _run_expert(adv, query, context),
        _run_expert(skp, query, context),
    )
    advocate, skeptic = res[0], res[1]
    judge_user = (
        f"Plan / question:\n{query}\n\n"
        f"ADVOCATE (for): {advocate['contribution']}\n\n"
        f"SKEPTIC (against): {skeptic['contribution']}\n\nDeliver your verdict."
    )
    try:
        j = await chat_complete(
            [{"role": "system", "content": _JUDGE_SYSTEM},
             {"role": "user", "content": judge_user}],
            temperature=0.6, max_tokens=320, return_usage=True,
        )
        verdict, output_type = j["content"].strip(), "llm"
    except Exception:
        j = {"tokens_in": 0, "tokens_out": 0, "duration_ms": 0}
        verdict, output_type = ("Both sides have merit — proceed on the smallest "
                                "reversible step and re-evaluate."), "fallback"

    logs = [
        {"from_agent": "ARIA", "to_agent": "ADVOCATE", "message": "Make the case FOR this plan.", "delay_ms": 0},
        {"from_agent": "ADVOCATE", "to_agent": "ARIA", "message": advocate["contribution"][:160], "delay_ms": 600},
        {"from_agent": "ARIA", "to_agent": "SKEPTIC", "message": "Now red-team it.", "delay_ms": 1300},
        {"from_agent": "SKEPTIC", "to_agent": "ARIA", "message": skeptic["contribution"][:160], "delay_ms": 1900},
        {"from_agent": "ARIA", "to_agent": "USER", "message": "Verdict ready.", "delay_ms": 2700},
    ]

    if log_cost:
        now = datetime.now(timezone.utc).isoformat()
        for r in (advocate, skeptic):
            if r["tokens_in"]:
                await db.execute(
                    "INSERT INTO llm_logs (id,user_id,user_name,call_type,tokens_in,tokens_out,duration_ms,status,created_at)"
                    " VALUES (?,?,?,?,?,?,?,?,?)",
                    (str(uuid.uuid4()), user_id, user_name, "debate_side",
                     r["tokens_in"], r["tokens_out"], r["duration_ms"], "mini", now))
        await db.execute(
            "INSERT INTO llm_logs (id,user_id,user_name,call_type,tokens_in,tokens_out,duration_ms,status,created_at)"
            " VALUES (?,?,?,?,?,?,?,?,?)",
            (str(uuid.uuid4()), user_id, user_name, "debate_judge",
             j["tokens_in"], j["tokens_out"], j["duration_ms"], output_type, now))

    return {
        "advocate": advocate["contribution"],
        "skeptic": skeptic["contribution"],
        "verdict": verdict,
        "output_type": output_type,
        "agent_logs": logs,
    }


# ── Peer retrieval / Graph-RAG (free) ─────────────────────────────────────────

async def route_peers(db, query: str, exclude_user_id: str = "", k: int = 5) -> list[dict]:
    """Top-k real user agents whose card-embedding is closest to the query."""
    backend = emb.backend_name()
    cursor = await db.execute(
        "SELECT user_id, summary, card_vector, model FROM agent_cards WHERE card_vector IS NOT NULL"
    )
    rows = await cursor.fetchall()
    # Only compare vectors produced by the current embedding backend — vectors
    # from a different backend live in an unrelated space.
    cands = [
        (r["user_id"], emb.from_blob(r["card_vector"]))
        for r in rows if r["user_id"] != exclude_user_id and r["model"] == backend
    ]
    if not cands:
        return []
    qv = await emb.embed(query)
    ranked = emb.top_k(qv, cands, k=k, threshold=emb.retrieval_threshold())
    summary_by_id = {r["user_id"]: r["summary"] for r in rows}
    return [{"user_id": uid, "score": round(s, 3), "summary": summary_by_id.get(uid, "")}
            for uid, s in ranked]


async def match_mentors(db, user_id: str, k: int = 3) -> list[dict]:
    """MENTOR-MATCH: find the real agents most similar to this user's goals/skills.
    Returns named matches with their match score and summary."""
    cur = await db.execute(
        "SELECT focus, goal, agent_bio, agent_skills FROM users WHERE id=?", (user_id,)
    )
    me = await cur.fetchone()
    if me:
        query = " ".join(filter(None, [
            me["focus"], me["goal"], me["agent_bio"], me["agent_skills"],
        ]))
    else:
        query = ""
    if not query.strip():
        # No profile yet — fall back to the user's recent chunks.
        cur = await db.execute(
            "SELECT content FROM knowledge_chunks WHERE user_id=? ORDER BY created_at DESC LIMIT 8",
            (user_id,))
        query = " ".join(r["content"] for r in await cur.fetchall())

    peers = await route_peers(db, query or "career and skills", user_id, k=k)
    if not peers:
        return []
    ids = [p["user_id"] for p in peers]
    placeholders = ",".join("?" * len(ids))
    cur = await db.execute(
        f"SELECT id, name, agent_score FROM users WHERE id IN ({placeholders})", ids)
    info = {r["id"]: r for r in await cur.fetchall()}
    out = []
    for p in peers:
        u = info.get(p["user_id"])
        if not u:
            continue
        out.append({
            "user_id": p["user_id"],
            "name": u["name"],
            "score": u["agent_score"],
            "match": round(p["score"] * 100),
            "summary": p["summary"],
        })
    return out


async def graph_rag_context(db, query: str, user_id: str, k: int = 8) -> dict:
    """Retrieve real peer 'outcome' chunks most relevant to the query, for
    grounded synthesis. Returns {context_text, peer_count, chunk_count}."""
    backend = emb.backend_name()
    cursor = await db.execute(
        "SELECT e.chunk_id, e.vector, e.model, k.content, k.category, k.user_id "
        "FROM chunk_embeddings e JOIN knowledge_chunks k ON k.id = e.chunk_id "
        "WHERE k.user_id != ? AND e.model = ?",
        (user_id, backend),
    )
    rows = await cursor.fetchall()
    if not rows:
        return {"context_text": "", "peer_count": 0, "chunk_count": 0}
    qv = await emb.embed(query)
    cands = [(i, emb.from_blob(r["vector"])) for i, r in enumerate(rows)]
    ranked = emb.top_k(qv, cands, k=k, threshold=emb.retrieval_threshold())
    picked = [rows[i] for i, _ in ranked]
    peers = {r["user_id"] for r in picked}
    lines = [f"- [{r['category'] or 'general'}] {r['content']}" for r in picked]
    return {
        "context_text": "\n".join(lines),
        "peer_count": len(peers),
        "chunk_count": len(picked),
    }


# ── Background builders (open their own connection) ────────────────────────────

async def embed_and_store_chunk(chunk_id: str, content: str):
    vec = await emb.embed(content)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO chunk_embeddings (chunk_id, vector, model, created_at)"
            " VALUES (?,?,?,?)",
            (chunk_id, emb.to_blob(vec), emb.backend_name(),
             datetime.now(timezone.utc).isoformat()),
        )
        await db.commit()


_CARD_SYSTEM = (
    "Summarise this person into a dense 'agent card' for an AI network: who they "
    "are, top skills, goals, and any concrete outcomes/experiences. 2-3 "
    "sentences, third person, factual, no fluff. Output only the summary."
)


async def rebuild_agent_card(user_id: str):
    """Recompute a user's agent summary (MINI) + card embedding (free) when their
    knowledge changes. Cheap; runs as a background task."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT name, agent_bio FROM users WHERE id=?", (user_id,))
        u = await cur.fetchone()
        if not u:
            return
        cur = await db.execute(
            "SELECT content, category FROM knowledge_chunks WHERE user_id=? ORDER BY created_at DESC LIMIT 30",
            (user_id,),
        )
        chunks = await cur.fetchall()
        if not chunks:
            return
        chunk_text = "\n".join(f"- [{c['category'] or 'general'}] {c['content']}" for c in chunks)
        try:
            summary = await chat_complete(
                [{"role": "system", "content": _CARD_SYSTEM},
                 {"role": "user", "content": f"Name: {u['name']}\n{chunk_text}"}],
                temperature=0.3, max_tokens=160, mini=True,
            )
            summary = summary.strip()
        except Exception:
            summary = (u["agent_bio"] or f"{u['name']} — agent in the UniMind network.")[:400]

        skills = [c["content"] for c in chunks if c["category"] == "skill"][:10]
        card_vec = await emb.embed(f"{summary}\nSkills: {', '.join(skills)}")
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "INSERT OR REPLACE INTO agent_cards (user_id, summary, skills_json, card_vector, model, updated_at)"
            " VALUES (?,?,?,?,?,?)",
            (user_id, summary, json.dumps(skills), emb.to_blob(card_vec),
             emb.backend_name(), now),
        )
        await db.commit()
