import json
import uuid
import aiosqlite
from datetime import datetime, timezone

from db import DB_PATH
from services.azure_openai import chat_complete

EVAL_SYSTEM = """You are a quality evaluator for an AI agent knowledge base.

A knowledge chunk is a piece of personal information extracted from a user's interview.
It will be used to predict their future life paths — so quality matters.

Rate the chunk on a scale of 1 to 10:

1–3  Vague / useless
     Examples: "I want to grow", "I like tech", "I'm a student", "I enjoy learning"
     These could apply to anyone. They add no signal.

4–6  Somewhat specific but incomplete
     Examples: "I studied computer science", "I worked at a startup"
     Real but lacks concrete detail (when? what happened? what was the outcome?)

7–10 Concrete, specific, genuine
     Examples: "I dropped out of my CS degree in 2023 to build a food delivery app
     that failed after 4 months due to poor unit economics"
     These are rich, personal, and actually useful for prediction.

Return ONLY valid JSON — no markdown, no explanation, nothing else:
{"score": integer, "reason": "one sentence max", "flags": ["flag1", "flag2"]}

Flags — pick all that apply:
- "too_vague"          (could apply to anyone)
- "too_short"          (under 8 words)
- "generic_statement"  (sounds like a template)
- "no_context"         (missing when/where/outcome)
- "good_specificity"   (has real concrete detail)
- "real_experience"    (sounds lived-in and personal)
- "actionable_detail"  (has dates, outcomes, numbers, names)
"""


async def score_chunk(content: str, category: str) -> dict:
    user_message = f'Category: {category}\nChunk: "{content}"'
    try:
        result = await chat_complete(
            [
                {"role": "system", "content": EVAL_SYSTEM},
                {"role": "user", "content": user_message},
            ],
            temperature=0.1,
            max_tokens=120,
            return_usage=True,
            mini=True,
        )
        raw = result["content"].strip()
        text = raw
        if "```" in text:
            for part in text.split("```"):
                part = part.strip().lstrip("json").strip()
                if part.startswith("{"):
                    text = part
                    break
        data = json.loads(text)
        return {
            "score":        max(1, min(10, int(data.get("score", 5)))),
            "reason":       str(data.get("reason", ""))[:300],
            "flags":        data.get("flags", []),
            "raw_response": raw,
            "user_message": user_message,
            "tokens_in":    result["tokens_in"],
            "tokens_out":   result["tokens_out"],
            "duration_ms":  result["duration_ms"],
        }
    except Exception:
        return {"score": 5, "reason": "Eval unavailable", "flags": [],
                "raw_response": "", "user_message": user_message,
                "tokens_in": 0, "tokens_out": 0, "duration_ms": 0}


# ── Pipeline 2 — Simulation Personalisation ───────────────────────────────────

SIM_EVAL_SYSTEM = """You are evaluating the quality of an AI life simulation.
The simulation should be deeply personalised to the user's actual data.

Score on TWO dimensions (1–10 each):

PERSONALISATION — does the output use this specific user's data?
  10: every milestone references the user's actual experiences/goals/fears
   1: could be for anyone — no connection to user context

GROUNDEDNESS — are all claims supported by the user's known chunks?
  10: every specific claim is traceable to user context
   1: contains invented facts not present in user's data

Also list any HALLUCINATIONS: specific claims about the user
that are NOT supported by their knowledge chunks.

Return ONLY valid JSON:
{"personalisation": int, "groundedness": int, "hallucinations": ["claim1", "claim2"]}

If no hallucinations, return: {"personalisation": int, "groundedness": int, "hallucinations": []}
"""


