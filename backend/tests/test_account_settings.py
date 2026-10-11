"""Settings page backend: rename, preferences, chat history and account deletion.

Same style as the other tests: real FastAPI app, real database, real JWTs.
Rows the app can't create without an LLM (sessions, schedules) are inserted
directly through the app's own session factory on the TestClient's event loop.
"""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from sqlalchemy import func, select

from app.core.database import AsyncSessionLocal
from app.models.message import Message
from app.models.schedule import Schedule
from app.models.session import Session
from app.models.user import User


def _me(client, headers):
    resp = client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _run(client, coro_fn):
    return client.portal.call(coro_fn)


def _seed_chat(client, user_id: str, messages: int = 2) -> uuid.UUID:
    async def go():
        async with AsyncSessionLocal() as db:
            session = Session(user_id=uuid.UUID(user_id))
            db.add(session)
            await db.flush()
            for i in range(messages):
                db.add(Message(session_id=session.id, role="user" if i % 2 == 0 else "assistant", content=f"m{i}"))
            await db.commit()
            return session.id

    return _run(client, go)


def _seed_deadline(client, user_id: str, title: str, due: datetime) -> None:
    async def go():
        async with AsyncSessionLocal() as db:
            db.add(Schedule(user_id=uuid.UUID(user_id), title=title, due_date=due, source="deadline"))
            await db.commit()

    _run(client, go)


def _count(client, model, where) -> int:
    async def go():
        async with AsyncSessionLocal() as db:
            return (await db.execute(select(func.count()).select_from(model).where(where))).scalar_one()

    return _run(client, go)


# ---------------------------------------------------------------------------
# Name
# ---------------------------------------------------------------------------


def test_can_rename_yourself(client, auth_headers):
    resp = client.patch("/api/auth/me", json={"name": "  Ayesha Khan  "}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Ayesha Khan"
    assert _me(client, auth_headers)["name"] == "Ayesha Khan"


def test_rename_rejects_blank_name(client, auth_headers):
    assert client.patch("/api/auth/me", json={"name": "   "}, headers=auth_headers).status_code == 422
    assert client.patch("/api/auth/me", json={"name": ""}, headers=auth_headers).status_code == 422


def test_rename_requires_auth(client):
    assert client.patch("/api/auth/me", json={"name": "x"}).status_code in (401, 403)


# ---------------------------------------------------------------------------
# Preferences
# ---------------------------------------------------------------------------


def test_preferences_default_then_patch_merges(client, auth_headers):
    defaults = client.get("/api/auth/me/preferences", headers=auth_headers).json()
    assert defaults["reminders_enabled"] is True
    assert defaults["week_starts_on"] == "Monday"

    first = client.patch("/api/auth/me/preferences", json={"reminders_enabled": False}, headers=auth_headers)
    assert first.status_code == 200
    second = client.patch("/api/auth/me/preferences", json={"week_starts_on": "Sunday"}, headers=auth_headers)
    assert second.status_code == 200

    stored = client.get("/api/auth/me/preferences", headers=auth_headers).json()
    assert stored["reminders_enabled"] is False  # first patch survived the second
    assert stored["week_starts_on"] == "Sunday"
    assert stored["digest_enabled"] is True  # untouched keys keep their default


def test_preferences_reject_bad_values(client, auth_headers):
    assert client.patch("/api/auth/me/preferences", json={"remind_hours": 0}, headers=auth_headers).status_code == 422
    assert client.patch("/api/auth/me/preferences", json={"week_starts_on": "Friday"}, headers=auth_headers).status_code == 422


def test_preferences_are_per_user(client, auth_headers):
    client.patch("/api/auth/me/preferences", json={"reduce_motion": True}, headers=auth_headers)
    email = f"other-{uuid.uuid4()}@campus.ai"
    token = client.post("/api/auth/signup", json={"email": email, "password": "testpass123"}).json()["access_token"]
    other = client.get("/api/auth/me/preferences", headers={"Authorization": f"Bearer {token}"}).json()
    assert other["reduce_motion"] is False


def test_daily_digest_sweep_skips_students_who_turned_it_off_but_digest_me_still_works(client, auth_headers):
    user_id = _me(client, auth_headers)["id"]
    _seed_deadline(client, user_id, "Chemistry Quiz", datetime.now(timezone.utc) + timedelta(days=2))
    client.patch("/api/auth/me/preferences", json={"digest_enabled": False}, headers=auth_headers)

    with patch("app.core.digest.send_email") as send:
        from app.core.digest import send_daily_digests

        sent_by_sweep = _run(client, lambda: send_daily_digests())
        # Other students in the shared test DB may legitimately get digests; ours must not.
        assert all("Chemistry Quiz" not in c.kwargs["body"] for c in send.call_args_list)
        assert isinstance(sent_by_sweep, int)

    with patch("app.core.digest.send_email") as send:
        resp = client.post("/api/schedule/digest-me", headers=auth_headers)
        assert resp.json()["digests_sent"] == 1
        assert "Chemistry Quiz" in send.call_args.kwargs["body"]


def test_digest_window_follows_the_students_setting(client, auth_headers):
    user_id = _me(client, auth_headers)["id"]
    _seed_deadline(client, user_id, "Distant Exam", datetime.now(timezone.utc) + timedelta(days=12))

    with patch("app.core.digest.send_email") as send:
        assert client.post("/api/schedule/digest-me", headers=auth_headers).json()["digests_sent"] == 0
        send.assert_not_called()

    client.patch("/api/auth/me/preferences", json={"digest_days": 14}, headers=auth_headers)
    with patch("app.core.digest.send_email") as send:
        assert client.post("/api/schedule/digest-me", headers=auth_headers).json()["digests_sent"] == 1
        assert "Distant Exam" in send.call_args.kwargs["body"]


def test_reminder_lead_time_follows_the_students_setting(client, auth_headers):
    user_id = _me(client, auth_headers)["id"]
    _seed_deadline(client, user_id, "Essay Due", datetime.now(timezone.utc) + timedelta(hours=60))

    with patch("app.core.reminders.send_email") as send:
        assert client.post("/api/schedule/remind-me", headers=auth_headers).json()["reminders_sent"] == 0
        send.assert_not_called()

    client.patch("/api/auth/me/preferences", json={"remind_hours": 72}, headers=auth_headers)
    with patch("app.core.reminders.send_email") as send:
        assert client.post("/api/schedule/remind-me", headers=auth_headers).json()["reminders_sent"] == 1
        assert "Essay Due" in send.call_args.kwargs["body"]


# ---------------------------------------------------------------------------
# Chat history
# ---------------------------------------------------------------------------


def test_delete_one_session(client, auth_headers):
    user_id = _me(client, auth_headers)["id"]
    keep = _seed_chat(client, user_id)
    drop = _seed_chat(client, user_id)

    assert client.delete(f"/api/sessions/{drop}", headers=auth_headers).status_code == 204
    ids = [s["id"] for s in client.get("/api/sessions", headers=auth_headers).json()]
    assert str(keep) in ids and str(drop) not in ids
    assert _count(client, Message, Message.session_id == drop) == 0


def test_cannot_delete_someone_elses_session(client, auth_headers):
    other_email = f"other-{uuid.uuid4()}@campus.ai"
    other_token = client.post("/api/auth/signup", json={"email": other_email, "password": "testpass123"}).json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}
    theirs = _seed_chat(client, _me(client, other_headers)["id"])

    assert client.delete(f"/api/sessions/{theirs}", headers=auth_headers).status_code == 404
    assert any(s["id"] == str(theirs) for s in client.get("/api/sessions", headers=other_headers).json())


