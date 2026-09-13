from pydantic import BaseModel, Field
from typing import List

class ImproveRequest(BaseModel):
    message: str = Field(min_length=1, max_length=3000)
    tone: str = Field(default="Casual", max_length=40)
    platform: str = Field(default="", max_length=40)
    conversationContext: str = Field(default="", max_length=1500)
    recipient: str = Field(default="", max_length=200)
    model: str = Field(default="", max_length=100)


class Breakdown(BaseModel):
    clarity: int
    tone: int
    professionalism: int
    readability: int


class KaizenScore(BaseModel):
    before: int
    after: int
    breakdown: Breakdown


class KaizenNote(BaseModel):
    original: str
    replacement: str
    reason: str


class ImproveResponse(BaseModel):
    improved: str
    score: KaizenScore
    notes: List[KaizenNote] = Field(default_factory=list)


class AnalyzeRequest(BaseModel):
    message: str = Field(min_length=1, max_length=3000)
    model: str = Field(default="", max_length=100)


class AnalyzeResponse(BaseModel):
    tone: str
    platform: str
    reason: str


class ReplyRequest(BaseModel):
    message: str = Field(min_length=1, max_length=3000)
    tone: str = Field(default="Casual", max_length=40)
    platform: str = Field(default="", max_length=40)
    conversationContext: str = Field(default="", max_length=1500)
    recipient: str = Field(default="", max_length=200)
    model: str = Field(default="", max_length=100)


class ReplyResponse(BaseModel):
    suggestions: List[str]
