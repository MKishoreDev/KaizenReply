from __future__ import annotations

import asyncio
import os
import time
import httpx
from fastapi import HTTPException
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv(usecwd=True), override=False)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL") or "qwen/qwen3.8-27b"
if GROQ_MODEL in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
    GROQ_MODEL = "qwen/qwen3.8-27b"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

FALLBACK_MODELS = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "allam-2-7b",
]

_cached_models: list[str] = []
_cached_models_time: float = 0.0
_failed_models: set[str] = set()
MODEL_CACHE_TTL = 3600  # 1 hour cache


async def get_groq_models() -> list[str]:
    global _cached_models, _cached_models_time, GROQ_MODEL
    now = time.time()
    if _cached_models and (now - _cached_models_time < MODEL_CACHE_TTL):
        return [m for m in _cached_models if m not in _failed_models]

    if not GROQ_API_KEY:
        return [m for m in FALLBACK_MODELS if m not in _failed_models]

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "User-Agent": "KaizenReply/1.0",
                },
            )
            if res.status_code == 200:
                data = res.json()
                models_data = data.get("data", [])
                excluded_keywords = ["whisper", "audio", "embed", "vision", "guard", "orpheus"]
                active_models = [
                    m["id"]
                    for m in models_data
                    if m.get("active", True)
                    and isinstance(m.get("id"), str)
                    and not any(w in m["id"].lower() for w in excluded_keywords)
                    and m["id"] not in _failed_models
                ]
                if active_models:
                    _cached_models = active_models
                    _cached_models_time = now
                    if GROQ_MODEL not in active_models:
                        for pref in ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "allam-2-7b"]:
                            if pref in active_models:
                                GROQ_MODEL = pref
                                break
                        else:
                            GROQ_MODEL = active_models[0]
                    return active_models
    except Exception as e:
        print(f"[Groq Models Warning] Failed to fetch live models list from Groq API: {e}")

    return [m for m in FALLBACK_MODELS if m not in _failed_models]


async def call_groq(
    system_prompt: str,
    user_message: str,
    temperature: float = 0.6,
    max_tokens: int = 400,
    requested_model: str | None = None,
    api_key: str | None = None,
) -> str:
    global GROQ_MODEL
    active_key = api_key or GROQ_API_KEY
    if not active_key:
        raise HTTPException(
            status_code=503,
            detail="AI model not available. GROQ_API_KEY is not configured in environment variables."
        )

    primary_model = requested_model or GROQ_MODEL or "qwen/qwen3.8-27b"
    available_models = await get_groq_models()

    candidate_models = []
    if primary_model and primary_model not in _failed_models:
        candidate_models.append(primary_model)
    for m in available_models:
        if m not in candidate_models and m not in _failed_models:
            candidate_models.append(m)
    for m in FALLBACK_MODELS:
        if m not in candidate_models and m not in _failed_models:
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

        for attempt in range(retries):
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    res = await client.post(
                        GROQ_URL,
                        headers={
                            "Authorization": f"Bearer {active_key}",
                            "User-Agent": "KaizenReply/1.0",
                        },
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
                    if any(kw in err_text.lower() for kw in ["model", "decommissioned", "not found", "invalid", "deprecated", "does not exist", "terms acceptance"]):
                        _failed_models.add(target_model)
                        last_error_detail = err_text
                        break

                res.raise_for_status()

                if target_model != GROQ_MODEL and not requested_model:
                    print(f"[Groq Model Switch] Automatically switched active model from '{GROQ_MODEL}' to working model '{target_model}'")
                    GROQ_MODEL = target_model

                return res.json()["choices"][0]["message"]["content"]

            except HTTPException:
                raise
            except Exception as e:
                last_error_detail = str(e)
                if attempt == retries - 1:
                    break

    print(f"[Groq Warning] All candidate models failed: {last_error_detail}")
    raise HTTPException(status_code=503, detail=f"AI model not available: {last_error_detail}")
