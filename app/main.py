from __future__ import annotations

import json
import os
import random
import time
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.models import (
    ImproveRequest,
    ImproveResponse,
    Breakdown,
    KaizenScore,
    KaizenNote,
    AnalyzeRequest,
    AnalyzeResponse,
    ReplyRequest,
    ReplyResponse,
    MemeRequest,
)
from app.prompts import (
    ALLOWED_TONES,
    PLATFORM_GUIDANCE,
    PLATFORM_LIMITS,
    build_improve_prompt,
)
from app.groq_client import (
    call_groq,
    get_groq_models,
    GROQ_MODEL,
    GROQ_API_KEY,
    FALLBACK_MODELS,
)
from app.security import (
    check_antispam,
    ip_history,
    RATE_LIMIT_MAX,
    get_ip,
    get_cached,
    set_cached,
    clean_expired_cache,
)
from app.meme import (
    create_reality_vs_linkedin_meme,
)

app = FastAPI(title="KaizenReply API", version="2.0.0")

# Restrict CORS access to authorized domains only
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://kaizenreply.vercel.app",
        "https://kaizenreply.pages.dev",
        "https://kaizenreply.us.ci",
        "https://www.kaizenreply.us.ci",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def redirect_old_domains(request: Request, call_next):
    host = request.headers.get("host", "").lower().split(":")[0]
    path = request.url.path
    old_hosts = ["kaizenreply.vercel.app", "kaizenreply.pages.dev"]
    if host in old_hosts:
        if not path.startswith("/api/") and path not in ["/health", "/api/models", "/api/quotes"]:
            return RedirectResponse(
                url=f"https://kaizenreply.us.ci{path}",
                status_code=status.HTTP_301_MOVED_PERMANENTLY,
            )
    return await call_next(request)


def clamp(v, lo, hi, default_val):
    try:
        return max(lo, min(hi, round(float(v))))
    except (TypeError, ValueError):
        return default_val


_cached_kotowaza: list[dict] = []
_cached_kotowaza_time: float = 0.0
KOTOWAZA_CACHE_TTL = 86400  # 24 hours

FALLBACK_KOTOWAZA: list[dict] = [
    {
        "id": "1",
        "japanese": "七転び八起き",
        "romaji": "Nana korobi ya oki",
        "translation": "Fall down seven times, stand up eight.",
        "meaning": {"en": "Fall down seven times, stand up eight. Encourages resilience in the face of adversity."},
        "tags": ["perseverance", "resilience", "wisdom"],
        "jlpt": "N3",
    },
    {
        "id": "2",
        "japanese": "継続は力なり",
        "romaji": "Keizoku wa chikara nari",
        "translation": "Continuity is power.",
        "meaning": {"en": "Persistence pays off. Small, continuous daily efforts accumulate into greatness."},
        "tags": ["effort", "habit", "kaizen"],
        "jlpt": "N2",
    },
    {
        "id": "3",
        "japanese": "千里の道も一歩から",
        "romaji": "Senri no michi mo ippo kara",
        "translation": "A journey of a thousand miles begins with a single step.",
        "meaning": {"en": "Even the greatest endeavor begins with one small, decisive action."},
        "tags": ["journey", "action", "wisdom"],
        "jlpt": "N3",
    },
    {
        "id": "4",
        "japanese": "石の上にも三年",
        "romaji": "Ishi no ue ni mo sannen",
        "translation": "Three years on a cold stone.",
        "meaning": {"en": "Sitting on a cold rock for three years will eventually warm it. Patience and perseverance bring success."},
        "tags": ["patience", "perseverance"],
        "jlpt": "N2",
    },
    {
        "id": "5",
        "japanese": "蛙の子は蛙",
        "romaji": "Kaeru no ko wa kaeru",
        "translation": "A frog's child is a frog.",
        "meaning": {"en": "Like father, like son. Nature and heritage shine through."},
        "tags": ["nature", "family"],
        "jlpt": "N4",
    },
]


async def get_kotowaza_proverbs() -> list[dict]:
    global _cached_kotowaza, _cached_kotowaza_time
    now = time.time()
    if _cached_kotowaza and (now - _cached_kotowaza_time < KOTOWAZA_CACHE_TTL):
        return _cached_kotowaza

    for candidate in [
        Path(__file__).resolve().parent.parent / "data" / "kotowaza.json",
        Path(__file__).resolve().parent.parent / "static" / "data" / "kotowaza.json",
        Path("data/kotowaza.json"),
        Path("static/data/kotowaza.json"),
    ]:
        if candidate.exists():
            try:
                with open(candidate, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list) and data:
                        _cached_kotowaza = data
                        _cached_kotowaza_time = now
                        return data
            except Exception as e:
                print(f"[Kotowaza Warning] Failed to parse local {candidate} ({e})")

    _cached_kotowaza = FALLBACK_KOTOWAZA
    _cached_kotowaza_time = now
    return FALLBACK_KOTOWAZA


