import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_get_all_data():
    response = client.get("/api/data/all")
    assert response.status_code == 200
    data = response.json()
    assert "traffic" in data
    assert "weather" in data
    assert "airQuality" in data
    assert "complaints" in data

def test_get_workflows():
    response = client.get("/api/workflows")
    assert response.status_code == 200
    data = response.json()
    assert "workflows" in data

def test_post_workflow_approve():
    payload = {
        "actionId": "ACT-TEST-101",
        "actionTitle": "Test Traffic Control Redirect",
        "department": "Department of Transportation",
        "sector": "Urban Mobility",
        "impactMetric": "Reduces delays by 5 minutes"
    }
    response = client.post("/api/workflows/approve", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["approvedItem"]["title"] == "Test Traffic Control Redirect"
    assert data["approvedItem"]["department"] == "Department of Transportation"
