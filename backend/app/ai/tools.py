import json
import logging
from ..database import state
from .rag_store import get_relevant_sop_context

logger = logging.getLogger("CommunityOS.AgentTools")

def query_telemetry_state(dataset: str) -> str:
    """
    Queries the current smart city telemetry state for a specific dataset.
    Available datasets: 'traffic', 'weather', 'airQuality', 'power', 'water', 'hospital', 'emergency', 'complaints', 'citizenFeedback'
    """
    logger.info(f"[Tool Calling] query_telemetry_state invoked for dataset: {dataset}")
    data = state.get(dataset, [])
    # Return last 5 elements to keep context window manageable
    subset = data[-5:] if isinstance(data, list) else data
    return json.dumps(subset, ensure_ascii=False)

def query_sop_rules(query: str) -> str:
    """
    Queries the Municipal Standard Operating Procedures (SOP) vector database and returns relevant policies.
    """
    logger.info(f"[Tool Calling] query_sop_rules invoked for query: {query}")
    return get_relevant_sop_context(query)

# Registry list for easy tool allocation
domain_tools = [query_telemetry_state, query_sop_rules]
