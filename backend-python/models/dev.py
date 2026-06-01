from typing import Optional
from pydantic import BaseModel


class DevLoginRequest(BaseModel):
    email: str
    password: str


class DevLoginResponse(BaseModel):
    token: str
    email: str


class LLMCallOut(BaseModel):
    id: str
    user_name: str
    call_type: str
    tokens_in: int
    tokens_out: int
    duration_ms: int
    status: str
    created_at: str


class LLMStatsOut(BaseModel):
    tokens_today: int
    tokens_total: int
    cost_today_usd: float
    fallback_rate: float
    avg_duration_ms: float
    total_calls_today: int


class HourlyTokens(BaseModel):
    hour: str
    tokens: int


class FunnelOut(BaseModel):
    signed_up: int
    chatbot_complete: int
    ran_simulation: int
    posted: int
    recent_signups: list[dict]


class DevUserOut(BaseModel):
    id: str
    name: str
    email: str
    joined: str
    chunks: int
    sims: int
    last_active: Optional[str]
    suspended: int
    agent_quality: str


class SimStatsOut(BaseModel):
    total: int
    today: int
    fallback_rate: float
    avg_chunks: float


class SimLogOut(BaseModel):
    id: str
    user_name: str
    chunks_used: int
    duration_ms: int
    output_type: str
    created_at: str


class DailyCount(BaseModel):
    day: str
    count: int


class CommunityStatsOut(BaseModel):
    posts_per_day: list[DailyCount]
    reactions_per_day: list[DailyCount]
    total_posts: int
    total_reactions: int
    avg_reactions: float
    zero_engagement_posts: int
    top_posts: list[dict]


class FeatureFlagsOut(BaseModel):
    simulations: bool
    community: bool
    chatbot: bool
    enhance: bool


class FeatureFlagsIn(BaseModel):
    simulations: Optional[bool] = None
    community: Optional[bool] = None
    chatbot: Optional[bool] = None
    enhance: Optional[bool] = None


class BroadcastIn(BaseModel):
    content: str


class ActionResponse(BaseModel):
    ok: bool
    message: str
