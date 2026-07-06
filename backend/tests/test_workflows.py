import json
import pytest
from backend.app.services.workflow_engine import WorkflowEngine
from backend.app.database import get_workflow_executions, get_workflow_by_id

@pytest.mark.asyncio
async def test_workflow_engine_execution_flow():
    action_id = "ACT-WF-TEST"
    action_title = "Automated Garbage Sweep Route 4"
    department = "Sanitation Division"
    sector = "Smart Environment"
    impact_metric = "Saves 18 minutes route loop"

    approved_item = await WorkflowEngine.run_automation(
        action_id=action_id,
        action_title=action_title,
        department=department,
        sector=sector,
        impact_metric=impact_metric
    )

    assert approved_item["id"] == action_id
    assert approved_item["title"] == action_title
    assert approved_item["status"] == "Dispatched"
    assert "Sanitation Division" in approved_item["report"]

    # Verify record saved in SQLite
    wf_id = approved_item["dispatchId"]
    wf_record = get_workflow_by_id(wf_id)
    assert wf_record is not None
    assert wf_record["category"] == "Garbage Collection"
    assert wf_record["status"] == "Completed"
    assert len(wf_record["timeline"]) > 0
    assert "Starting Workflow" in wf_record["logs"]
