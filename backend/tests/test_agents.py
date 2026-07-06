import json
import pytest
from backend.app.ai.agents_adk import TrafficAgent, DecisionAgent

def test_traffic_agent_initialization():
    agent = TrafficAgent()
    assert agent.name == "Traffic Agent"
    assert "Urban mobility" in agent.system_instruction or "urban mobility" in agent.system_instruction

def test_decision_agent_initialization():
    agent = DecisionAgent()
    assert agent.name == "Decision Agent"
    assert "Decision Intelligence Engine" in agent.system_instruction or "Master Decision Agent" in agent.system_instruction

def test_traffic_agent_fallback():
    agent = TrafficAgent()
    fallback_res = agent.fallback_response("Check congestion on Expressway")
    data = json.loads(fallback_res)
    assert "summary" in data
    assert "evidence" in data
    assert "recommendations" in data
    assert "confidenceScore" in data

def test_decision_agent_fallback_emergency():
    agent = DecisionAgent()
    # Prompt contains flood (emergency trigger)
    fallback_res = agent.fallback_response("Flash flood alert in Section 4 underpass")
    data = json.loads(fallback_res)
    assert "summary" in data
    assert data["priority"] == "High"
    assert "Emergency Management Agency" in data["responsibleDepartments"]
    assert len(data["proposedActions"]) > 0
    assert data["proposedActions"][0]["cost"] == "Low"
    assert data["proposedActions"][0]["urgency"] in ["High", "Critical"]