@app.get("/health")
async def health():
    models = await get_groq_models()
    return {"status": "ok", "model": GROQ_MODEL, "available_models": models}


@app.get("/api/models")
async def list_models():
    models = await get_groq_models()
    return {"current": GROQ_MODEL, "models": models}


@app.get("/api/quotes")
@app.get("/api/kaizen/quotes")
async def get_quotes(tag: str | None = None, limit: int = 30):
    proverbs = await get_kotowaza_proverbs()
    if tag:
        t = tag.lower()
        proverbs = [
            p for p in proverbs
            if any(t in str(tg).lower() for tg in p.get("tags", []))
            or any(t in str(tg).lower() for tg in p.get("tags_id", []))
        ]
    return {"total": len(proverbs), "quotes": proverbs[:limit]}


@app.get("/api/quotes/random")
@app.get("/api/kaizen/quotes/random")
async def get_random_quote():
    proverbs = await get_kotowaza_proverbs()
    if not proverbs:
        raise HTTPException(status_code=502, detail="No proverbs returned from Kotowaza API.")
    return random.choice(proverbs)


app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/manifest.json")
async def manifest():
    manifest_path = "manifest.json" if os.path.exists("manifest.json") else "static/manifest.json"
    return FileResponse(
        manifest_path,
        media_type="application/manifest+json",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"}
    )


@app.get("/sw.js")
async def service_worker():
    sw_path = "sw.js" if os.path.exists("sw.js") else "static/sw.js"
    return FileResponse(
        sw_path,
        media_type="application/javascript",
        headers={
            "Service-Worker-Allowed": "/",
            "Cache-Control": "no-cache, no-store, must-revalidate"
        }
    )


@app.get("/")
@app.get("/index.html")
@app.get("/share-target")
async def index():
    return FileResponse("index.html")


@app.post("/api/improve", response_model=ImproveResponse)
@app.post("/api/kaizen/improve", response_model=ImproveResponse)
async def improve(req: ImproveRequest, request: Request) -> ImproveResponse:
    ip = get_ip(request)
    key = ("improve", req.message, req.tone, req.platform, req.conversationContext, req.recipient, req.model)

    clean_expired_cache()
    if cached := get_cached(key):
        return cached

    check_antispam(ip)

    try:
        content = await call_groq(
            build_improve_prompt(req),
            req.message,
            temperature=0.6,
            max_tokens=800,
            requested_model=req.model or None,
            api_key=request.headers.get("x-groq-api-key"),
        )
        parsed = json.loads(content)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI error: {e}")

    before = clamp(parsed.get("before"), 0, 100, 55)
    raw_after = clamp(parsed.get("after"), 0, 100, before)
    after = max(before, raw_after)

    raw_notes = parsed.get("notes", [])
    parsed_notes = []
    if isinstance(raw_notes, list):
        for n in raw_notes:
            if isinstance(n, dict) and "original" in n and "replacement" in n and "reason" in n:
                parsed_notes.append(
                    KaizenNote(
                        original=str(n["original"]),
                        replacement=str(n["replacement"]),
                        reason=str(n["reason"])
                    )
                )

    improved_text = str(parsed.get("improved", "")).strip() or req.message
    if req.platform and (limit := PLATFORM_LIMITS.get(req.platform)):
        if len(improved_text) > limit:
            if " " in improved_text[:limit]:
                improved_text = improved_text[:limit].rsplit(" ", 1)[0].rstrip(".,;:-")
            else:
                improved_text = improved_text[:limit]

    result = ImproveResponse(
        improved=improved_text,
        score=KaizenScore(
            before=before,
            after=after,
            breakdown=Breakdown(
                clarity=clamp(parsed.get("clarity"), 0, 30, 18),
                tone=clamp(parsed.get("tone"), 0, 30, 22),
                professionalism=clamp(parsed.get("professionalism"), 0, 30, 14),
                readability=clamp(parsed.get("readability"), 0, 30, 20),
            ),
        ),
        notes=parsed_notes,
    )

    set_cached(key, result)
    return result


