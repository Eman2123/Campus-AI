import logging
from dataclasses import dataclass

import httpx

from app.core.config import settings

logger = logging.getLogger("campus_ai.google_auth")

_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
_VALID_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


class GoogleAuthError(Exception):
    """The Google credential was missing, invalid, expired, or not meant
    for this app. The message is safe to show to the person."""


@dataclass
class GoogleProfile:
    email: str
    name: str | None


async def verify_google_id_token(credential: str) -> GoogleProfile:
    """Checks a Google Identity Services ID token ("credential") and
    returns who it belongs to.

    Google's own `tokeninfo` endpoint does the signature and expiry check
    for us, so there's no key handling here. What it can't know is which
    app the token was minted for — so `aud` is compared to our
    GOOGLE_CLIENT_ID below; skipping that would let a token issued to some
    other site sign people in here.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(_TOKENINFO_URL, params={"id_token": credential})
    except httpx.HTTPError as exc:
        logger.warning("Google tokeninfo request failed: %s", exc)
        raise GoogleAuthError("Could not reach Google to verify sign-in. Please try again.") from exc

    if response.status_code != 200:
        raise GoogleAuthError("Google sign-in could not be verified.")

    claims = response.json()

    if claims.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise GoogleAuthError("Google sign-in could not be verified.")
    if claims.get("iss") not in _VALID_ISSUERS:
        raise GoogleAuthError("Google sign-in could not be verified.")
    # tokeninfo returns booleans as the strings "true"/"false".
    if str(claims.get("email_verified")).lower() != "true":
        raise GoogleAuthError("Your Google email address is not verified.")

    email = claims.get("email")
    if not email:
        raise GoogleAuthError("Google did not share an email address.")

    return GoogleProfile(email=email, name=claims.get("name"))
