import json

from fastapi import APIRouter, Depends

from db import get_db
from auth import get_current_user

from models.user import UserProfile, OnboardingPayload

router = APIRouter()


def _row_to_profile(user: dict) -> UserProfile:
    skills_raw = user.get("agent_skills") or "[]"
    try:
        skills = json.loads(skills_raw)
    except Exception:
        skills = []
    return UserProfile(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        focus=user.get("focus"),
        goal=user.get("goal"),
        fear=user.get("fear"),
        agent_bio=user.get("agent_bio") or "",
        agent_skills=skills,
        agent_score=user.get("agent_score") or 100,
        onboarding_complete=bool(user.get("onboarding_complete")),
    )


@router.get("/me", response_model=UserProfile)
async def get_me(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    profile = _row_to_profile(current_user)
    cursor = await db.execute(
        "SELECT COUNT(*) as cnt FROM posts WHERE user_id = ?",
        (current_user["id"],),
    )
    row = await cursor.fetchone()
    profile.posts_count = row["cnt"] if row else 0
    return profile


@router.post("/me/onboarding", response_model=UserProfile)
async def save_onboarding(
    payload: OnboardingPayload,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    focus_str = payload.focus.get("custom") or payload.focus.get("choice") or ""
    goal_str = payload.goal.get("custom") or payload.goal.get("choice") or ""
    fear_str = payload.fear.get("custom") or payload.fear.get("choice") or ""

    await db.execute(
        "UPDATE users SET focus=?, goal=?, fear=?, onboarding_complete=1 WHERE id=?",
        (focus_str, goal_str, fear_str, current_user["id"]),
    )
    await db.commit()
    cursor = await db.execute("SELECT * FROM users WHERE id=?", (current_user["id"],))
    updated = await cursor.fetchone()
    return _row_to_profile(dict(updated))
