import os

from redis import Redis

from app import create_app
from config import read_config

redis = Redis.from_url(
    os.environ["REDIS_URL"], decode_responses=True, socket_timeout=3, socket_connect_timeout=3
)
app = create_app(read_config(), redis)
