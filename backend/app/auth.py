"""Optional user from the session token sent by the frontend (Feature 9).

The frontend (Auth.js) signs a short-lived HS256 JWT with SCAMGUARD_JWT_SECRET and sends it as
`Authorization: Bearer <token>`. The backend only verifies it; it never talks to Google or Microsoft.
See docs/requirements.md, Authentication.
"""

import logging
import os
from dataclasses import dataclass

import jwt
from fastapi import Header, HTTPException

JWT_SECRET_ENV = "SCAMGUARD_JWT_SECRET"
JWT_ALGORITHM = "HS256"
BEARER_PREFIX = "bearer "

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class User:
    id: str  # "<provider>:<provider account id>", e.g. "google:1234"


def _unauthorized() -> HTTPException:
    return HTTPException(status_code=401, detail="Unauthorized")


def get_current_user(authorization: str | None = Header(default=None)) -> User | None:
    """No header gives None (anonymous). A header that does not hold a valid token is always 401."""
    if authorization is None:
        return None

    if not authorization.lower().startswith(BEARER_PREFIX):
        raise _unauthorized()
    token = authorization[len(BEARER_PREFIX):].strip()

    secret = os.getenv(JWT_SECRET_ENV, "").strip()
    if not secret:
        logger.warning("%s is not set; rejecting the session token", JWT_SECRET_ENV)
        raise _unauthorized()

    try:
        claims = jwt.decode(
            token,
            secret,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError as error:
        logger.info("Invalid session token: %s", type(error).__name__)  # Never log the token.
        raise _unauthorized() from error

    subject = claims["sub"]
    if not isinstance(subject, str) or not subject.strip():
        raise _unauthorized()
    return User(id=subject)
