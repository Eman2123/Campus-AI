"""Startup recovery of documents whose background processing was cut short.

Uses a fake DB session instead of the real engine: the app's shared async
engine is bound to the TestClient's event loop (see conftest.py), so these
tests exercise the sweep's decision logic without touching it.
"""
import asyncio
import uuid
from unittest.mock import AsyncMock, patch

from app.core.document_recovery import recover_stuck_documents


class _FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class _FakeSession:
    def __init__(self, rows):
        self._rows = rows

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc_info):
        return False

    async def execute(self, _statement):
        return _FakeResult(self._rows)

    async def commit(self):
        return None


def test_recover_stuck_documents_requeues_only_the_unfinished_work():
    doc_a, doc_b, doc_c = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    rows = [
        (doc_a, "pending", "pending"),  # both steps unfinished
        (doc_b, "ready", "processing"),  # only the File Organizer step unfinished
        (doc_c, "processing", "organized"),  # only embedding unfinished
    ]
    process, organize = AsyncMock(), AsyncMock()

    with patch("app.core.document_recovery.AsyncSessionLocal", lambda: _FakeSession(rows)), patch(
        "app.core.document_recovery.process_document", process
    ), patch("app.core.document_recovery.organize_document", organize):
        recovered = asyncio.run(recover_stuck_documents())

    assert recovered == 3
    assert [call.args[0] for call in process.await_args_list] == [str(doc_a), str(doc_c)]
    assert [call.args[0] for call in organize.await_args_list] == [str(doc_a), str(doc_b)]


def test_recover_stuck_documents_does_nothing_when_nothing_is_stuck():
    process, organize = AsyncMock(), AsyncMock()

    with patch("app.core.document_recovery.AsyncSessionLocal", lambda: _FakeSession([])), patch(
        "app.core.document_recovery.process_document", process
    ), patch("app.core.document_recovery.organize_document", organize):
        assert asyncio.run(recover_stuck_documents()) == 0

    process.assert_not_awaited()
    organize.assert_not_awaited()


def test_one_failing_document_does_not_stop_the_others():
    doc_a, doc_b = uuid.uuid4(), uuid.uuid4()
    rows = [(doc_a, "pending", "ready"), (doc_b, "pending", "ready")]
    process = AsyncMock(side_effect=[RuntimeError("bad file"), None])

    with patch("app.core.document_recovery.AsyncSessionLocal", lambda: _FakeSession(rows)), patch(
        "app.core.document_recovery.process_document", process
    ), patch("app.core.document_recovery.organize_document", AsyncMock()):
        recovered = asyncio.run(recover_stuck_documents())

    assert recovered == 1
    assert process.await_count == 2


def test_recover_stuck_documents_never_raises_when_the_database_is_down():
    def database_down():
        raise RuntimeError("db down")

    with patch("app.core.document_recovery.AsyncSessionLocal", database_down):
        assert asyncio.run(recover_stuck_documents()) == 0
