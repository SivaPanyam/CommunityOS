from fastapi import APIRouter
from ..schemas import ChatIn
from ..ai.orchestrator import orchestrator

router = APIRouter()

@router.post("/api/chat")
async def chat(payload: ChatIn):
    history_list = [h.model_dump() if hasattr(h, "model_dump") else h for h in payload.history]
    return await orchestrator.route_and_resolve(payload.message, history_list, payload.agent)
