from __future__ import annotations

import hmac
import os
import time
from collections import defaultdict
from fastapi import HTTPException, Request, status

response_cache: dict = {}
CACHE_TTL = 300  # 5 minutes in-memory cache
CACHE_MAX_ENTRIES = 500  # hard cap so the cache can't be used to exhaust memory

# Optional shared secret set on both the Cloudflare Pages proxy and the backend.
# When it matches, the backend trusts the client IP the proxy forwards in X-Real-IP.
# Without it, a client could spoof X-Real-IP / X-Forwarded-For to dodge the rate limit.
PROXY_SHARED_SECRET = os.getenv("PROXY_SHARED_SECRET", "")


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
    if len(response_cache) >= CACHE_MAX_ENTRIES:
        # Drop the oldest entry (dicts keep insertion order)
        response_cache.pop(next(iter(response_cache)), None)
    response_cache[key] = (time.time(), data)


def get_ip(request: Request) -> str:
    headers = request.headers

    # 1. Our own Cloudflare proxy, authenticated with a shared secret
    if PROXY_SHARED_SECRET:
        supplied = headers.get("x-proxy-secret", "")
        if supplied and hmac.compare_digest(supplied, PROXY_SHARED_SECRET):
            if real := headers.get("x-real-ip"):
                return real.strip()[:64]

    # 2. Headers set by the hosting platform itself (cannot be forged by the client)
    for h in ("x-vercel-forwarded-for", "cf-connecting-ip"):
        if val := headers.get(h):
            return val.split(",")[0].strip()[:64]

    # 3. Generic reverse proxy header (Vercel/most PaaS overwrite this with the real client IP)
    if fwd := headers.get("x-forwarded-for"):
        return fwd.split(",")[0].strip()[:64]

    return request.client.host if request.client else "unknown"


ip_history: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_WINDOW = 60.0  # 1 minute window
RATE_LIMIT_MAX = 30       # max 30 requests per minute per IP
_last_sweep = 0.0


def _sweep_ip_history(now: float):
    """Drop IPs with no recent requests so the table can't grow without bound."""
    global _last_sweep
    if now - _last_sweep < RATE_LIMIT_WINDOW:
        return
    _last_sweep = now
    for ip in [ip for ip, ts in ip_history.items() if not ts or now - ts[-1] >= RATE_LIMIT_WINDOW]:
        ip_history.pop(ip, None)


def check_antispam(ip: str):
    now = time.time()
    _sweep_ip_history(now)
    history = [t for t in ip_history.get(ip, []) if now - t < RATE_LIMIT_WINDOW]
    if len(history) >= RATE_LIMIT_MAX:
        ip_history[ip] = history
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Maximum 30 requests per minute allowed.",
            headers={"Retry-After": "60"},
        )
    history.append(now)
    ip_history[ip] = history
