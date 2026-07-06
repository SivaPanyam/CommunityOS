import os
import csv
import json
import sqlite3
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger("CommunityOS.Database")

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DB_PATH = os.path.join(base_dir, "src", "data", "telemetry_store.db")

# Backwards compatible state dictionary that proxies to SQLite
class SQLiteProxyState:
    def __getitem__(self, key: str) -> List[Dict[str, Any]]:
        # Returns latest 50 records from SQLite for that key
        return get_records(key, limit=50)
        
    def __setitem__(self, key: str, value: Any):
        # We don't support direct assignments, updates happen via add_record
        pass

    def __contains__(self, key: str) -> bool:
        return key in ["traffic", "weather", "airQuality", "complaints", "power", "water", "hospital", "emergency", "citizenFeedback", "notifications", "approvedActions"]

    def get(self, key: str, default=None) -> Any:
        if key in self:
            return self[key]
        return default

state = SQLiteProxyState()

def get_db_connection():
    db_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_telemetry_db():
    logger.info("Initializing SQLite Telemetry Database...")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS telemetry_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL,
        payload TEXT NOT NULL
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workflow_executions (
        id TEXT PRIMARY KEY,
        action_id TEXT,
        title TEXT,
        category TEXT,
        department TEXT,
        status TEXT,
        timeline TEXT, -- JSON string
        logs TEXT,
        created_at TEXT
    )
    """)
    conn.commit()
    
    # Check if we need to seed the database
    cursor.execute("SELECT COUNT(*) FROM telemetry_records")
    if cursor.fetchone()[0] == 0:
        logger.info("Telemetry Database is empty. Seeding from mock CSV files...")
        seed_from_csv(conn)
    conn.close()

def add_record(record_type: str, payload: dict, timestamp: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    ts = timestamp or datetime.utcnow().isoformat() + "Z"
    cursor.execute(
        "INSERT INTO telemetry_records (timestamp, type, payload) VALUES (?, ?, ?)",
        (ts, record_type, json.dumps(payload, ensure_ascii=False))
    )
    conn.commit()
    conn.close()

    # GCP integrations
    from .gcp import save_to_firestore, insert_telemetry_to_bigquery, is_gcp_active
    from .config import settings
    
    if is_gcp_active():
        # Store complaints in Firestore for persistent tracking
        if record_type == "complaints" and "id" in payload:
            save_to_firestore("complaints", str(payload["id"]), payload)
            
        # Stream telemetry to BigQuery if analytics table configured
        if settings.BIGQUERY_DATASET and settings.BIGQUERY_TABLE:
            row = {
                "timestamp": ts,
                "type": record_type,
                "payload": json.dumps(payload, ensure_ascii=False)
            }
            insert_telemetry_to_bigquery(settings.BIGQUERY_DATASET, settings.BIGQUERY_TABLE, row)

def get_records(record_type: str, limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT timestamp, payload FROM telemetry_records WHERE type = ? ORDER BY id DESC LIMIT ?",
        (record_type, limit)
    )
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in reversed(rows): # Return chronological order
        try:
            payload = json.loads(r["payload"])
            if isinstance(payload, dict):
                payload["timestamp"] = r["timestamp"]
            results.append(payload)
        except Exception as e:
            logger.error(f"Error parsing record payload for type {record_type}: {e}")
    return results

def get_latest_record(record_type: str, fallback: Any = None) -> Any:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT timestamp, payload FROM telemetry_records WHERE type = ? ORDER BY id DESC LIMIT 1",
        (record_type,)
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        return fallback
    try:
        payload = json.loads(row["payload"])
        if isinstance(payload, dict):
            payload["timestamp"] = row["timestamp"]
        return payload
    except Exception:
        return fallback

# Helper to read and parse local CSV mocks for seeding
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

def seed_from_csv(conn):
    cursor = conn.cursor()
    data_dir = os.path.join(base_dir, "src", "data", "mock")
    
    datasets = {
        "traffic": "traffic.csv",
        "weather": "weather.csv",
        "airQuality": "air_quality.csv",
        "complaints": "complaints.csv",
        "power": "power.csv",
        "water": "water.csv",
        "hospital": "hospital.csv",
        "emergency": "emergency.csv",
        "citizenFeedback": "citizen_feedback.csv"
    }
    
    for key, filename in datasets.items():
        csv_path = os.path.join(data_dir, filename)
        if os.path.exists(csv_path):
            rows = parse_csv_file(csv_path)
            for r in rows:
                ts = r.pop("timestamp", None) or datetime.utcnow().isoformat() + "Z"
                cursor.execute(
                    "INSERT INTO telemetry_records (timestamp, type, payload) VALUES (?, ?, ?)",
                    (ts, key, json.dumps(r, ensure_ascii=False))
                )
    
    # Add initial seed notifications
    initial_notifications = [
        {
            "id": "N-1",
            "category": "Emergency",
            "title": "Traffic Signal Priority Automated",
            "message": "Emergency priority route optimized on Downtown Expressway Exit 2 for rescue operations.",
            "read": False,
        },
        {
            "id": "N-2",
            "category": "Environment",
            "title": "Flash Flood Warning Logged",
            "message": "AI alert triggered for Metro Bridge Underpass as current rainfall exceeds SOP limit of 10mm/hr.",
            "read": False,
        }
    ]
    for n in initial_notifications:
        cursor.execute(
            "INSERT INTO telemetry_records (timestamp, type, payload) VALUES (?, ?, ?)",
            (datetime.utcnow().isoformat() + "Z", "notifications", json.dumps(n, ensure_ascii=False))
        )
        
    conn.commit()
    logger.info("Telemetry Database seeding completed.")

def add_workflow_execution(wf_id: str, action_id: str, title: str, category: str, department: str, status: str, timeline_json: str, logs: str):
    created_at = datetime.utcnow().isoformat() + "Z"
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO workflow_executions (id, action_id, title, category, department, status, timeline, logs, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (wf_id, action_id, title, category, department, status, timeline_json, logs, created_at))
    conn.commit()
    conn.close()

    # GCP Integration
    from .gcp import save_to_firestore, is_gcp_active
    if is_gcp_active():
        try:
            timeline_list = json.loads(timeline_json)
        except Exception:
            timeline_list = []
        save_to_firestore("workflows", wf_id, {
            "id": wf_id,
            "actionId": action_id,
            "title": title,
            "category": category,
            "department": department,
            "status": status,
            "timeline": timeline_list,
            "logs": logs,
            "createdAt": created_at
        })

def update_workflow_status(wf_id: str, status: str, timeline_json: str, logs: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE workflow_executions 
    SET status = ?, timeline = ?, logs = ?
    WHERE id = ?
    """, (status, timeline_json, logs, wf_id))
    conn.commit()
    conn.close()

    # GCP Integration
    from .gcp import save_to_firestore, is_gcp_active, get_firestore_client
    if is_gcp_active():
        try:
            timeline_list = json.loads(timeline_json)
        except Exception:
            timeline_list = []
        client = get_firestore_client()
        if client:
            try:
                # Merge update
                client.collection("workflows").document(wf_id).update({
                    "status": status,
                    "timeline": timeline_list,
                    "logs": logs
                })
            except Exception as e:
                logger.error(f"Firestore update error for workflow {wf_id}: {e}")

def get_workflow_executions(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, action_id as actionId, title, category, department, status, timeline, logs, created_at as createdAt
    FROM workflow_executions
    ORDER BY created_at DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        item = dict(r)
        try:
            item["timeline"] = json.loads(item["timeline"])
        except Exception:
            item["timeline"] = []
        results.append(item)
    return results

def get_workflow_by_id(wf_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, action_id as actionId, title, category, department, status, timeline, logs, created_at as createdAt
    FROM workflow_executions
    WHERE id = ?
    """, (wf_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    item = dict(row)
    try:
        item["timeline"] = json.loads(item["timeline"])
    except Exception:
        item["timeline"] = []
    return item

init_telemetry_db()