def test_clear_history_removes_only_my_chats(client, auth_headers):
    mine = _me(client, auth_headers)["id"]
    other_email = f"other-{uuid.uuid4()}@campus.ai"
    other_token = client.post("/api/auth/signup", json={"email": other_email, "password": "testpass123"}).json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}
    _seed_chat(client, mine)
    _seed_chat(client, mine)
    _seed_chat(client, _me(client, other_headers)["id"])

    assert client.delete("/api/sessions", headers=auth_headers).status_code == 204
    assert client.get("/api/sessions", headers=auth_headers).json() == []
    assert len(client.get("/api/sessions", headers=other_headers).json()) == 1


# ---------------------------------------------------------------------------
# Account deletion
# ---------------------------------------------------------------------------


def test_delete_account_requires_matching_email(client, auth_headers):
    resp = client.request("DELETE", "/api/auth/me", json={"confirm_email": "nobody@campus.ai"}, headers=auth_headers)
    assert resp.status_code == 400
    assert client.get("/api/auth/me", headers=auth_headers).status_code == 200  # still there


def test_delete_account_removes_everything_and_the_token_stops_working(client, auth_headers):
    me = _me(client, auth_headers)
    user_id = uuid.UUID(me["id"])
    session_id = _seed_chat(client, me["id"])
    _seed_deadline(client, me["id"], "Final", datetime.now(timezone.utc) + timedelta(days=5))

    resp = client.request("DELETE", "/api/auth/me", json={"confirm_email": me["email"].upper()}, headers=auth_headers)
    assert resp.status_code == 204, resp.text

    assert client.get("/api/auth/me", headers=auth_headers).status_code == 401
    assert _count(client, User, User.id == user_id) == 0
    assert _count(client, Session, Session.user_id == user_id) == 0
    assert _count(client, Message, Message.session_id == session_id) == 0
    assert _count(client, Schedule, Schedule.user_id == user_id) == 0
