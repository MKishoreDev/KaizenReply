from __future__ import annotations

import time
from collections import defaultdict
from fastapi import HTTPException, Request, status

response_cache: dict = {}
CACHE_TTL = 300  # 5 minutes in-memory cache


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


ip_history = defaultdict(list)
RATE_LIMIT_WINDOW = 60.0  # 1 minute window
RATE_LIMIT_MAX = 30       # max 30 requests per minute per IP


def check_antispam(ip: str):
    now = time.time()
    history = [t for t in ip_history[ip] if now - t < RATE_LIMIT_WINDOW]
    if len(history) >= RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Maximum 30 requests per minute allowed.",
            headers={"Retry-After": "60"},
        )
    history.append(now)
    ip_history[ip] = history
