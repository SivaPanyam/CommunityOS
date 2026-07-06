import os
import csv
import json
import random
import asyncio
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load local environment variables from .env if present
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CommunityOS")

app = FastAPI(
    title="CommunityOS API",
    description="Full-stack FastAPI backend for the AI-powered Decision Intelligence Platform",
    version="1.2.0"
)

# Enable CORS for local cross-origin development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini SDK
gemini_api_key = os.getenv("GEMINI_API_KEY")
ai_client = None
if gemini_api_key:
    ai_client = genai.Client(api_key=gemini_api_key)
    logger.info("Gemini official Python GenAI Client initialized successfully.")
else:
    logger.warning("WARNING: GEMINI_API_KEY is not defined. AI features will run in simulation mode.")

# In-Memory Smart City Database State
state: Dict[str, List[Dict[str, Any]]] = {
    "traffic": [],
    "weather": [],
    "airQuality": [],
    "complaints": [],
    "power": [],
    "water": [],
    "hospital": [],
    "emergency": [],
    "citizenFeedback": [],
    "notifications": [
        {
            "id": "N-1",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "category": "Emergency",
            "title": "Traffic Signal Priority Automated",
            "message": "Emergency priority route optimized on Downtown Expressway Exit 2 for rescue operations.",
            "read": False,
        },
        {
            "id": "N-2",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "category": "Environment",
            "title": "Flash Flood Warning Logged",
            "message": "AI alert triggered for Metro Bridge Underpass as current rainfall exceeds SOP limit of 10mm/hr.",
            "read": False,
        }
    ],
    "approvedActions": []
}

