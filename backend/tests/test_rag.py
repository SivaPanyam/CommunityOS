import pytest
from backend.app.ai.rag_store import split_text_py, add_document_and_chunks, get_documents, search_store, get_settings, update_settings

def test_split_text_py():
    text = "This is a short paragraph. This is another paragraph to test clean chunk divisions."
    chunks = split_text_py(text, chunk_size=50, overlap=10)
    assert len(chunks) > 0
    assert all(isinstance(c, str) for c in chunks)

def test_rag_settings_management():
    # Fetch base settings
    original = get_settings()
    
    # Update settings
    update_settings(chunk_size=600, chunk_overlap=80, alpha=0.45, search_limit=15)
    updated = get_settings()
    
    assert updated["chunkSize"] == 600
    assert updated["chunkOverlap"] == 80
    assert updated["alpha"] == 0.45
    assert updated["searchLimit"] == 15
    
    # Revert back to original
    update_settings(original["chunkSize"], original["chunkOverlap"], original["alpha"], original["searchLimit"])

@pytest.mark.asyncio
async def test_empty_search_fallback():
    # If query is run when database has no relevant matches
    results = await search_store("non_existent_key_string_xyz", limit=5)
    assert isinstance(results, list)
