from pydantic import BaseModel
from typing import Optional, List


class ChatMessageIn(BaseModel):
    content: str


class ChatMessageOut(BaseModel):
    id: Optional[str] = None
    role: str
    content: str
    created_at: str


class KnowledgeChunkIn(BaseModel):
    content: str
    category: str


class KnowledgeChunkOut(BaseModel):
    id: str
    content: str
    category: str
    created_at: str


class ProfileUpdate(BaseModel):
    bio: str
    skills: List[str]
    chunks_saved: int


class ChatResponse(BaseModel):
    message: ChatMessageOut
    profile_update: Optional[ProfileUpdate] = None


class EnhanceRequest(BaseModel):
    content: str


class EnhanceResponse(BaseModel):
    enhanced: str
    flagged: bool = False
    hallucinations: List[str] = []


class UploadResponse(BaseModel):
    extracted_text: str
    file_type: str
    file_name: str
