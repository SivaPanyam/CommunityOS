import logging
from typing import List, Dict, Any
from .client import ai_client
from google.genai import types

logger = logging.getLogger("CommunityOS.RAGCompressor")

def compress_context(retrieved_results: List[Dict[str, Any]]) -> str:
    """
    Compresses retrieved context to save context window tokens and reduce redundancy.
    - Merges adjacent chunks from the same document.
    - Removes duplicate sentences.
    """
    logger.info(f"Compressing {len(retrieved_results)} retrieved chunks...")
    
    # Group by document
    docs_chunks = {}
    for res in retrieved_results:
        chunk = res["chunk"]
        doc_name = chunk["filename"]
        docs_chunks.setdefault(doc_name, []).append(chunk)
        
    compressed_text = ""
    doc_index = 1
    
    for doc_name, chunks in docs_chunks.items():
        # Sort chunks by index to reconstruct document flow
        chunks.sort(key=lambda x: x["index"])
        
        merged_paragraphs = []
        seen_sentences = set()
        
        for chunk in chunks:
            text = chunk["text"]
            # Basic sentence split
            sentences = text.split(". ")
            for sentence in sentences:
                sentence_clean = sentence.strip()
                if not sentence_clean:
                    continue
                # Simple duplicate sentence removal to compress redundancy
                if sentence_clean.lower() not in seen_sentences:
                    seen_sentences.add(sentence_clean.lower())
                    merged_paragraphs.append(sentence_clean)
                    
        doc_content = ". ".join(merged_paragraphs)
        compressed_text += f"\n[Document {doc_index}: \"{doc_name}\"]\n{doc_content}\n"
        doc_index += 1
        
    return compressed_text

async def generate_rag_answer(
    message: str,
    context_block: str,
    history: List[Dict[str, str]],
    primary_source: str = ""
) -> str:
    """
    Calls Gemini API with the compressed context and citation guidelines to produce the answer.
    """
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
    
    user_prompt_with_context = f"Query: \"{message}\"\n\n--- START OF UPLOADED DOCUMENTS CONTEXT ---\n{context_block}\n--- END OF UPLOADED DOCUMENTS CONTEXT ---\n\nPlease provide your expert answer based strictly on the document context above, citing all sources correctly."
    
    if not ai_client:
        return f"[Simulated Python RAG] Based on SOP document context, standard emergency triggers activate when thresholds are exceeded [1]."
        
    try:
        contents = []
        # Keep only last 4 turns of history to prevent context overflow
        trimmed_history = history[-4:] if len(history) > 4 else history
        for h in trimmed_history:
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
        return response.text or "No response generated."
    except Exception as e:
        logger.error(f"Failed to generate RAG answer: {e}")
        return "An error occurred during Gemini RAG query orchestration."