# Helper to read and parse local CSV mocks
def parse_csv_file(file_path: str) -> List[Dict[str, Any]]:
    results = []
    if not os.path.exists(file_path):
        return results
    try:
        with open(file_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                parsed_row = {}
                for k, v in row.items():
                    k = k.strip()
                    v = v.strip() if v else ""
                    # Try numeric conversions
                    if v == "":
                        parsed_row[k] = None
                    elif v.lower() == "true":
                        parsed_row[k] = True
                    elif v.lower() == "false":
                        parsed_row[k] = False
                    else:
                        try:
                            if "." in v:
                                parsed_row[k] = float(v)
                            else:
                                parsed_row[k] = int(v)
                        except ValueError:
                            parsed_row[k] = v
                results.append(parsed_row)
    except Exception as e:
        logger.error(f"Error reading CSV {file_path}: {e}")
    return results

def load_datasets():
    base_dir = os.path.abspath(os.path.dirname(__file__))
    data_dir = os.path.join(base_dir, "src", "data", "mock")
    if os.path.exists(data_dir):
        state["traffic"] = parse_csv_file(os.path.join(data_dir, "traffic.csv"))
        state["weather"] = parse_csv_file(os.path.join(data_dir, "weather.csv"))
        state["airQuality"] = parse_csv_file(os.path.join(data_dir, "air_quality.csv"))
        state["complaints"] = parse_csv_file(os.path.join(data_dir, "complaints.csv"))
        state["power"] = parse_csv_file(os.path.join(data_dir, "power.csv"))
        state["water"] = parse_csv_file(os.path.join(data_dir, "water.csv"))
        state["hospital"] = parse_csv_file(os.path.join(data_dir, "hospital.csv"))
        state["emergency"] = parse_csv_file(os.path.join(data_dir, "emergency.csv"))
        state["citizenFeedback"] = parse_csv_file(os.path.join(data_dir, "citizen_feedback.csv"))
        logger.info("Mock CSV datasets successfully loaded into Python memory.")
    else:
        logger.error(f"Data directory {data_dir} not found. Running with basic fallbacks.")

load_datasets()

# WebSocket connections tracking
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

# RAG standard operating procedures lookup
def get_relevant_sop_context(prompt: str) -> str:
    try:
        db = load_rag_db()
        docs = db.get("documents", [])
        chunks = db.get("chunks", [])
        active_doc_ids = {d["id"] for d in docs if d.get("active", True)}
        active_chunks = [c for c in chunks if c["docId"] in active_doc_ids]
        sop_text = ""

        if active_chunks:
            # High-precision word overlap matching on active indexed chunks
            query_tokens = prompt.lower().split()
            scored_chunks = []
            for chunk in active_chunks:
                matches = sum(1 for t in query_tokens if len(t) > 3 and t in chunk["text"].lower())
                if matches > 0:
                    scored_chunks.append((chunk, matches))
            
            scored_chunks.sort(key=lambda x: x[1], reverse=True)
            top_chunks = scored_chunks[:3]
            
            if top_chunks:
                for chunk, score in top_chunks:
                    sop_text += f"\n--- SOP Reference: {chunk['filename']} (chunk {chunk['index']}) ---\n{chunk['text']}\n"
                return sop_text

        # Fallback to reading raw files in src/data/rag
        base_dir = os.path.abspath(os.path.dirname(__file__))
        rag_dir = os.path.join(base_dir, "src", "data", "rag")
        if os.path.exists(rag_dir):
            keywords = prompt.lower().split()
            for filename in os.listdir(rag_dir):
                if filename.endswith(".md"):
                    with open(os.path.join(rag_dir, filename), "r", encoding="utf-8") as f:
                        content = f.read()
                        has_overlap = any(len(kw) > 3 and kw in content.lower() for kw in keywords)
                        if has_overlap:
                            sop_text += f"\n--- Municipal Policy Document: {filename} ---\n{content}\n"
        return sop_text if sop_text else "No matching municipal SOPs found. Standard smart community rules apply."
    except Exception as e:
        logger.error(f"Error reading RAG files: {e}")
        return "Error querying SOP guidelines database."

# API Endpoints
@app.get("/api/data/all")
async def get_all_data():
    last_traffic = next((t for t in reversed(state["traffic"]) if t.get("location") == "Downtown Expressway"), {
        "congestion_index": 0.58, "average_speed_kmh": 42, "vehicle_count": 1680
    })
    last_weather = state["weather"][-1] if state["weather"] else {
        "temperature_c": 24.0, "humidity_pct": 82, "rainfall_mm": 5.5, "condition": "Rain", "warnings": "Flood Advisory"
    }
    last_aqi = next((a for a in reversed(state["airQuality"]) if a.get("location") == "Downtown"), {
        "aqi": 75, "risk_status": "Moderate"
    })
    
    total_beds = sum(h.get("total_beds", 0) or 0 for h in state["hospital"]) or 820
    occupied_beds = sum(h.get("occupied_beds", 0) or 0 for h in state["hospital"]) or 620
    active_power = sum(p.get("demand_mw", 0) or 0 for p in state["power"][-3:]) or 450
    active_water = next((w.get("reservoir_level_pct", 78.8) for w in state["water"] if w.get("facility") == "Main Reservoir"), 78.8)

    stats = {
        "trafficIndex": last_traffic.get("congestion_index", 0.58),
        "averageSpeed": last_traffic.get("average_speed_kmh", 42),
        "vehicleCount": last_traffic.get("vehicle_count", 1680),
        "weather": last_weather,
        "aqi": last_aqi.get("aqi", 75),
        "aqiStatus": last_aqi.get("risk_status", "Moderate"),
        "hospitalOccupancy": round((occupied_beds / total_beds) * 100) if total_beds else 75,
        "activePowerMW": active_power,
        "reservoirLevelPct": active_water,
        "unresolvedComplaintsCount": len([c for c in state["complaints"] if c.get("status") != "Resolved"]),
        "activeEmergenciesCount": len([e for e in state["emergency"] if e.get("status") != "Resolved"]),
        "recentDecisions": state["approvedActions"][:5],
        "notifications": state["notifications"]
    }

    return {
        "stats": stats,
        "traffic": state["traffic"],
        "weather": state["weather"],
        "airQuality": state["airQuality"],
        "complaints": state["complaints"],
        "power": state["power"],
        "water": state["water"],
        "hospital": state["hospital"],
        "emergency": state["emergency"],
        "citizenFeedback": state["citizenFeedback"]
    }

# Health Check Endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat() + "Z"}

# CSV Download Endpoint
@app.get("/api/download/{dataset}")
async def download_dataset(dataset: str):
    if dataset not in state:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    rows = state[dataset]
    if not rows:
        return StreamingResponse(iter([""]), media_type="text/csv")
        
    headers = list(rows[0].keys())
    
    def csv_generator():
        yield ",".join(headers) + "\n"
        for r in rows:
            line_vals = []
            for h in headers:
                val = r.get(h, "")
                val_str = str(val) if val is not None else ""
                if "," in val_str or '"' in val_str or "\n" in val_str:
                    val_str = f'"{val_str.replace(\'"\', \'""\')}"'
                line_vals.append(val_str)
            yield ",".join(line_vals) + "\n"

    headers_disp = {
        "Content-Disposition": f"attachment; filename=communityos_{dataset}.csv"
    }
    return StreamingResponse(csv_generator(), media_type="text/csv", headers=headers_disp)

class ComplaintIn(BaseModel):
    title: str
    description: str
    location: str
    imageUrl: Optional[str] = None

@app.post("/api/complaints")
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

    # Gemini AI classification
    if ai_client:
        try:
            prompt = f"""Analyze this citizen complaint for a smart city OS:
            Title: "{payload.title}"
            Description: "{payload.description}"
            Location: "{payload.location}"
            
            Respond in structured JSON matching this schema:
            {{
              "category": "Urban Mobility" | "Water & Utilities" | "Electrical & Power" | "Waste Management" | "Forestry & Parks" | "Public Safety" | "Healthcare",
              "priority": "Low" | "Medium" | "High" | "Critical",
              "department": string,
              "suggested_action": string
            }}"""

            response = ai_client.models.generate_content(
                model="gemini-3.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "category": types.Schema(type=types.Type.STRING),
                            "priority": types.Schema(type=types.Type.STRING),
                            "department": types.Schema(type=types.Type.STRING),
                            "suggested_action": types.Schema(type=types.Type.STRING),
                        },
                        required=["category", "priority", "department", "suggested_action"]
                    )
                )
            )

            result = json.loads(response.text.strip())
            complaint.update({
                "category": result.get("category", "Uncategorized"),
                "priority": result.get("priority", "Medium"),
                "department": result.get("department", "Citizen Relations"),
                "suggested_action": result.get("suggested_action", "Dispatch inspector to assess incident site.")
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
        except Exception as e:
            logger.error(f"Gemini classification failed, using defaults: {e}")
            complaint["category"] = "Public Safety"
            complaint["suggested_action"] = "Dispatch inspector to assess incident site."
    else:
        # Static Simulation
        complaint.update({
            "category": "Waste Management",
            "priority": "Low",
            "department": "Sanitation Division",
            "suggested_action": "Schedule routine sweep of specified address."
        })

    state["complaints"].insert(0, complaint)
    await broadcast("complaint:created", complaint)
    return {"success": True, "complaint": complaint}

class ActionApprovalIn(BaseModel):
    actionId: str
    actionTitle: str
    department: Optional[str] = "Command Center"
    sector: Optional[str] = "General"
    impactMetric: Optional[str] = "Automated System Optimization"

@app.post("/api/workflows/approve")
async def approve_workflow(payload: ActionApprovalIn):
    dispatch_id = f"DISPATCH-2026-{random.randint(1000, 9999)}"
    timestamp = datetime.utcnow().isoformat() + "Z"

    report = f"""========================================================================
MUNICIPAL COMMUNITYOS AUTOMATION ENGINE - DISPATCH REPORT
========================================================================
Dispatch Reference ID : {dispatch_id}
Authorization Time    : {timestamp}
Responsible Agency   : {payload.department}
Target Sector         : {payload.sector}
Execution Standard    : SOP-SYS-AUTO-2026-ALPHA

Incident Details:
------------------------------------------------------------------------
Approved Directive    : {payload.actionTitle}
Operational Impact    : {payload.impactMetric}
Execution Mode        : Autonomous Cloud Run Workflow Broker

RESOURCE DISTRIBUTION & LOGISTICS ROUTING:
- Telemetry dispatch trigger pushed to relevant field division.
- Real-time GPS coordinate telemetry linked.
- System state updated in CommunityOS Central Database.
- Audit entry finalized in municipal logs.

========================================================================
AUTHENTICATED DIRECTIVE SIGNED: CENTRAL DECISION INTELLIGENCE AGENT
========================================================================"""

    approved_item = {
        "id": payload.actionId,
        "dispatchId": dispatch_id,
        "timestamp": timestamp,
        "title": payload.actionTitle,
        "department": payload.department,
        "sector": payload.sector,
        "status": "Dispatched",
        "report": report
    }

    state["approvedActions"].insert(0, approved_item)

    # Simulated state mutations
    title_lower = payload.actionTitle.lower()
    if "ambulance" in title_lower or "expressway" in title_lower:
        for e in state["emergency"]:
            if "Expressway" in e.get("location", ""):
                e["status"] = "Responding"
                e["responding_units"] = "3 Ambulances; 2 Police Highway Patrols"

    if "pothole" in title_lower or "asphalt" in title_lower:
        for c in state["complaints"]:
            if "pothole" in c.get("title", "").lower():
                c["status"] = "In Progress"

    if "water valve" in title_lower or "leak" in title_lower:
        for c in state["complaints"]:
            if "leak" in c.get("title", "").lower():
                c["status"] = "Resolved"
        for w in state["water"]:
            if w.get("facility") == "Main Reservoir":
                w["leak_rate_lps"] = max(0.0, w.get("leak_rate_lps", 15.0) - 5.0)
                w["status"] = "Normal"

    # Push Notification
    state["notifications"].insert(0, {
        "id": f"N-WF-{dispatch_id}",
        "timestamp": timestamp,
        "category": "Workflow Automation",
        "title": f"Action Approved: {payload.actionTitle}",
        "message": f"Municipal workflow initiated under {dispatch_id}. Responsible: {payload.department}.",
        "read": False
    })

    await broadcast("workflow:approved", approved_item)
    return {"success": True, "approvedItem": approved_item}

# ==========================================
# RAG Helper Classes and Methods in Python
# ==========================================

import base64
import math
import re

DB_FILE = os.path.join("src", "data", "rag_vector_db.json")
UPLOADS_DIR = os.path.join("src", "data", "rag_uploads")

def load_rag_db():
    if not os.path.exists(UPLOADS_DIR):
        os.makedirs(UPLOADS_DIR, exist_ok=True)
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading RAG DB: {e}")
    return {"documents": [], "chunks": [], "settings": {"chunkSize": 600, "chunkOverlap": 100, "alpha": 0.7, "searchLimit": 5}}

def save_rag_db(db):
    if not os.path.exists(UPLOADS_DIR):
        os.makedirs(UPLOADS_DIR, exist_ok=True)
    try:
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error saving RAG DB: {e}")

def cosine_similarity(v1, v2):
    if len(v1) != len(v2):
        return 0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_a = sum(a * a for a in v1)
    norm_b = sum(b * b for b in v2)
    if norm_a == 0 or norm_b == 0:
        return 0
    return dot_product / (math.sqrt(norm_a) * math.sqrt(norm_b))

def split_text_py(text, chunk_size, overlap):
    if not text:
        return []
    chunks = []
    i = 0
    while i < len(text):
        chunk = text[i:i+chunk_size]
        chunks.append(chunk)
        i += chunk_size - overlap
        if chunk_size - overlap <= 0:
            break
    return chunks

async def get_embedding_py(text: str) -> List[float]:
    if not ai_client:
        # Deterministic dummy vector
        vector = []
        for i in range(768):
            h = 0
            for char in text:
                h = ord(char) + ((h << 5) - h)
            vector.append(math.sin(h + i) * 0.1)
        return vector
    try:
        response = ai_client.models.embed_content(
            model="gemini-embedding-2-preview",
            contents=[text]
        )
        if response.embeddings and response.embeddings[0] and response.embeddings[0].values:
            return response.embeddings[0].values
    except Exception as e:
        logger.error(f"Embedding API error, falling back: {e}")
    # Fallback deterministic vector
    vector = []
    for i in range(768):
        vector.append(math.sin(len(text) + i) * 0.1)
    return vector

class RagSettingsIn(BaseModel):
    chunkSize: int
    chunkOverlap: int
    alpha: float
    searchLimit: int

class RagToggleIn(BaseModel):
    id: str

class RagUploadIn(BaseModel):
    filename: str
    fileContent: str  # Base64
    category: Optional[str] = "General"

class RagSearchIn(BaseModel):
    query: str
    limit: Optional[int] = None

class RagChatIn(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []

@app.get("/api/rag/documents")
async def get_rag_documents():
    db = load_rag_db()
    return {"documents": db.get("documents", [])}

@app.post("/api/rag/documents/toggle")
async def toggle_rag_document(payload: RagToggleIn):
    db = load_rag_db()
    docs = db.get("documents", [])
    found = False
    for doc in docs:
        if doc["id"] == payload.id:
            doc["active"] = not doc["active"]
            found = True
            break
    if found:
        save_rag_db(db)
    return {"success": found, "documents": docs}

@app.delete("/api/rag/documents/{doc_id}")
async def delete_rag_document(doc_id: str):
    db = load_rag_db()
    docs = db.get("documents", [])
    chunks = db.get("chunks", [])
    
    new_docs = [d for d in docs if d["id"] != doc_id]
    new_chunks = [c for c in chunks if c["docId"] != doc_id]
    
    db["documents"] = new_docs
    db["chunks"] = new_chunks
    save_rag_db(db)
    return {"success": len(new_docs) < len(docs), "documents": new_docs}

@app.get("/api/rag/settings")
async def get_rag_settings():
    db = load_rag_db()
    return {"settings": db.get("settings", {"chunkSize": 600, "chunkOverlap": 100, "alpha": 0.7, "searchLimit": 5})}

@app.post("/api/rag/settings")
async def update_rag_settings(payload: RagSettingsIn):
    db = load_rag_db()
    db["settings"] = payload.model_dump()
    save_rag_db(db)
    return {"success": True, "settings": db["settings"]}

@app.post("/api/rag/upload")
async def upload_rag_document(payload: RagUploadIn):
    try:
        file_bytes = base64.b64decode(payload.fileContent)
        try:
            raw_text = file_bytes.decode("utf-8")
        except Exception:
            raw_text = "".join(chr(b) if 32 <= b <= 126 or b in (10, 13) else " " for b in file_bytes)
            raw_text = " ".join(raw_text.split())

        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract readable text from this file.")

        db = load_rag_db()
        settings = db.get("settings", {"chunkSize": 600, "chunkOverlap": 100, "alpha": 0.7, "searchLimit": 5})
        
        doc_id = f"doc_{int(datetime.now().timestamp())}_{random.randint(1000, 9999)}"
        
        text_chunks = split_text_py(raw_text, settings.get("chunkSize", 600), settings.get("chunkOverlap", 100))
        
        saved_path = os.path.join(UPLOADS_DIR, f"{doc_id}_{payload.filename}")
        with open(saved_path, "wb") as f:
            f.write(file_bytes)

        new_doc = {
            "id": doc_id,
            "filename": payload.filename,
            "fileSize": len(file_bytes),
            "mimeType": "application/pdf" if payload.filename.endswith(".pdf") else "text/plain",
            "uploadTime": datetime.now().isoformat(),
            "chunkCount": len(text_chunks),
            "active": True,
            "category": payload.category or "General"
        }
        
        db.setdefault("documents", []).append(new_doc)
        
        for idx, text in enumerate(text_chunks):
            vector = await get_embedding_py(text)
            new_chunk = {
                "id": f"{doc_id}_chunk_{idx}",
                "docId": doc_id,
                "filename": payload.filename,
                "text": text,
                "vector": vector,
                "index": idx,
                "category": payload.category or "General",
                "wordCount": len(text.split())
            }
            db.setdefault("chunks", []).append(new_chunk)
            
        save_rag_db(db)
        return {"success": True, "document": new_doc, "documents": db["documents"]}
    except Exception as e:
        logger.error(f"RAG upload failed in python: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to index document: {str(e)}")

@app.post("/api/rag/search")
async def search_rag_documents(payload: RagSearchIn):
    db = load_rag_db()
    chunks = db.get("chunks", [])
    docs = db.get("documents", [])
    settings = db.get("settings", {"chunkSize": 600, "chunkOverlap": 100, "alpha": 0.7, "searchLimit": 5})
    
    active_doc_ids = {d["id"] for d in docs if d.get("active", True)}
    active_chunks = [c for c in chunks if c["docId"] in active_doc_ids]
    
    if not active_chunks:
        return {"results": []}
        
    query_vector = await get_embedding_py(payload.query)
    
    scored_results = []
    query_tokens = payload.query.lower().split()
    
    for chunk in active_chunks:
        semantic_score = cosine_similarity(query_vector, chunk["vector"])
        matches = 0
        text_lower = chunk["text"].lower()
        for token in query_tokens:
            if len(token) > 2 and token in text_lower:
                matches += 1
        keyword_score = matches / len(query_tokens) if query_tokens else 0
        
        alpha = settings.get("alpha", 0.7)
        combined_score = alpha * semantic_score + (1.0 - alpha) * keyword_score
        
        scored_results.append({
            "chunk": chunk,
            "score": combined_score,
            "semanticScore": semantic_score,
            "keywordScore": keyword_score
        })
        
    scored_results.sort(key=lambda x: x["score"], reverse=True)
    limit = payload.limit or settings.get("searchLimit", 5)
    
    formatted_results = []
    for r in scored_results[:limit]:
        formatted_results.append({
            "chunk": {
                "id": r["chunk"]["id"],
                "docId": r["chunk"]["docId"],
                "filename": r["chunk"]["filename"],
                "text": r["chunk"]["text"],
                "index": r["chunk"]["index"],
                "category": r["chunk"]["category"],
                "wordCount": r["chunk"]["wordCount"]
            },
            "score": r["score"],
            "semanticScore": r["semanticScore"],
            "keywordScore": r["keywordScore"]
        })
        
    return {"results": formatted_results}

@app.post("/api/rag/chat")
async def chat_rag_documents(payload: RagChatIn):
    db = load_rag_db()
    docs = db.get("documents", [])
    chunks = db.get("chunks", [])
    settings = db.get("settings", {"chunkSize": 600, "chunkOverlap": 100, "alpha": 0.7, "searchLimit": 5})
    
    active_doc_ids = {d["id"] for d in docs if d.get("active", True)}
    active_chunks = [c for c in chunks if c["docId"] in active_doc_ids]
    
    if not active_chunks:
        return {
            "answer": "No active RAG documents are indexed. Please upload SOPs or guidelines first.",
            "retrievedChunks": [],
            "citations": []
        }
        
    search_payload = RagSearchIn(query=payload.message)
    search_results = await search_rag_documents(search_payload)
    results = search_results["results"]
    
    if not results:
        return {
            "answer": "I apologize, but no relevant content was found in the uploaded documents.",
            "retrievedChunks": [],
            "citations": []
        }
        
    context_block = "--- START OF UPLOADED DOCUMENTS CONTEXT ---\n"
    for idx, r in enumerate(results):
        context_block += f"\n[Document {idx + 1}: \"{r['chunk']['filename']}\" (chunk {r['chunk']['index']})]\n"
        context_block += f"{r['chunk']['text']}\n"
    context_block += "--- END OF UPLOADED DOCUMENTS CONTEXT ---"
    
    system_instruction = (
        "You are CommunityOS's Expert AI Policy Analyst.\n"
        "Your task is to analyze municipal guidelines, disaster responses, standard operating procedures (SOPs), and urban safety documents.\n\n"
        "CRITICAL CONSTRAINT: You must answer the user's query using ONLY the provided 'UPLOADED DOCUMENTS CONTEXT'.\n"
        "- Do NOT use your own external general knowledge to answer questions if they contradict or are not mentioned in the context.\n"
        "- If the answer cannot be found or reasonably inferred from the provided document context, state exactly: "
        "'I apologize, but the uploaded municipal SOP documents do not contain information to resolve this query.'\n"
        "- Be professional, technical, and objective.\n\n"
        "CITATION MANDATE: You MUST cite your statements using bracketed citation markers corresponding to the document index.\n"
        "For example: 'If rainfall exceeds 10mm/hr, emergency alerts should be dispatched to the reservoir operator [1]. Traffic blocks on exit 2 should trigger signal priorities [2].'\n"
        "Never make up a citation that does not exist in the context."
    )
    
    user_prompt_with_context = f"Query: \"{payload.message}\"\n\n{context_block}\n\nPlease provide your expert answer based strictly on the document context above, citing all sources correctly."
    
    answer_text = ""
    if not ai_client:
        answer_text = f"[Simulated Python RAG] Based on SOP document \"{results[0]['chunk']['filename']}\", standard operating triggers activate during high telemetry values. Section 2.1 prescribes automatic alert broadcasts [1]."
    else:
        try:
            contents = []
            for h in payload.history:
                contents.append(types.Content(
                    role="user" if h["role"] == "user" else "model",
                    parts=[types.Part.from_text(text=h["text"])]
                ))
            contents.append(types.Content(
                role="user",
                parts=[types.Part.from_text(text=user_prompt_with_context)]
            ))
            
            response = ai_client.models.generate_content(
                model="gemini-3.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.1
                )
            )
            answer_text = response.text or "No response generated."
        except Exception as e:
            logger.error(f"RAG Gemini prompt failed in python: {e}")
            answer_text = "An error occurred during Gemini RAG query orchestration."
            
    citation_matches = re.findall(r"\[(\d+)\]", answer_text)
    unique_indexes = sorted(list(set(int(idx) for idx in citation_matches)))
    
    citations = []
    for idx in unique_indexes:
        if 1 <= idx <= len(results):
            r = results[idx - 1]
            citations.append({
                "index": idx,
                "filename": r["chunk"]["filename"],
                "text": r["chunk"]["text"][:200] + "..."
            })
            
    return {
        "answer": answer_text,
        "retrievedChunks": [r["chunk"] for r in results],
        "citations": citations
    }

class ChatIn(BaseModel):
    message: str
    agent: Optional[str] = "Decision Agent"
    history: Optional[List[Dict[str, str]]] = []

@app.post("/api/chat")
async def chat(payload: ChatIn):
    sop_context = get_relevant_sop_context(payload.message)

    summary_telemetry = {
        "active_complaints_count": len([c for c in state["complaints"] if c.get("status") != "Resolved"]),
        "active_emergencies_count": len([e for e in state["emergency"] if e.get("status") != "Resolved"]),
        "recent_emergency": next((e for e in state["emergency"] if e.get("status") != "Resolved"), None),
        "traffic_congestion": state["traffic"][-3:],
        "weather": state["weather"][-2:],
        "air_quality": state["airQuality"][-2:],
        "hospital_capacity": state["hospital"][-2:],
        "power_grids": state["power"][-2:],
        "water_reservoirs": state["water"][-2:]
    }

    agent_instructions = ""
    if payload.agent == "Traffic Agent":
        agent_instructions = "You are the Traffic Agent of CommunityOS. Your domain is urban mobility, congestion forecasting, road safety, signal timing, and public transit routing."
    elif payload.agent == "Environment Agent":
        agent_instructions = "You are the Environment Agent of CommunityOS. Your domain is meteorological monitoring, AQI sensing, flood modeling, and carbon reporting."
    elif payload.agent == "Citizen Agent":
        agent_instructions = "You are the Citizen Agent of CommunityOS. Your domain is public relation audits, incoming complaint triaging, public sentiment, and street-level repairs."
    elif payload.agent == "Healthcare Agent":
        agent_instructions = "You are the Healthcare Agent of CommunityOS. Your domain is hospital waiting times, medical inventory, bed availability, and surge predictions."
    elif payload.agent == "Emergency Agent":
        agent_instructions = "You are the Emergency Agent of CommunityOS. Your domain is rapid rescue dispatches, fire block containment, and hazardous zone mapping."
    elif payload.agent == "Resource Agent":
        agent_instructions = "You are the Resource Agent of CommunityOS. Your domain is resource optimization, power load-balancing, water grid leak mitigation, and logistics scheduling."
    else:
        agent_instructions = "You are the Master Decision Agent of CommunityOS. You synthesize insights from all domain agents (Traffic, Environment, Citizen, Healthcare, Resource, and Emergency) to optimize city operations."

    system_prompt = f"""
    {agent_instructions}
    
    You are thinking like a senior smart-city administrator and crisis commander.
    You MUST base your calculations on the following actual city telemetry state:
    {json.dumps(summary_telemetry, indent=2)}
    
    You MUST adhere to and cite the following Municipal Standard Operating Procedures (SOP) where relevant:
    {sop_context}

    Return your intelligence analysis as a structured, complete JSON object. Ensure no empty strings or placeholders are present.
    
    Your response JSON MUST follow this exact schema:
    {{
      "summary": "Clear, direct, polished 2-3 sentence overview of the current domain status.",
      "evidence": "Bullet points citing specific metrics from the telemetry data.",
      "predictions": "Forecasted concerns for the next 12 to 24 hours.",
      "recommendations": [
        "Recommended action bullet point 1",
        "Recommended action bullet point 2"
      ],
      "confidenceScore": 95,
      "affectedAreas": ["Downtown Core", "Metro Bridge Underpass"],
      "responsibleDepartments": ["Department of Transportation", "Emergency Management Agency"],
      "priority": "Critical" | "High" | "Medium" | "Low",
      "proposedActions": [
        {{
          "id": "ACT-101",
          "title": "Optimistic Action Title",
          "description": "Short, actionable description of what this automated workflow will execute.",
          "targetSector": "Urban Mobility",
          "impactMetric": "Reduces bottleneck queues by 15%",
          "automatedWorkflow": true
        }}
      ]
    }}
    """

    if ai_client:
        try:
            # Format chat history
            contents = []
            for h in payload.history:
                contents.append(
                    types.Content(
                        role="user" if h.get("role") == "user" else "model",
                        parts=[types.Part.from_text(text=h.get("text", ""))]
                    )
                )
            contents.append(types.Content(role="user", parts=[types.Part.from_text(text=payload.message)]))

            response = ai_client.models.generate_content(
                model="gemini-3.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    response_mime_type="application/json",
                    response_schema=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "summary": types.Schema(type=types.Type.STRING),
                            "evidence": types.Schema(type=types.Type.STRING),
                            "predictions": types.Schema(type=types.Type.STRING),
                            "recommendations": types.Schema(
                                type=types.Type.ARRAY,
                                items=types.Schema(type=types.Type.STRING)
                            ),
                            "confidenceScore": types.Schema(type=types.Type.INTEGER),
                            "affectedAreas": types.Schema(
                                type=types.Type.ARRAY,
                                items=types.Schema(type=types.Type.STRING)
                            ),
                            "responsibleDepartments": types.Schema(
                                type=types.Type.ARRAY,
                                items=types.Schema(type=types.Type.STRING)
                            ),
                            "priority": types.Schema(type=types.Type.STRING),
                            "proposedActions": types.Schema(
                                type=types.Type.ARRAY,
                                items=types.Schema(
                                    type=types.Type.OBJECT,
                                    properties={
                                        "id": types.Schema(type=types.Type.STRING),
                                        "title": types.Schema(type=types.Type.STRING),
                                        "description": types.Schema(type=types.Type.STRING),
                                        "targetSector": types.Schema(type=types.Type.STRING),
                                        "impactMetric": types.Schema(type=types.Type.STRING),
                                        "automatedWorkflow": types.Schema(type=types.Type.BOOLEAN),
                                    },
                                    required=["id", "title", "description", "targetSector", "impactMetric", "automatedWorkflow"]
                                )
                            )
                        },
                        required=[
                            "summary", "evidence", "predictions", "recommendations",
                            "confidenceScore", "affectedAreas", "responsibleDepartments",
                            "priority", "proposedActions"
                        ]
                    )
                )
            )
            return json.loads(response.text.strip())
        except Exception as e:
            logger.error(f"Gemini Multi-Agent execution failed, compiling fallback response: {e}")
            raise HTTPException(status_code=500, detail="AI reasoning failed to compile correctly.")
    else:
        # Simulated fallback response
        is_emergency = any(kw in payload.message.lower() for kw in ["flood", "accident", "fire"])
        return {
            "summary": f"[Simulated Mode] Python FastAPI analyzed alert for: \"{payload.message}\". Pre-compiled patterns are guiding metrics.",
            "evidence": f"Telemetry match: Rain is {state['weather'][-1].get('rainfall_mm', 5.5)}mm/hr. Active emergency incidents count: {len(state['emergency'])}.",
            "predictions": "Pre-loaded municipal models suggest a 12% probability of local intersection congestion in the next 3 hours.",
            "recommendations": [
                "Deploy high-capacity water drainage trucks in low sectors.",
                "Divert Expressway incoming traffic blocks to outer ring corridors.",
                "Broadcast automated hazard warning to smart vehicles within a 2km radius."
            ],
            "confidenceScore": 85,
            "affectedAreas": ["Downtown Core", "Metro Bridge Corridor"],
            "responsibleDepartments": ["Emergency Management Agency" if is_emergency else "Department of Transportation"],
            "priority": "High" if is_emergency else "Medium",
            "proposedActions": [
                {
                    "id": f"PY-ACT-{random.randint(100, 999)}",
                    "title": "Automate Underpass Exit Diversion" if is_emergency else "Optimize Smart Power Grid Load",
                    "description": "Pushes remote signal instructions to mitigate secondary operational stress.",
                    "targetSector": "Emergency" if is_emergency else "Smart Utilities",
                    "impactMetric": "Mitigates vehicle delay by up to 14 minutes.",
                    "automatedWorkflow": True
                }
            ]
        }

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

