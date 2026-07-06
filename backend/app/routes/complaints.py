import json
import logging
from datetime import datetime
from fastapi import APIRouter
from ..database import state
from ..schemas import ComplaintIn
from ..websocket_manager import broadcast
from ..ai.client import ai_client
from google.genai import types

logger = logging.getLogger("CommunityOS.ComplaintsRoute")
router = APIRouter()

@router.post("/api/complaints")
async def create_complaint(payload: ComplaintIn):
    new_id = f"COMP-{100 + len(state['complaints']) + 1}"
    timestamp = datetime.utcnow().isoformat() + "Z"

    complaint = {
        "id": new_id,
        "timestamp": timestamp,
        "title": payload.title,
        "description": payload.description,
        "location": payload.location,
        "category": "Uncategorized",
        "priority": "Medium",
        "department": "Citizen Relations",
        "status": "Open",
        "image_url": payload.imageUrl or "",
        "suggested_action": "Evaluating report..."
    }

    # Triage and classify using the ADK CitizenAgent
    from ..ai.agents_adk import CitizenAgent
    agent = CitizenAgent()
    try:
        response_str = await agent.execute(
            f"Triage this complaint:\nTitle: {payload.title}\nDescription: {payload.description}\nLocation: {payload.location}"
        )
        result = json.loads(response_str)
        complaint.update({
            "category": result.get("category", "Uncategorized"),
            "priority": result.get("priority", "Medium"),
            "department": result.get("department", "Citizen Relations"),
            "suggested_action": result.get("suggested_action", "Dispatch inspector to assess incident site.")
        })
    except Exception as e:
        logger.error(f"CitizenAgent triage classification failed: {e}")
        # Static simulation fallback
        complaint.update({
            "category": "Waste Management",
            "priority": "Low",
            "department": "Sanitation Division",
            "suggested_action": "Schedule routine sweep of specified address."
        })

    # Append notification
    state["notifications"].insert(0, {
        "id": f"N-COMP-{new_id}",
        "timestamp": timestamp,
        "category": "Citizen Complaint",
        "title": f"New {complaint['priority']} Complaint Registered",
        "message": f"[{complaint['category']}] \"{complaint['title']}\" at {complaint['location']}. Assigned to {complaint['department']}.",
        "read": False
    })

    state["complaints"].insert(0, complaint)
    await broadcast("complaint:created", complaint)
    return {"success": True, "complaint": complaint}
