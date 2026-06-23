from fastapi import APIRouter, Query

from services.agent_seed import AGENTS
from services.personas import featured_leaderboard, is_persona_placeholder

router = APIRouter()

GROWTH_DATA = {
    "past": {
        "label": "Past Month",
        "count": 1129,
        "delta": "+56%",
        "growth": [820, 880, 950, 1020, 1129],
    },
    "this": {
        "label": "This Month",
        "count": 1763,
        "delta": "+56%",
        "growth": [1129, 1280, 1450, 1620, 1763],
    },
    "all": {
        "label": "All Time",
        "count": 2847,
        "delta": "+23608%",
        "growth": [12, 144, 380, 820, 1129, 1763, 2847],
    },
}


@router.get("/network/growth")
async def get_network_growth(timeframe: str = Query("this")):
    data = GROWTH_DATA.get(timeframe, GROWTH_DATA["this"])
    return data


@router.get("/leaderboard")
async def get_leaderboard():
    # Featured human personas (real, seeded agents) + procedural ambient agents,
    # merged and ranked by score. Personas naturally top the board.
    procedural = [
        {"idx": a["idx"], "name": a["name"], "full_name": a["full_name"],
         "icon": a["icon"], "score": a["score"], "type": a["type"],
         "title": None, "featured": False}
        for a in AGENTS
        # Drop hollow placeholders that our real personas now replace.
        if not is_persona_placeholder(a.get("full_name", ""))
    ]
    combined = featured_leaderboard() + procedural
    combined.sort(key=lambda a: a["score"], reverse=True)
    return [{"rank": i + 1, **a} for i, a in enumerate(combined[:12])]
