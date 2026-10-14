"""Fix 9 — account pre-hijacking.

Password signup never proves who owns an email address. If an attacker
registers victim@example.com first and the victim later uses "Sign in with
Google", the attacker's password and tokens must stop working.
"""
import uuid
from unittest.mock import patch

from app.core.config import settings
from app.core.google_auth import GoogleProfile
from tests.test_auth_flows import NEW_PASSWORD, _token_from, outbox  # noqa: F401  (outbox is a fixture)


def _google(client, email: str):
    async def fake_verify(credential: str) -> GoogleProfile:
        return GoogleProfile(email=email, name="Real Owner")

    with patch.object(settings, "GOOGLE_CLIENT_ID", "client"), patch("app.api.routes.auth.verify_google_id_token", fake_verify):
        return client.post("/api/auth/google", json={"credential": "a" * 40})


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_google_sign_in_takes_over_a_pre_registered_password_account(client):
    email = f"victim-{uuid.uuid4()}@campus.ai"
    attacker = client.post("/api/auth/signup", json={"email": email, "password": "attacker-pass-1"})
    attacker_token = attacker.json()["access_token"]
    assert client.get("/api/auth/me", headers=_auth(attacker_token)).status_code == 200

    owner = _google(client, email)  # the real owner signs in with Google
    assert owner.status_code == 200

    # The attacker's password and already-issued token are dead.
    assert client.post("/api/auth/signin", json={"email": email, "password": "attacker-pass-1"}).status_code == 401
    assert client.get("/api/auth/me", headers=_auth(attacker_token)).status_code == 401
    # The owner's Google session works.
    assert client.get("/api/auth/me", headers=_auth(owner.json()["access_token"])).status_code == 200


def test_the_owner_can_then_set_a_password_with_forgot_password(client, outbox):  # noqa: F811
    email = f"owner-{uuid.uuid4()}@campus.ai"
    client.post("/api/auth/signup", json={"email": email, "password": "attacker-pass-1"})
    _google(client, email)

    client.post("/api/auth/forgot-password", json={"email": email})
    reset = client.post("/api/auth/reset-password", json={"token": _token_from(outbox[0]["body"]), "password": NEW_PASSWORD})
    assert reset.status_code == 200
    assert client.post("/api/auth/signin", json={"email": email, "password": NEW_PASSWORD}).status_code == 200


def test_later_google_sign_ins_do_not_log_the_owner_out_or_wipe_their_password(client, outbox):  # noqa: F811
    email = f"stable-{uuid.uuid4()}@campus.ai"
    first = _google(client, email)  # creates the account through Google
    assert first.status_code == 200

    client.post("/api/auth/forgot-password", json={"email": email})
    client.post("/api/auth/reset-password", json={"token": _token_from(outbox[0]["body"]), "password": NEW_PASSWORD})

    second = _google(client, email)  # another device, later
    assert second.status_code == 200
    # Nothing was revoked or reset by the second sign-in...
    assert client.post("/api/auth/signin", json={"email": email, "password": NEW_PASSWORD}).status_code == 200
    assert client.get("/api/auth/me", headers=_auth(second.json()["access_token"])).status_code == 200


def test_takeover_happens_only_once(client):
    email = f"once-{uuid.uuid4()}@campus.ai"
    client.post("/api/auth/signup", json={"email": email, "password": "attacker-pass-1"})
    first = _google(client, email)
    second = _google(client, email)
    assert client.get("/api/auth/me", headers=_auth(first.json()["access_token"])).status_code == 200
    assert client.get("/api/auth/me", headers=_auth(second.json()["access_token"])).status_code == 200
