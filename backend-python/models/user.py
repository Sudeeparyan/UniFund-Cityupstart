from pydantic import BaseModel
from typing import Optional, List


class SignupRequest(BaseModel):
    email: str
    password: str
    name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    name: str


class OnboardingPayload(BaseModel):
    focus: dict
    goal: dict
    fear: dict


class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    focus: Optional[str] = None
    goal: Optional[str] = None
    fear: Optional[str] = None
    agent_bio: str = ""
    agent_skills: List[str] = []
    agent_score: int = 100
    onboarding_complete: bool = False
    posts_count: int = 0
    chunks_saved: int = 0
