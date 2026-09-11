import json
import os
from urllib.parse import urlsplit


def public_origin(value: str) -> str:
    url = urlsplit(value)
    if (
        url.scheme != "https"
        or not url.hostname
        or url.username
        or url.password
        or url.path
        or url.query
        or url.fragment
    ):
        raise ValueError("Public origins must be HTTPS origins without a trailing slash")
    return value


def read_config():
    return {
        "issuer": public_origin(os.environ["WELDALL_ISSUER"]),
        "origin": public_origin(os.environ["CRM_ORIGIN"]),
        "signing_key": {
            "kid": os.environ["CRM_SIGNING_KID"],
            "private_jwk": json.loads(os.environ["CRM_SIGNING_PRIVATE_JWK"]),
            "public_jwk": json.loads(os.environ["CRM_SIGNING_PUBLIC_JWK"]),
        },
        "provider_token": os.environ["DEMO_GROUP_PROVIDER_TOKEN"],
    }
