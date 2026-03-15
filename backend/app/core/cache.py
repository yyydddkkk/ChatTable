"""Simple in-memory cache with TTL."""

import time
from typing import Any


class AppCache:
    def __init__(self):
        self._store: dict[str, tuple[Any, float]] = {}  # key -> (value, expires_at)

    def get(self, key: str) -> Any | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if time.monotonic() > expires_at:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any, ttl: int = 60):
        self._store[key] = (value, time.monotonic() + ttl)

    def invalidate(self, key: str):
        self._store.pop(key, None)

    def invalidate_prefix(self, prefix: str):
        keys_to_delete = [k for k in self._store if k.startswith(prefix)]
        for k in keys_to_delete:
            del self._store[k]


app_cache = AppCache()