@app.post("/api/analyze", response_model=AnalyzeResponse)
@app.post("/api/kaizen/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest, request: Request) -> AnalyzeResponse:
    ip = get_ip(request)
    key = ("analyze", req.message, req.model)

    clean_expired_cache()
    if cached := get_cached(key):
        return cached

    check_antispam(ip)

    system_prompt = (
        "Analyze the user's draft message and recommend the best tone from: "
        f"{', '.join(sorted(ALLOWED_TONES))}.\n"
        "Give a short reason (max 15 words).\n\n"
        'Respond with strict JSON only: {"tone": string, "reason": string}'
    )

    try:
        content = await call_groq(
            system_prompt,
            req.message,
            temperature=0.3,
            max_tokens=100,
            requested_model=req.model or None,
            api_key=request.headers.get("x-groq-api-key"),
        )
        parsed = json.loads(content)
        raw_tone = str(parsed.get("tone", "Professional")).strip()
        validated_tone = raw_tone if raw_tone in ALLOWED_TONES else "Professional"
        result = AnalyzeResponse(
            tone=validated_tone,
            platform="",
            reason=str(parsed.get("reason", "based on message style")),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI error: {e}")

    set_cached(key, result)
    return result


@app.post("/api/reply", response_model=ReplyResponse)
@app.post("/api/kaizen/reply", response_model=ReplyResponse)
async def reply(req: ReplyRequest, request: Request) -> ReplyResponse:
    ip = get_ip(request)
    key = ("reply", req.message, req.tone, req.platform, req.conversationContext, req.recipient, req.model)

    clean_expired_cache()
    if cached := get_cached(key):
        return cached

    check_antispam(ip)

    limit_note = ""
    if req.platform and (limit := PLATFORM_LIMITS.get(req.platform)):
        limit_note = f"CRITICAL: Each suggestion MUST be under {limit} characters.\n"

    system_prompt = f"""You are KaizenReply in Reply Mode.

IMPORTANT:
The user's message is an incoming message they received from someone else.
Your job is to generate replies the user can send back.
You MUST NOT rewrite, improve, paraphrase, or grammar-correct the incoming message.
You MUST respond TO the message.

Rules:
- Treat the input as a received message.
- Generate actual responses.
- Never repeat the original message.
- Never rephrase the original message.
- Never explain the message.
- Make each reply sound natural and ready to send.
- Keep responses consistent with the requested tone.

Tone: {req.tone}
Platform: {req.platform or 'platform-neutral'}
Recipient: {req.recipient or 'general'}
Context: {req.conversationContext or 'none'}

{limit_note}

Generate exactly 3 distinct reply options:
1. Short and concise
2. Balanced and conversational
3. Detailed and thoughtful

Examples:

Incoming Message: "Can you send me the report by tomorrow?"
Good Reply: "Sure, I'll send it before noon."
Good Reply: "Yes, I'll have it ready by tomorrow."
Bad Reply: "Could you send me the report by tomorrow?"

Incoming Message: "Thanks for helping me today."
Good Reply: "Happy to help!"
Good Reply: "You're welcome, glad I could assist."
Bad Reply: "Thank you for helping me today."

Respond with strict JSON only: {{"suggestions": [string, string, string]}}"""

    try:
        temperature = 0.4 if req.platform in ["LinkedIn", "Email"] else 0.7
        content = await call_groq(
            system_prompt,
            req.message,
            temperature=temperature,
            max_tokens=600,
            requested_model=req.model or None,
            api_key=request.headers.get("x-groq-api-key"),
        )
        parsed = json.loads(content)
        suggestions = parsed.get("suggestions", [])
        if not isinstance(suggestions, list) or not suggestions:
            raise ValueError("Invalid suggestions")

        cleaned_suggestions = []
        for s in suggestions[:3]:
            s_str = str(s).strip()
            if req.platform and (limit := PLATFORM_LIMITS.get(req.platform)):
                if len(s_str) > limit:
                    s_str = s_str[:limit].rsplit(" ", 1)[0].rstrip(".,;:-") if " " in s_str[:limit] else s_str[:limit]
            if s_str:
                cleaned_suggestions.append(s_str)

        if not cleaned_suggestions:
            cleaned_suggestions = [str(s).strip() for s in suggestions[:3]]

        result = ReplyResponse(suggestions=cleaned_suggestions)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI error: {e}")

    set_cached(key, result)
    return result


@app.post("/api/meme/generate")
async def generate_meme_endpoint(req: MemeRequest):
    img_bytes = create_reality_vs_linkedin_meme(req.reality, req.linkedin)
    return Response(
        content=img_bytes,
        media_type="image/jpeg",
        headers={"Content-Disposition": 'inline; filename="reality-vs-linkedin-meme.jpg"'}
    )


@app.get("/api/meme/demo")
async def demo_meme_endpoint():
    img_bytes = create_reality_vs_linkedin_meme(
        "I ate a sandwich at 2 PM because I forgot to have lunch.",
        "Executed a precision mid-day nutritional sprint. Optimized metabolic throughput and sustained high-velocity cognitive output across cross-functional workstreams."
    )
    return Response(
        content=img_bytes,
        media_type="image/jpeg",
        headers={"Content-Disposition": 'inline; filename="reality-vs-linkedin-demo.jpg"'}
    )
