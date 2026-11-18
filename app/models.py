import re
from pydantic import BaseModel, Field, field_validator
from typing import List

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_LINE_BREAKS = re.compile(r"[\r\n\u2028\u2029]+")

ALLOWED_LINKEDIN_FORMATS = {
    "Auto", "Reality vs LinkedIn", "One-line corporate translation",
    "The LinkedIn announcement", "Fake professional profile", "Developer edition",
}
ALLOWED_LINKEDIN_LENGTHS = {"Auto", "One-liner", "Short", "Standard", "Full post"}


def _single_line(v: str) -> str:
    """Short fields are interpolated into the system prompt: keep them on one line."""
    v = _CONTROL_CHARS.sub("", v or "")
    return _LINE_BREAKS.sub(" ", v).strip()


def _clean_text(v: str) -> str:
    return _CONTROL_CHARS.sub("", v or "")

class ImproveRequest(BaseModel):
    message: str = Field(min_length=1, max_length=3000)
    tone: str = Field(default="Casual", max_length=80)
    platform: str = Field(default="", max_length=80)
    conversationContext: str = Field(default="", max_length=1500)
    recipient: str = Field(default="", max_length=200)
    model: str = Field(default="", max_length=100)
    linkedinFormat: str = Field(default="Auto", max_length=60)
    linkedinLength: str = Field(default="Auto", max_length=60)

    @field_validator("tone", "platform", "recipient", "model")
    @classmethod
    def _one_line(cls, v: str) -> str:
        return _single_line(v)

    @field_validator("message", "conversationContext")
    @classmethod
    def _text(cls, v: str) -> str:
        return _clean_text(v)

    @field_validator("linkedinFormat")
    @classmethod
    def _fmt(cls, v: str) -> str:
        return v if v in ALLOWED_LINKEDIN_FORMATS else "Auto"

    @field_validator("linkedinLength")
    @classmethod
    def _len(cls, v: str) -> str:
        return v if v in ALLOWED_LINKEDIN_LENGTHS else "Auto"


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

    @field_validator("model")
    @classmethod
    def _one_line(cls, v: str) -> str:
        return _single_line(v)


class AnalyzeResponse(BaseModel):
    tone: str
    platform: str
    reason: str


class ReplyRequest(BaseModel):
    message: str = Field(min_length=1, max_length=3000)
    tone: str = Field(default="Casual", max_length=80)
    platform: str = Field(default="", max_length=80)
    conversationContext: str = Field(default="", max_length=1500)
    recipient: str = Field(default="", max_length=200)
    model: str = Field(default="", max_length=100)

    @field_validator("tone", "platform", "recipient", "model")
    @classmethod
    def _one_line(cls, v: str) -> str:
        return _single_line(v)

    @field_validator("message", "conversationContext")
    @classmethod
    def _text(cls, v: str) -> str:
        return _clean_text(v)


class ReplyResponse(BaseModel):
    suggestions: List[str]


class MemeRequest(BaseModel):
    reality: str = Field(min_length=1, max_length=500)
    linkedin: str = Field(min_length=1, max_length=1000)