# Background loop for Python telemetry simulations
async def run_telemetry_simulation():
    while True:
        await asyncio.sleep(10)
        try:
            # 1. Mutate reservoir water slightly
            for w in state["water"]:
                if w.get("facility") == "Main Reservoir":
                    w["reservoir_level_pct"] = max(0.0, min(100.0, round(w.get("reservoir_level_pct", 78.8) + random.uniform(-0.15, 0.15), 2)))

            # 2. Adjust traffic speeds slightly
            for t in state["traffic"]:
                delta = random.randint(-2, 2)
                t["average_speed_kmh"] = max(15, min(110, t.get("average_speed_kmh", 42) + delta))
                speed_pct = (t["average_speed_kmh"] - 15) / (110 - 15)
                t["congestion_index"] = max(0.1, min(0.95, round(1.0 - speed_pct, 2)))

            # 3. Fluctuate AQI
            for a in state["airQuality"]:
                delta = random.randint(-3, 3)
                a["aqi"] = max(10, min(250, a.get("aqi", 75) + delta))
                if a["aqi"] < 50:
                    a["risk_status"] = "Good"
                elif a["aqi"] < 100:
                    a["risk_status"] = "Moderate"
                else:
                    a["risk_status"] = "Unhealthy for Sensitive Groups"

            # Compute current stats
            last_traffic = next((t for t in reversed(state["traffic"]) if t.get("location") == "Downtown Expressway"), {
                "congestion_index": 0.58, "average_speed_kmh": 42, "vehicle_count": 1680
            })
            last_weather = state["weather"][-1] if state["weather"] else {
                "temperature_c": 24.0, "humidity_pct": 82, "rainfall_mm": 5.5, "condition": "Rain", "warnings": "Flood Advisory"
            }
            last_aqi = next((a for a in reversed(state["airQuality"]) if a.get("location") == "Downtown"), {
                "aqi": 75, "risk_status": "Moderate"
            })
            total_beds = sum(h.get("total_beds", 0) or 0 for h in state["hospital"]) or 820
            occupied_beds = sum(h.get("occupied_beds", 0) or 0 for h in state["hospital"]) or 620
            active_power = sum(p.get("demand_mw", 0) or 0 for p in state["power"][-3:]) or 450
            active_water = next((w.get("reservoir_level_pct", 78.8) for w in state["water"] if w.get("facility") == "Main Reservoir"), 78.8)

            stats = {
                "trafficIndex": last_traffic.get("congestion_index", 0.58),
                "averageSpeed": last_traffic.get("average_speed_kmh", 42),
                "vehicleCount": last_traffic.get("vehicle_count", 1680),
                "weather": last_weather,
                "aqi": last_aqi.get("aqi", 75),
                "aqiStatus": last_aqi.get("risk_status", "Moderate"),
                "hospitalOccupancy": round((occupied_beds / total_beds) * 100) if total_beds else 75,
                "activePowerMW": active_power,
                "reservoirLevelPct": active_water,
                "unresolvedComplaintsCount": len([c for c in state["complaints"] if c.get("status") != "Resolved"]),
                "activeEmergenciesCount": len([e for e in state["emergency"] if e.get("status") != "Resolved"]),
                "recentDecisions": state["approvedActions"][:5],
                "notifications": state["notifications"]
            }

            await broadcast("telemetry:update", {
                "stats": stats,
                "traffic": state["traffic"],
                "airQuality": state["airQuality"],
                "water": state["water"],
                "complaints": state["complaints"],
                "emergency": state["emergency"]
            })
        except Exception as e:
            logger.error(f"Error in Python background simulation telemetry loop: {e}")

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Start the simulation loop upon application startup
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(run_telemetry_simulation())

# Serve frontend static files in production if dist exists
base_dir = os.path.abspath(os.path.dirname(__file__))
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
            # Skip API and WS routes
            if full_path.startswith("api") or full_path.startswith("ws"):
                raise HTTPException(status_code=404)
            
            # Return index.html for SPA routing
            index_file = os.path.join(dist_path, "index.html")
            if os.path.exists(index_file):
                return FileResponse(index_file)
            raise HTTPException(status_code=404)
    except Exception as e:
        logger.warning(f"Static files serving initialization warning: {e}")

