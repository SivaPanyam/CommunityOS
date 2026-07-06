import os
import asyncio
import logging
import random
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from .config import settings
from .database import state
from .websocket_manager import connected_sockets, broadcast
from .routes import telemetry, complaints, workflows, rag, ai
from .services.sync_scheduler import run_sync_loop

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CommunityOS.Main")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Scalable Enterprise Backend for CommunityOS Platform",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standard Health Check
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat() + "Z"}

# Include routers
app.include_router(telemetry.router)
app.include_router(complaints.router)
app.include_router(workflows.router)
app.include_router(rag.router)
app.include_router(ai.router)

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_sockets.append(websocket)
    logger.info(f"WebSocket client connected. Total connected: {len(connected_sockets)}")
    
    try:
        await websocket.send_json({
            "event": "sync",
            "payload": {
                "message": "Successfully synchronized with Python FastAPI Real-Time Pipeline.",
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        })
        while True:
            data = await websocket.receive_text()
            logger.info(f"Received WS message: {data}")
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected.")
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        if websocket in connected_sockets:
            connected_sockets.remove(websocket)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(run_sync_loop())

# Serve static files in production if dist directory exists
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
dist_path = os.path.join(base_dir, "dist")
if os.path.exists(dist_path):
    try:
        app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")
        
        @app.get("/favicon.ico", include_in_schema=False)
        async def favicon():
            fav = os.path.join(dist_path, "favicon.ico")
            if os.path.exists(fav):
                return FileResponse(fav)
            raise HTTPException(status_code=404)

        @app.get("/{full_path:path}")
        async def catch_all(full_path: str):
            if full_path.startswith("api") or full_path.startswith("ws"):
                raise HTTPException(status_code=404)
            
            index_file = os.path.join(dist_path, "index.html")
            if os.path.exists(index_file):
                return FileResponse(index_file)
            raise HTTPException(status_code=404)
    except Exception as e:
        logger.warning(f"Static files serving initialization warning: {e}")
