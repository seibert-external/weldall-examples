"""PUBLIC DEMO ONLY: every verified identity gets the demo-readers group.

The listed members (PRAXIS_DEMO_MEMBERS) also get praxis-demo, which reads the
fictional dental practice used in customer demos. Weldall performs identity
verification. This Token-protected directory is not an identity provider and
must never be connected to a real company instance.
"""

import hashlib
import hmac
import re

from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, Header, HTTPException

GROUP = {
    "ou": "demo-readers",
    "cn": "Public demo readers",
    "description": "Read the fictional records of the demo company",
}
PRAXIS_GROUP = {
    "ou": "praxis-demo",
    "cn": "Dental practice demo",
    "description": "Read the fictional dental practice used in customer demos",
}


def parse_members(value: str) -> frozenset[str]:
    return frozenset(m.strip().lower() for m in value.split(",") if m.strip())


def provider_router(redis, token: str, praxis_members: frozenset[str] = frozenset()):
    if len(token) < 32:
        raise ValueError("DEMO_GROUP_PROVIDER_TOKEN must contain at least 32 characters")
    expected = hashlib.sha256(f"Token {token}".encode()).digest()

    def authenticate(authorization: str = Header(default="")):
        if not hmac.compare_digest(hashlib.sha256(authorization.encode()).digest(), expected):
            raise HTTPException(status_code=401, detail="Invalid provider credential")

    router = APIRouter(prefix="/api/management", dependencies=[Depends(authenticate)])

    known = {g["ou"]: g for g in (GROUP, PRAXIS_GROUP)}

    @router.get("/groups/")
    def groups():
        return list(known.values())

    @router.get("/groups/{group_id}/")
    def group(group_id: str):
        if group_id not in known:
            raise HTTPException(status_code=404, detail="Group not found")
        return known[group_id]

    @router.get("/users/")
    def users(mail: str):
        email = mail.strip().lower()
        try:
            validate_email(email, check_deliverability=False, test_environment=True)
        except EmailNotValidError:
            return []
        if len(email) > 320:
            return []
        username = hashlib.sha256(email.encode()).hexdigest()
        # IDs stay under Weldall's 191-char limit, even for long valid emails.
        # Only the immediate lookup/detail exchange needs this real identity.
        redis.set(f"mail:directory:{username}", email, ex=300)
        return [{"username": username, "email": email, "is_active": True}]

    @router.get("/users/{username}/")
    def user(username: str):
        if not re.fullmatch(r"[0-9a-f]{64}", username):
            raise HTTPException(status_code=404, detail="User not found")
        email = redis.get(f"mail:directory:{username}")
        if not email:
            raise HTTPException(status_code=404, detail="User lookup expired")
        member = email in praxis_members
        groups = [GROUP["ou"], *([PRAXIS_GROUP["ou"]] if member else [])]
        return {"username": username, "email": email, "is_active": True, "groups": groups}

    return router