async def score_simulation(chunks: list[dict], simulation_json: str) -> dict:
    chunk_text   = "\n".join(f"- [{c.get('category','general')}] {c.get('content','')}" for c in chunks) or "No chunks available."
    user_prompt  = f"User's knowledge chunks:\n{chunk_text}\n\nSimulation output:\n{simulation_json}"
    try:
        result = await chat_complete(
            [
                {"role": "system", "content": SIM_EVAL_SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_tokens=200,
            return_usage=True,
            mini=True,
        )
        raw  = result["content"].strip()
        text = raw
        if "```" in text:
            for part in text.split("```"):
                part = part.strip().lstrip("json").strip()
                if part.startswith("{"):
                    text = part
                    break
        data = json.loads(text)
        p = max(1, min(10, int(data.get("personalisation", 5))))
        g = max(1, min(10, int(data.get("groundedness", 5))))
        return {
            "personalisation": p,
            "groundedness":    g,
            "hallucinations":  data.get("hallucinations", []),
            "overall":         round((p + g) / 2),
            "raw_response":    raw,
            "user_prompt":     user_prompt,
            "tokens_in":       result["tokens_in"],
            "tokens_out":      result["tokens_out"],
            "duration_ms":     result["duration_ms"],
        }
    except Exception:
        return {"personalisation": 5, "groundedness": 5, "hallucinations": [],
                "overall": 5, "raw_response": "", "user_prompt": "",
                "tokens_in": 0, "tokens_out": 0, "duration_ms": 0}


async def score_simulation_background(
    sim_log_id: str, user_id: str, user_name: str,
    chunks: list[dict], simulation_json: str,
):
    result = await score_simulation(chunks, simulation_json)
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO simulation_evals"
            " (id,simulation_log_id,user_id,user_name,personalisation,groundedness,"
            "  hallucinations,overall,raw_response,chunks_context,simulation_output,"
            "  user_prompt,tokens_in,tokens_out,duration_ms,created_at)"
            " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (str(uuid.uuid4()), sim_log_id, user_id, user_name,
             result["personalisation"], result["groundedness"],
             json.dumps(result["hallucinations"]), result["overall"],
             result["raw_response"], json.dumps(chunks), simulation_json,
             result["user_prompt"], result["tokens_in"], result["tokens_out"],
             result["duration_ms"], now),
        )
        if result["tokens_in"] > 0:
            await db.execute(
                "INSERT INTO llm_logs"
                " (id,user_id,user_name,call_type,tokens_in,tokens_out,duration_ms,status,created_at)"
                " VALUES (?,?,?,?,?,?,?,?,?)",
                (str(uuid.uuid4()), user_id, user_name, "sim_eval",
                 result["tokens_in"], result["tokens_out"], result["duration_ms"], "llm", now),
            )
        await db.commit()


# Pipeline 3 — Enhancement Hallucination Guard 

ENHANCE_GUARD_SYSTEM = """You are checking if an AI-expanded message contains invented facts.

The user wrote a brief message. An AI expanded it into a longer version.
Your job: find any specific facts in the expanded version that are NOT in the original message
and NOT in the user's known context.

Focus on invented: dates, numbers, company names, outcomes, durations, specific events.
Ignore: tone changes, rephrasing, general elaboration.

Return ONLY valid JSON:
{"flagged": true/false, "hallucinations": ["specific invented fact 1", "invented fact 2"]}

If nothing was invented, return: {"flagged": false, "hallucinations": []}
"""


async def check_enhancement_hallucinations(
    original: str, enhanced: str, chunks: list[dict]
) -> dict:
    chunk_text = "\n".join(f"- {c.get('content','')}" for c in chunks[:8]) or "None."
    user_prompt = (
        f"Original (user wrote):\n\"{original}\"\n\n"
        f"Expanded (AI generated):\n\"{enhanced}\"\n\n"
        f"Known context about this user:\n{chunk_text}"
    )
    try:
        result = await chat_complete(
            [
                {"role": "system", "content": ENHANCE_GUARD_SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_tokens=150,
            return_usage=True,
            mini=True,
        )
        raw  = result["content"].strip()
        text = raw
        if "```" in text:
            for part in text.split("```"):
                part = part.strip().lstrip("json").strip()
                if part.startswith("{"):
                    text = part
                    break
        data = json.loads(text)
        return {
            "flagged":        bool(data.get("flagged", False)),
            "hallucinations": data.get("hallucinations", []),
            "raw_response":   raw,
            "user_prompt":    user_prompt,
            "tokens_in":      result["tokens_in"],
            "tokens_out":     result["tokens_out"],
        }
    except Exception:
        return {"flagged": False, "hallucinations": [], "raw_response": "",
                "user_prompt": user_prompt, "tokens_in": 0, "tokens_out": 0}


async def score_chunk_background(
    chunk_id: str, user_id: str, user_name: str, content: str, category: str
):
    result = await score_chunk(content, category)
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE knowledge_chunks SET eval_score=?, eval_reason=?, eval_flags=?,"
            " eval_status='done', eval_raw_response=?, eval_user_message=?,"
            " eval_tokens_in=?, eval_tokens_out=?, eval_duration_ms=?"
            " WHERE id=?",
            (result["score"], result["reason"], json.dumps(result["flags"]),
             result["raw_response"], result["user_message"],
             result["tokens_in"], result["tokens_out"], result["duration_ms"],
             chunk_id),
        )
        if result["tokens_in"] > 0:
            await db.execute(
                "INSERT INTO llm_logs"
                " (id,user_id,user_name,call_type,tokens_in,tokens_out,duration_ms,status,created_at)"
                " VALUES (?,?,?,?,?,?,?,?,?)",
                (str(uuid.uuid4()), user_id, user_name, "chunk_eval",
                 result["tokens_in"], result["tokens_out"], result["duration_ms"], "llm", now),
            )
        await db.commit()
