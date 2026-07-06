import base64
import random
import re
from datetime import datetime
from fastapi import APIRouter, HTTPException
from ..schemas import RagSettingsIn, RagToggleIn, RagUploadIn, RagSearchIn, RagChatIn
from ..ai.rag_store import (
    get_documents,
    toggle_document,
    delete_document,
    get_settings,
    update_settings,
    add_document_and_chunks,
    search_store,
    get_embedding_py,
    split_text_py
)
from ..ai.rag_extractor import extract_text_from_bytes
from ..ai.rag_compressor import compress_context, generate_rag_answer

router = APIRouter()

@router.get("/api/rag/documents")
async def get_rag_documents():
    docs = get_documents()
    return {"documents": docs}

@router.post("/api/rag/documents/toggle")
async def toggle_rag_document(payload: RagToggleIn):
    success = toggle_document(payload.id)
    docs = get_documents()
    return {"success": success, "documents": docs}

@router.delete("/api/rag/documents/{doc_id}")
async def delete_rag_document(doc_id: str):
    success = delete_document(doc_id)
    docs = get_documents()
    return {"success": success, "documents": docs}

@router.get("/api/rag/settings")
async def get_rag_settings():
    settings = get_settings()
    return {"settings": settings}

@router.post("/api/rag/settings")
async def update_rag_settings(payload: RagSettingsIn):
    update_settings(payload.chunkSize, payload.chunkOverlap, payload.alpha, payload.searchLimit)
    settings = get_settings()
    return {"success": True, "settings": settings}

@router.post("/api/rag/upload")
async def upload_rag_document(payload: RagUploadIn):
    try:
        file_bytes = base64.b64decode(payload.fileContent)
        mime_type = "application/pdf" if payload.filename.endswith(".pdf") else "text/plain"
        if payload.filename.endswith(".docx"):
            mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif payload.filename.endswith(".csv"):
            mime_type = "text/csv"
        elif payload.filename.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            mime_type = "image/png" if payload.filename.lower().endswith(".png") else "image/jpeg"

        # 1. Parse and extract text using our extractor
        raw_text = await extract_text_from_bytes(file_bytes, payload.filename, mime_type)

        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract readable text from this file.")

        settings = get_settings()
        doc_id = f"doc_{int(datetime.now().timestamp())}_{random.randint(1000, 9999)}"
        
        # 2. Chunk text
        text_chunks = split_text_py(raw_text, settings["chunkSize"], settings["chunkOverlap"])
        
        # 3. Create document record
        new_doc = {
            "id": doc_id,
            "filename": payload.filename,
            "fileSize": len(file_bytes),
            "mimeType": mime_type,
            "uploadTime": datetime.now().isoformat(),
            "chunkCount": len(text_chunks),
            "active": True,
            "category": payload.category or "General"
        }
        
        # 4. Generate embeddings and construct chunks
        chunks = []
        for idx, text in enumerate(text_chunks):
            vector = await get_embedding_py(text)
            chunks.append({
                "id": f"{doc_id}_chunk_{idx}",
                "docId": doc_id,
                "filename": payload.filename,
                "text": text,
                "vector": vector,
                "index": idx,
                "category": payload.category or "General",
                "wordCount": len(text.split())
            })
            
        # 5. Save to database transactionally
        add_document_and_chunks(new_doc, chunks)

        # 6. GCP Integration (backup uploads to GCS)
        from ..gcp import upload_blob_to_gcs, is_gcp_active
        from ..config import settings
        if is_gcp_active() and settings.GCS_BUCKET_NAME:
            import tempfile
            try:
                # Write to temp file
                with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(payload.filename)[1]) as temp_f:
                    temp_f.write(file_bytes)
                    temp_f_path = temp_f.name
                
                # Upload to GCS
                upload_blob_to_gcs(settings.GCS_BUCKET_NAME, temp_f_path, f"rag-docs/{doc_id}/{payload.filename}")
                
                # Clean up
                os.remove(temp_f_path)
            except Exception as upload_err:
                # Log but do not fail the upload request
                logger.error(f"Failed to backup RAG document upload to GCS: {upload_err}")

        docs = get_documents()
        return {"success": True, "document": new_doc, "documents": docs}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to index document: {str(e)}")

@router.post("/api/rag/search")
async def search_rag_documents(payload: RagSearchIn):
    results = await search_store(payload.query, payload.limit)
    return {"results": results}

@router.post("/api/rag/chat")
async def chat_rag_documents(payload: RagChatIn):
    results = await search_store(payload.message)
    if not results:
        return {
            "answer": "No active RAG documents are indexed. Please upload SOPs or guidelines first.",
            "retrievedChunks": [],
            "citations": []
        }
        
    # 1. Compress context
    context_block = compress_context(results)
    
    # 2. Query Gemini
    history_list = [h.model_dump() if hasattr(h, "model_dump") else h for h in payload.history]
    answer_text = await generate_rag_answer(payload.message, context_block, history_list)
    
    # 3. Extract bracketed citations matching source chunk indices
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
