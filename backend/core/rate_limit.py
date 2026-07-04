from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter instance so both main.py and individual routers can attach
# per-endpoint limits (e.g. the public contact form) without circular imports.
limiter = Limiter(key_func=get_remote_address, default_limits=["20/minute"])
