import os
import logging
from typing import Optional, Dict, Any

# Google Cloud SDK imports
try:
    from google.cloud import secretmanager
    from google.cloud import storage
    from google.cloud import firestore
    from google.cloud import pubsub_v1
    from google.cloud import bigquery
    import google.cloud.logging as cloud_logging
    GCP_SDK_AVAILABLE = True
except ImportError:
    GCP_SDK_AVAILABLE = False

logger = logging.getLogger("CommunityOS.GCP")

# Helper to verify GCP credentials availability
def is_gcp_active() -> bool:
    if not GCP_SDK_AVAILABLE:
        return False
    # If project ID is configured or service account path is set, consider active
    return bool(os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))

# 1. Cloud Logging Setup
def setup_cloud_logging():
    if is_gcp_active():
        try:
            client = cloud_logging.Client()
            client.setup_logging()
            logger.info("Successfully established connection to Google Cloud Logging.")
        except Exception as e:
            logger.warning(f"Failed to bootstrap Cloud Logging, falling back to stderr: {e}")

# 2. Secret Manager Integration
def get_secret(secret_id: str) -> Optional[str]:
    if not is_gcp_active():
        return None
    try:
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        if not project_id:
            return None
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
        response = client.access_secret_version(request={"name": name})
        secret_val = response.payload.data.decode("UTF-8").strip()
        logger.info(f"Retrieved secret {secret_id} from Secret Manager.")
        return secret_val
    except Exception as e:
        logger.warning(f"Could not load secret {secret_id} from Secret Manager: {e}")
        return None

# 3. Cloud Storage (GCS) Integration
def upload_blob_to_gcs(bucket_name: str, source_file_path: str, destination_blob_name: str) -> bool:
    if not is_gcp_active():
        return False
    try:
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(destination_blob_name)
        blob.upload_from_filename(source_file_path)
        logger.info(f"Uploaded file {source_file_path} to GCS bucket {bucket_name}/{destination_blob_name}")
        return True
    except Exception as e:
        logger.error(f"GCS Upload failed: {e}")
        return False

# 4. Firestore Integration
_firestore_client = None

def get_firestore_client():
    global _firestore_client
    if not is_gcp_active():
        return None
    if _firestore_client is None:
        try:
            db_id = os.getenv("FIRESTORE_DATABASE", "(default)")
            _firestore_client = firestore.Client(database=db_id)
            logger.info(f"Initialized Firestore Client targeting database: {db_id}")
        except Exception as e:
            logger.warning(f"Failed to connect to Firestore: {e}")
    return _firestore_client

def save_to_firestore(collection: str, doc_id: str, data: Dict[str, Any]) -> bool:
    client = get_firestore_client()
    if not client:
        return False
    try:
        client.collection(collection).document(doc_id).set(data)
        logger.info(f"Saved document {doc_id} to Firestore collection {collection}.")
        return True
    except Exception as e:
        logger.error(f"Firestore save error for collection {collection}: {e}")
        return False

# 5. Pub/Sub Integration
def publish_pubsub_message(topic_id: str, message: str) -> bool:
    if not is_gcp_active():
        return False
    try:
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        if not project_id:
            return False
        publisher = pubsub_v1.PublisherClient()
        topic_path = publisher.topic_path(project_id, topic_id)
        data = message.encode("utf-8")
        future = publisher.publish(topic_path, data)
        msg_id = future.result()
        logger.info(f"Published alert message to Pub/Sub topic {topic_id}. Msg ID: {msg_id}")
        return True
    except Exception as e:
        logger.error(f"Pub/Sub publication failed on topic {topic_id}: {e}")
        return False

# 6. BigQuery Integration
def insert_telemetry_to_bigquery(dataset_id: str, table_id: str, row_data: Dict[str, Any]) -> bool:
    if not is_gcp_active():
        return False
    try:
        client = bigquery.Client()
        table_ref = client.dataset(dataset_id).table(table_id)
        errors = client.insert_rows_json(table_ref, [row_data])
        if not errors:
            logger.info(f"Pushed telemetry row to BigQuery table {dataset_id}.{table_id}")
            return True
        else:
            logger.error(f"BigQuery insertion errors: {errors}")
            return False
    except Exception as e:
        logger.error(f"BigQuery operation failed: {e}")
        return False

# Trigger Cloud Logging configuration if running inside GCP environment
setup_cloud_logging()
