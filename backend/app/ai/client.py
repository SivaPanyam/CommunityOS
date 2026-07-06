import os
import logging
from google import genai
from ..config import settings

logger = logging.getLogger("CommunityOS.AIClient")

ai_client = None

# Prioritize Vertex AI for production/gcloud-authenticated environments
project_id = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT")
if project_id:
    try:
        # Initializing Vertex AI Gemini Client using Application Default Credentials (ADC)
        ai_client = genai.Client(vertex=True, project=project_id, location="us-central1")
        logger.info(f"Vertex AI Client initialized successfully using project: {project_id}")
    except Exception as e:
        logger.error(f"Failed to initialize Vertex AI client: {e}")

# Fallback to AI Studio if GEMINI_API_KEY is configured and Vertex AI could not be initialized
if ai_client is None and settings.GEMINI_API_KEY:
    try:
        ai_client = genai.Client(api_key=settings.GEMINI_API_KEY)
        logger.info("Gemini AI Studio Client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Gemini AI Studio Client: {e}")

if ai_client is None:
    logger.warning("WARNING: Neither Vertex AI nor GEMINI_API_KEY is available. AI features will run in simulation mode.")
