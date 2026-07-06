import json
import logging
from typing import List, Any
from fastapi import WebSocket

logger = logging.getLogger("CommunityOS.WSManager")

connected_sockets: List[WebSocket] = []

async def broadcast(event: str, payload: Any):
    message = json.dumps({"event": event, "payload": payload})
    disconnected = []
    for socket in connected_sockets:
        try:
            await socket.send_text(message)
        except Exception:
            disconnected.append(socket)
    for socket in disconnected:
        if socket in connected_sockets:
            connected_sockets.remove(socket)
