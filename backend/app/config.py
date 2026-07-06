import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    USE_PYTHON_BACKEND: str = os.getenv("USE_PYTHON_BACKEND", "true")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-key")
    PROJECT_NAME: str = "CommunityOS"
    
    # GCP Variables
    FIRESTORE_DATABASE: str = os.getenv("FIRESTORE_DATABASE", "(default)")
    GCS_BUCKET_NAME: str = os.getenv("GCS_BUCKET_NAME", "")
    PUBSUB_TOPIC: str = os.getenv("PUBSUB_TOPIC", "communityos-alerts")
    BIGQUERY_DATASET: str = os.getenv("BIGQUERY_DATASET", "")
    BIGQUERY_TABLE: str = os.getenv("BIGQUERY_TABLE", "")

    @property
    def GEMINI_API_KEY(self) -> str:
        key = os.getenv("GEMINI_API_KEY", "")
        if not key or "your_gemini_api_key" in key:
            # Fallback to Secret Manager
            from .gcp import get_secret
            secret_key = get_secret("GEMINI_API_KEY")
            if secret_key:
                return secret_key
        return key

settings = Settings()
