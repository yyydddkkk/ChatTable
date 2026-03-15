from typing import Optional

from app.core.config import get_logger, settings

logger = get_logger(__name__)

try:
    import redis
except Exception:  # pragma: no cover - optional dependency until installed
    redis = None  # type: ignore[assignment]


_client: Optional["redis.Redis"] = None


def get_redis_client() -> Optional["redis.Redis"]:
    global _client
    if _client is not None:
        return _client
    if redis is None:
        logger.warning("Redis package is not installed, skip redis client initialization")
        return None
    try:
        _client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
        return _client
    except Exception as exc:
        logger.warning("Failed to initialize redis client: %s", exc)
        return None


def redis_health() -> bool:
    client = get_redis_client()
    if client is None:
        return False
    try:
        return bool(client.ping())
    except Exception:
        return False
