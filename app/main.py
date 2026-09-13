from __future__ import annotations

import asyncio
import json
import os
import time

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv, find_dotenv
from app.models import (
    ImproveRequest,
    ImproveResponse,
    Breakdown,
    KaizenScore,
    AnalyzeRequest,
    AnalyzeResponse,
    ReplyRequest,
    ReplyResponse,
)

load_dotenv(find_dotenv(usecwd=True), override=False)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

FALLBACK_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama-3.2-3b-preview",
    "llama-3.2-1b-preview",
    "llama-3.1-70b-versatile",
    "gemma2-9b-it",
    "mixtral-8x7b-32768",
    "qwen-2.5-coder-32b",
]

_cached_models: list[str] = []
_cached_models_time: float = 0.0
MODEL_CACHE_TTL = 3600  # 1 hour cache


async def get_groq_models() -> list[str]:
    global _cached_models, _cached_models_time
    now = time.time()
    if _cached_models and (now - _cached_models_time < MODEL_CACHE_TTL):
        return _cached_models

    if not GROQ_API_KEY:
        return FALLBACK_MODELS

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            )
            if res.status_code == 200:
                data = res.json()
                models_data = data.get("data", [])
                active_models = [
                    m["id"]
                    for m in models_data
                    if m.get("active", True)
                    and isinstance(m.get("id"), str)
                    and not any(w in m["id"].lower() for w in ["whisper", "audio", "embed", "vision", "guard"])
                ]
                if active_models:
                    _cached_models = active_models
                    _cached_models_time = now
                    return active_models
    except Exception as e:
        print(f"[Groq Models Warning] Failed to fetch live models list from Groq API: {e}")

    return FALLBACK_MODELS


PLATFORM_GUIDANCE = {
    "WhatsApp": "casual, short, warm, conversational",
    "Instagram": "casual, light, friendly, expressive",
    "Facebook": "casual, friendly, approachable",
    "Telegram": "casual, concise, direct",
    "LinkedIn": "formal, structured, professional",
    "Email": "polite, structured, with greeting/sign-off when natural",
    "SMS": "very concise, plain, no fluff",
    "Discord": "casual, community-friendly, relaxed",
    "X (Twitter)": "punchy, concise, within ~280 characters",
}

PLATFORM_LIMITS = {"SMS": 160, "X (Twitter)": 280}

app = FastAPI(title="KaizenReply API", version="1.0.0")


def build_improve_prompt(req: ImproveRequest) -> str:
    if req.tone == "Fix Grammar Only":
        tone_instruction = (
            "Strictly correct grammar, spelling, and punctuation. "
            "Do NOT change vocabulary, style, tone, or phrasing."
        )
    else:
        tone_instruction = f"Selected tone: {req.tone}."

    if req.platform:
        guide = PLATFORM_GUIDANCE.get(req.platform, "match the platform's typical style")
        platform_note = f"Target platform: {req.platform} ({guide}). Adapt structure and length."
        limit = PLATFORM_LIMITS.get(req.platform)
        if limit:
            platform_note += (
                f" CRITICAL: The 'improved' field MUST be strictly under {limit} characters."
            )
    else:
        platform_note = "No specific platform — keep it platform-neutral."

    parts = [tone_instruction, platform_note]
    if req.recipient:
        parts.append(f"Recipient: {req.recipient}. Adjust tone accordingly.")
    if req.conversationContext:
        parts.append(f"Conversation context: {req.conversationContext}")

    return f"""You are KaizenReply, a message-improvement engine. Improve the draft's clarity, tone, structure and effectiveness while strictly preserving the original meaning. Never add information not implied by the user. Return only the improved message plus a quality assessment.

Ensure contractions use standard apostrophes (e.g. "I'm", "don't", "it's") — never output typos like "i;m".

{chr(10).join(parts)}

Respond with strict JSON only:
{{
  "improved": string,
  "before": number (0-100, quality of original),
  "after": number (0-100, quality of improved, must be > before),
  "clarity": number (0-30),
  "tone": number (0-30),
  "professionalism": number (0-30),
  "readability": number (0-30)
}}"""


def clamp(v, lo, hi, fallback):
    try:
        return max(lo, min(hi, round(float(v))))
    except (TypeError, ValueError):
        return fallback


