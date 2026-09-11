"""PUBLIC DEMO ONLY: every verified Google identity gets the demo-readers group.

Weldall performs identity verification. This Token-protected directory is not an
identity provider and must never be connected to a real company instance.
"""

import hashlib
import hmac
import re

from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, Header, HTTPException

GROUP = {
    "ou": "demo-readers",
    "cn": "Public demo readers",
    "description": "Read fictional contracts and CRM records",
}


def provider_router(redis, token: str):
    if len(token) < 32:
        raise ValueError("DEMO_GROUP_PROVIDER_TOKEN must contain at least 32 characters")
    expected = hashlib.sha256(f"Token {token}".encode()).digest()

    def authenticate(authorization: str = Header(default="")):
        if not hmac.compare_digest(hashlib.sha256(authorization.encode()).digest(), expected):
            raise HTTPException(status_code=401, detail="Invalid provider credential")

    router = APIRouter(prefix="/api/management", dependencies=[Depends(authenticate)])

    @router.get("/groups/")
    def groups():
        return [GROUP]

    @router.get("/groups/{group_id}/")
    def group(group_id: str):
        if group_id != GROUP["ou"]:
            raise HTTPException(status_code=404, detail="Group not found")
        return GROUP

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
        redis.set(f"crm:directory:{username}", email, ex=300)
        return [{"username": username, "email": email, "is_active": True}]

    @router.get("/users/{username}/")
    def user(username: str):
        if not re.fullmatch(r"[0-9a-f]{64}", username):
            raise HTTPException(status_code=404, detail="User not found")
        email = redis.get(f"crm:directory:{username}")
        if not email:
            raise HTTPException(status_code=404, detail="User lookup expired")
        return {"username": username, "email": email, "is_active": True, "groups": [GROUP["ou"]]}

    return router
