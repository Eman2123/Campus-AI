"""LLM provider failures should reach the client as clean JSON errors
(not a bare 500), and never leak provider details."""
from unittest.mock import patch

import httpx
import openai

from app.agents.graph import campus_ai_graph


def _chat(client, headers):
    return client.post("/api/chat", json={"message": "hello there", "session_id": "err-test"}, headers=headers)


def test_llm_timeout_becomes_504(client, auth_headers):
    exc = openai.APITimeoutError(request=httpx.Request("POST", "http://llm.test"))
    with patch.object(campus_ai_graph, "ainvoke", side_effect=exc):
        resp = _chat(client, auth_headers)
    assert resp.status_code == 504
    assert "too long" in resp.json()["detail"]


def test_llm_connection_error_becomes_502_without_leaking_details(client, auth_headers):
    exc = openai.APIConnectionError(request=httpx.Request("POST", "http://secret-host.internal"))
    with patch.object(campus_ai_graph, "ainvoke", side_effect=exc):
        resp = _chat(client, auth_headers)
    assert resp.status_code == 502
    assert "secret-host" not in resp.text
