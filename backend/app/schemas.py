from pydantic import BaseModel
from typing import Optional, List, Dict

class ComplaintIn(BaseModel):
    title: str
    description: str
    location: str
    imageUrl: Optional[str] = None

class ActionApprovalIn(BaseModel):
    actionId: str
    actionTitle: str
    department: Optional[str] = "Command Center"
    sector: Optional[str] = "General"
    impactMetric: Optional[str] = "Automated System Optimization"

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

class ChatIn(BaseModel):
    message: str
    agent: Optional[str] = "Decision Agent"
    history: Optional[List[Dict[str, str]]] = []
