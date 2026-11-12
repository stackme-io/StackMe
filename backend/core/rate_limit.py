from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter instance so both main.py and individual routers can attach
# per-endpoint limits (e.g. the public contact form) without circular imports.
limiter = Limiter(key_func=get_remote_address, default_limits=["20/minute"])


def client_ip(request) -> str:
    """Real client IP behind Railway's proxy (first X-Forwarded-For hop).

    uvicorn runs without --forwarded-allow-ips, so request.client.host is the proxy and a
    plain per-IP limit would be shared by everyone. Spoofable, but only used for rate
    limiting and never stored.
    """
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return get_remote_address(request)
