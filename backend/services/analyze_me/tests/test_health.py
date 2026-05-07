from fastapi.testclient import TestClient
from core.main import app

client = TestClient(app)


def test_analyze_me_health():
    response = client.get("/analyze-me/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_analyze_me_health_does_not_affect_forge_me():
    response = client.get("/forge-me/health")
    assert response.status_code == 200