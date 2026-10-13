"""Fix 8 — emails are case-insensitive.

pydantic's EmailStr keeps the local part's case, so "Eman@gmail.com" and
"eman@gmail.com" could become two accounts, sign-in failed on a different
case, and Google sign-in could hit MultipleResultsFound (a 500).
"""
import importlib.util
import uuid
from pathlib import Path
from unittest.mock import patch

import pytest
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.google_auth import GoogleProfile
from app.models.user import User
from tests.test_auth_flows import NEW_PASSWORD, _token_from, outbox  # noqa: F401  (outbox is a fixture)

PASSWORD = f"Pw-{uuid.uuid4().hex[:12]}"


def _mixed_case_email() -> str:
    return f"Mixed.Case-{uuid.uuid4().hex[:10]}@Campus.AI"


def test_signup_stores_the_email_lowercase(client):
    email = _mixed_case_email()
    resp = client.post("/api/auth/signup", json={"email": f"  {email}  ", "password": PASSWORD})
    assert resp.status_code == 201
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {resp.json()['access_token']}"}).json()
    assert me["email"] == email.lower()


def test_signin_works_with_any_capitalisation(client):
    email = _mixed_case_email()
    client.post("/api/auth/signup", json={"email": email, "password": PASSWORD})
    for variant in (email, email.lower(), email.upper()):
        resp = client.post("/api/auth/signin", json={"email": variant, "password": PASSWORD})
        assert resp.status_code == 200, variant


def test_the_same_address_in_another_case_cannot_register_twice(client):
    email = _mixed_case_email()
    assert client.post("/api/auth/signup", json={"email": email, "password": PASSWORD}).status_code == 201
    again = client.post("/api/auth/signup", json={"email": email.swapcase(), "password": PASSWORD})
    assert again.status_code == 409


def test_forgot_password_finds_the_account_in_any_case(client, outbox):  # noqa: F811
    email = _mixed_case_email()
    client.post("/api/auth/signup", json={"email": email, "password": PASSWORD})
    client.post("/api/auth/forgot-password", json={"email": email.upper()})
    assert len(outbox) == 1 and outbox[0]["to"] == email.lower()
    reset = client.post("/api/auth/reset-password", json={"token": _token_from(outbox[0]["body"]), "password": NEW_PASSWORD})
    assert reset.status_code == 200


def test_google_sign_in_in_a_different_case_signs_into_the_same_account(client):
    email = _mixed_case_email()
    signup = client.post("/api/auth/signup", json={"email": email, "password": PASSWORD})
    old_id = client.get("/api/auth/me", headers={"Authorization": f"Bearer {signup.json()['access_token']}"}).json()["id"]

    async def fake_verify(credential: str) -> GoogleProfile:
        return GoogleProfile(email=email.upper(), name="Someone")

    with patch.object(settings, "GOOGLE_CLIENT_ID", "client"), patch("app.api.routes.auth.verify_google_id_token", fake_verify):
        resp = client.post("/api/auth/google", json={"credential": "a" * 40})
    assert resp.status_code == 200, resp.text
    new_id = client.get("/api/auth/me", headers={"Authorization": f"Bearer {resp.json()['access_token']}"}).json()["id"]
    assert new_id == old_id


def test_the_database_itself_refuses_case_variant_duplicates(client):
    base = f"dupe-{uuid.uuid4().hex[:10]}@campus.ai"

    async def insert_two():
        async with AsyncSessionLocal() as db:
            db.add(User(email=base, password_hash="x"))
            await db.commit()
        async with AsyncSessionLocal() as db:
            db.add(User(email=base.upper(), password_hash="x"))
            try:
                await db.commit()
            except IntegrityError:
                await db.rollback()
                return True
        return False

    assert client.portal.call(insert_two) is True


def _load_migration():
    path = next(Path(__file__).resolve().parent.parent.joinpath("migrations/versions").glob("e2f6a4c9d1b3_*.py"))
    spec = importlib.util.spec_from_file_location("lowercase_emails_migration", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class _FakeConnection:
    def __init__(self, rows):
        self._rows = rows

    def execute(self, _statement):
        return self

    def fetchall(self):
        return self._rows


def test_migration_aborts_and_names_case_duplicates():
    migration = _load_migration()
    conn = _FakeConnection([("eman@campus.ai", ["Eman@campus.ai", "eman@campus.ai"])])
    with pytest.raises(RuntimeError, match=r"eman@campus\.ai \(Eman@campus\.ai, eman@campus\.ai\)"):
        migration._assert_no_case_duplicates(conn)


def test_migration_passes_when_there_are_no_duplicates():
    _load_migration()._assert_no_case_duplicates(_FakeConnection([]))