async def call_groq(
    system_prompt: str,
    user_message: str,
    temperature: float = 0.6,
    max_tokens: int = 400,
    requested_model: str | None = None,
) -> str:
    global GROQ_MODEL
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured in environment variables.")

    primary_model = requested_model or GROQ_MODEL or "llama-3.3-70b-versatile"
    available_models = await get_groq_models()

    candidate_models = []
    for m in [primary_model] + available_models + FALLBACK_MODELS:
        if m and m not in candidate_models:
            candidate_models.append(m)

    last_error_detail = ""

    for target_model in candidate_models:
        payload = {
            "model": target_model,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        }

        retries = 2
        delay = 1.0
        model_failed = False

        for attempt in range(retries):
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    res = await client.post(
                        GROQ_URL,
                        headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                        json=payload,
                    )
                if res.status_code == 429 and attempt < retries - 1:
                    await asyncio.sleep(int(res.headers.get("Retry-After", delay)))
                    delay *= 2
                    continue
                if res.status_code == 429:
                    raise HTTPException(status_code=429, detail="Rate limit reached. Please wait a moment.")

                if res.status_code in (400, 404):
                    err_text = res.text[:400]
                    if any(kw in err_text.lower() for kw in ["model", "decommissioned", "not found", "invalid", "deprecated", "does not exist"]):
                        print(f"[Groq Fallback] Model '{target_model}' failed ({res.status_code}): {err_text}. Trying next model...")
                        model_failed = True
                        last_error_detail = err_text
                        break

                if res.status_code != 200:
                    raise HTTPException(status_code=502, detail=f"Groq API error {res.status_code}: {res.text[:300]}")

                if target_model != GROQ_MODEL and not requested_model:
                    print(f"[Groq Model Switch] Automatically switched active model from '{GROQ_MODEL}' to working model '{target_model}'")
                    GROQ_MODEL = target_model

                return res.json()["choices"][0]["message"]["content"]

            except HTTPException:
                raise
            except (httpx.RequestError, httpx.TimeoutException) as e:
                if attempt < retries - 1:
                    await asyncio.sleep(delay)
                    delay *= 2
                    continue
                last_error_detail = str(e)
                model_failed = True
                break

        if not model_failed:
            break

    raise HTTPException(status_code=502, detail=f"Groq error across all candidate models. Last detail: {last_error_detail}")


last_seen: dict = {}
ANTISPAM_DELAY = 1.0

response_cache: dict = {}
CACHE_TTL = 300


def clean_expired_cache():
    now = time.time()
    for k in [k for k, (t, _) in response_cache.items() if now - t >= CACHE_TTL]:
        del response_cache[k]


def get_cached(key: tuple):
    if key in response_cache:
        t, data = response_cache[key]
        if time.time() - t < CACHE_TTL:
            return data
        del response_cache[key]
    return None


def set_cached(key: tuple, data):
    response_cache[key] = (time.time(), data)


def get_ip(request: Request) -> str:
    if fwd := request.headers.get("x-forwarded-for"):
        return fwd.split(",")[0].strip()
    if real := request.headers.get("x-real-ip"):
        return real.strip()
    return request.client.host if request.client else "unknown"


def check_antispam(ip: str):
    now = time.time()
    last = last_seen.get(ip, 0)
    if now - last < ANTISPAM_DELAY:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Slow down.",
            headers={"Retry-After": "1"},
        )
    last_seen[ip] = now


@app.get("/health")
async def health():
    models = await get_groq_models()
    return {"status": "ok", "model": GROQ_MODEL, "available_models": models}


@app.get("/api/models")
async def list_models():
    models = await get_groq_models()
    return {
        "current": GROQ_MODEL,
        "models": models
    }


app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def index():
    return FileResponse("static/index.html")


@app.post("/api/improve", response_model=ImproveResponse)
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
            max_tokens=400,
            requested_model=req.model or None,
        )
        parsed = json.loads(content)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI error: {e}")

    before = clamp(parsed.get("before"), 0, 100, 55)
    after = clamp(parsed.get("after"), 0, 100, 90)
    if after <= before:
        after = min(100, before + 25)

    result = ImproveResponse(
        improved=str(parsed.get("improved", "")).strip() or req.message,
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
    )

    set_cached(key, result)
    return result


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest, request: Request) -> AnalyzeResponse:
    ip = get_ip(request)
    key = ("analyze", req.message, req.model)

    clean_expired_cache()
    if cached := get_cached(key):
        return cached

    check_antispam(ip)

    system_prompt = (
        "Analyze the user's draft message and recommend the best tone from: "
        "Casual, Professional, Polite, Formal, Friendly, Gen Z, Persuasive, Assertive, Diplomatic, Concise.\n"
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
        )
        parsed = json.loads(content)
        result = AnalyzeResponse(
            tone=str(parsed.get("tone", "Casual")),
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

Generate exactly 3 different reply options:
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
            max_tokens=500,
            requested_model=req.model or None,
        )
        parsed = json.loads(content)
        suggestions = parsed.get("suggestions", [])
        if not isinstance(suggestions, list) or not suggestions:
            raise ValueError("Invalid suggestions")
        result = ReplyResponse(suggestions=[str(s).strip() for s in suggestions[:3]])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI error: {e}")

    set_cached(key, result)
    return result
