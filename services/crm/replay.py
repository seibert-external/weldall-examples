import hashlib
import math
from datetime import UTC, datetime


class RedisReplayStore:
    def __init__(self, redis):
        self.redis = redis

    def consume(self, key: str, expires_at: datetime) -> bool:
        expiry = expires_at.timestamp() * 1000
        if not key or not math.isfinite(expiry) or expiry <= datetime.now(UTC).timestamp() * 1000:
            return False
        digest = hashlib.sha256(key.encode()).hexdigest()
        # Redis failures propagate to the SDK, which fails closed with 503.
        return bool(self.redis.set(f"crm:replay:{digest}", "1", nx=True, pxat=math.ceil(expiry)))
