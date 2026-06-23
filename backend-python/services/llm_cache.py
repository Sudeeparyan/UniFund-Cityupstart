"""Exact-match response cache — turns repeated expensive calls into €0.

Keyed by a hash of (feature + user + all inputs that affect the output). This
is deliberately exact-match (not semantic) so it can never serve a stale
result: if the user's chunks/profile change, the key changes and we recompute.

Used for the two priciest big-model actions (simulation, council synthesis).
"""

import json
import hashlib
from datetime import datetime, timezone

CACHE_TTL_SECONDS = 60 * 60 * 24 * 7  # 7 days


def make_key(feature: str, user_id: str, *parts) -> str:
    payload = json.dumps([feature, user_id, *parts], sort_keys=True, default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


async def cache_get(db, cache_key: str):
    cursor = await db.execute(
        "SELECT response_json FROM response_cache WHERE cache_key=?", (cache_key,)
    )
    row = await cursor.fetchone()
    if not row:
        return None
    try:
        return json.loads(row["response_json"])
    except Exception:
        return None


async def cache_put(db, cache_key: str, feature: str, user_id: str, value: dict):
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "INSERT OR REPLACE INTO response_cache (cache_key, feature, user_id, response_json, created_at)"
        " VALUES (?,?,?,?,?)",
        (cache_key, feature, user_id, json.dumps(value), now),
    )
    # commit is left to the caller's request transaction


async def cache_invalidate_user(db, user_id: str):
    """Call when a user's knowledge changes so cached outputs are recomputed."""
    await db.execute("DELETE FROM response_cache WHERE user_id=?", (user_id,))
