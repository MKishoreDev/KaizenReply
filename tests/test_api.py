import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app, check_antispam, ip_history, RATE_LIMIT_MAX
from fastapi import HTTPException


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "ok"
    assert "model" in data
    assert isinstance(data.get("available_models"), list)


def test_models_endpoint(client):
    response = client.get("/api/models")
    assert response.status_code == 200
    data = response.json()
    assert "current" in data
    assert "models" in data
    assert isinstance(data["models"], list)


def test_static_and_root_endpoints(client):
    res_root = client.get("/")
    assert res_root.status_code == 200
    assert "KaizenReply" in res_root.text

    res_index = client.get("/index.html")
    assert res_index.status_code == 200
    assert "KaizenReply" in res_index.text

    res_manifest = client.get("/manifest.json")
    assert res_manifest.status_code == 200
    assert "application/manifest+json" in res_manifest.headers.get("content-type", "")
    manifest_data = res_manifest.json()
    assert manifest_data.get("display") == "standalone"
    assert len(manifest_data.get("icons", [])) >= 2

    res_sw = client.get("/sw.js")
    assert res_sw.status_code == 200
    assert res_sw.headers.get("Service-Worker-Allowed") == "/"
    assert "application/javascript" in res_sw.headers.get("content-type", "")

    res_icon_192 = client.get("/static/icon-192.png")
    assert res_icon_192.status_code == 200
    assert res_icon_192.headers.get("content-type") == "image/png"


def test_quotes_endpoints(client):
    # Test GET /api/quotes
    response = client.get("/api/quotes?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "quotes" in data
    assert len(data["quotes"]) <= 5

    # Test GET /api/quotes/random
    rand_res = client.get("/api/quotes/random")
    assert rand_res.status_code == 200
    quote = rand_res.json()
    assert "japanese" in quote or "romaji" in quote or "translation" in quote


def test_improve_validation_error(client):
    # Missing required message field
    response = client.post("/api/improve", json={})
    assert response.status_code == 422


@patch("app.main.call_groq", new_callable=AsyncMock)
def test_improve_success(mock_groq, client):
    mock_groq.return_value = (
        '{"improved": "Could you please send the report as soon as possible?", '
        '"before": 40, "after": 88, "clarity": 22, "tone": 24, "professionalism": 22, "readability": 20, '
        '"notes": [{"original": "send report asap", "replacement": "Could you please send the report", "reason": "Polite phrasing."}]}'
    )

    payload = {
        "message": "send report asap",
        "tone": "Professional",
        "platform": "Email",
        "conversationContext": "Work discussion",
        "recipient": "Manager"
    }

    response = client.post("/api/improve", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "improved" in data
    assert data["improved"] == "Could you please send the report as soon as possible?"
    assert data["score"]["before"] == 40
    assert data["score"]["after"] == 88
    assert len(data["notes"]) == 1
    assert data["notes"][0]["original"] == "send report asap"


@patch("app.main.call_groq", new_callable=AsyncMock)
def test_analyze_success(mock_groq, client):
    mock_groq.return_value = '{"tone": "Professional", "reason": "Draft has formal business context"}'

    response = client.post("/api/analyze", json={"message": "Dear Sir, please review the proposal attached."})
    assert response.status_code == 200
    data = response.json()
    assert data["tone"] == "Professional"
    assert "formal business" in data["reason"]


@patch("app.main.call_groq", new_callable=AsyncMock)
def test_reply_success(mock_groq, client):
    mock_groq.return_value = '{"suggestions": ["Sure thing, will do!", "I will prepare the document right away.", "Received with thanks. I will complete this by noon tomorrow."]}'

    payload = {
        "message": "Can you prepare the quarterly review slides?",
        "tone": "Professional",
        "platform": "Slack"
    }

    response = client.post("/api/reply", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "suggestions" in data
    assert len(data["suggestions"]) == 3
    assert data["suggestions"][0] == "Sure thing, will do!"


def test_rate_limiting():
    test_ip = "192.0.2.100"
    ip_history[test_ip] = []

    # Send requests up to RATE_LIMIT_MAX
    for _ in range(RATE_LIMIT_MAX):
        check_antispam(test_ip)

    # Next call should raise 429
    with pytest.raises(HTTPException) as exc_info:
        check_antispam(test_ip)
    assert exc_info.value.status_code == 429
