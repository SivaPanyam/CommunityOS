from fastapi import APIRouter, HTTPException
from ..schemas import ActionApprovalIn
from ..services.workflow_engine import WorkflowEngine
from ..database import get_workflow_executions, get_workflow_by_id

router = APIRouter()

@router.post("/api/workflows/approve")
async def approve_workflow(payload: ActionApprovalIn):
    try:
        approved_item = await WorkflowEngine.run_automation(
            action_id=payload.actionId,
            action_title=payload.actionTitle,
            department=payload.department,
            sector=payload.sector,
            impact_metric=payload.impactMetric
        )
        return {"success": True, "approvedItem": approved_item}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate workflow: {e}")

@router.get("/api/workflows")
async def list_workflows():
    """
    Returns all historical and executing workflow automation items (Audit logs catalog).
    """
    executions = get_workflow_executions()
    return {"workflows": executions}

@router.get("/api/workflows/{wf_id}")
async def get_workflow_details(wf_id: str):
    """
    Returns details (timeline and status) for a specific workflow execution.
    """
    wf = get_workflow_by_id(wf_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow execution not found")
    return {"workflow": wf}

@router.get("/api/workflows/{wf_id}/logs")
async def get_workflow_logs(wf_id: str):
    """
    Returns raw execution/audit logs for a specific workflow execution.
    """
    wf = get_workflow_by_id(wf_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow execution not found")
    return {"id": wf_id, "logs": wf.get("logs", "")}
