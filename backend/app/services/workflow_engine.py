import json
import random
import logging
from datetime import datetime
from typing import Dict, Any, List
from ..database import add_record, get_latest_record, get_records, add_workflow_execution, update_workflow_status
from ..websocket_manager import broadcast

logger = logging.getLogger("CommunityOS.WorkflowEngine")

class WorkflowEngine:
    @staticmethod
    async def run_automation(action_id: str, action_title: str, department: str, sector: str, impact_metric: str) -> Dict[str, Any]:
        """
        Executes and logs the workflow automation steps for a proposed decision directive.
        Categorizes dispatches and mutates live SQLite state variables correspondingly.
        """
        wf_id = f"WF-2026-{random.randint(1000, 9999)}"
        timestamp = datetime.utcnow().isoformat() + "Z"
        title_lower = action_title.lower()
        
        # 1. Determine Category
        category = "General Municipal Task"
        if any(k in title_lower for k in ["ambulance", "rescue", "police", "fire", "emergency"]):
            category = "Emergency Response"
        elif any(k in title_lower for k in ["garbage", "trash", "waste", "collection", "sweep"]):
            category = "Garbage Collection"
        elif any(k in title_lower for k in ["power", "substation", "grid", "outage", "electricity"]):
            category = "Power Failure"
        elif any(k in title_lower for k in ["flood", "underpass", "drainage", "pump", "rain"]):
            category = "Flood Alert"
        elif any(k in title_lower for k in ["traffic", "congestion", "signal", "light"]):
            category = "Traffic Congestion"
        elif any(k in title_lower for k in ["complaint", "repair", "pothole", "leak"]):
            category = "Citizen Complaint"

        logger.info(f"[Workflow Engine] Initializing workflow {wf_id} under category: {category}")
        
        # 2. Timeline & Log setup
        timeline = [
            {"time": timestamp, "event": f"Workflow {wf_id} proposed by AI Decision Intelligence Engine."},
            {"time": timestamp, "event": f"Routed to department: {department}."}
        ]
        
        logs = f"[{timestamp}] [INFO] Starting Workflow Automation {wf_id}\n"
        logs += f"[{timestamp}] [INFO] Category: {category} | Sector: {sector}\n"
        logs += f"[{timestamp}] [INFO] Proposing Action Directive: \"{action_title}\"\n"
        logs += f"[{timestamp}] [INFO] Responsible Department: {department}\n"
        
        # 3. Add proposed record
        add_workflow_execution(wf_id, action_id, action_title, category, department, "Pending Approval", json.dumps(timeline), logs)
        
        # Simulate approval process transition (Proposed -> Dispatched -> Executing -> Completed)
        # In this platform, approval is triggered on the POST request
        status = "Dispatched"
        timestamp_dispatch = datetime.utcnow().isoformat() + "Z"
        timeline.append({"time": timestamp_dispatch, "event": "Directive approved by administrator. Dispatched to units."})
        logs += f"[{timestamp_dispatch}] [INFO] Directive authenticated. Dispatching instructions...\n"
        
        # 4. Automate domain state updates and logging details based on Category
        timestamp_exec = datetime.utcnow().isoformat() + "Z"
        timeline.append({"time": timestamp_exec, "event": "Executing automated operational directives."})
        logs += f"[{timestamp_exec}] [INFO] Executing category-specific automation logic:\n"

        if category == "Emergency Response":
            logs += f"[{timestamp_exec}] [ACTION] Activating highway signal priority cycle for exits...\n"
            logs += f"[{timestamp_exec}] [ACTION] Alerting Fire/EMS dispatch dispatcher.\n"
            for e in get_records("emergency"):
                if "Expressway" in e.get("location", "") or "Downtown" in e.get("location", ""):
                    e["status"] = "Responding"
                    e["responding_units"] = "3 Ambulances; 2 Police Patrols"
                    add_record("emergency", e)
            logs += f"[{timestamp_exec}] [SUCCESS] Units dispatched. Emergency status set to Responding.\n"

        elif category == "Garbage Collection":
            logs += f"[{timestamp_exec}] [ACTION] Routing Sanitation collection fleet to location...\n"
            for c in get_records("complaints"):
                if "garbage" in c.get("title", "").lower() or "trash" in c.get("title", "").lower():
                    c["status"] = "In Progress"
                    add_record("complaints", c)
            logs += f"[{timestamp_exec}] [SUCCESS] Sanitation fleet scheduled. Complains updated.\n"

        elif category == "Power Failure":
            logs += f"[{timestamp_exec}] [ACTION] Balancing grid load Substation B...\n"
            power_records = get_records("power", limit=1)
            if power_records:
                power_data = power_records[0]
                power_data["demand_mw"] = max(100, power_data["demand_mw"] - 40)
                power_data["status"] = "Optimized"
                add_record("power", power_data)
            logs += f"[{timestamp_exec}] [SUCCESS] Substation load balanced. Current demand lowered.\n"

        elif category == "Flood Alert":
            logs += f"[{timestamp_exec}] [ACTION] Activating drainage pumps at Metro Bridge underpass...\n"
            logs += f"[{timestamp_exec}] [ACTION] Triggering smart signal exit detour signs.\n"
            last_water = get_latest_record("water")
            if last_water:
                last_water["leak_rate_lps"] = max(0.0, last_water["leak_rate_lps"] - 5.0)
                last_water["status"] = "Normal"
                add_record("water", last_water)
            logs += f"[{timestamp_exec}] [SUCCESS] Pumps active. Détour signs broadcasting.\n"

        elif category == "Traffic Congestion":
            logs += f"[{timestamp_exec}] [ACTION] Extending green cycle on arterial signals by 15s...\n"
            last_traffic = get_latest_record("traffic")
            if last_traffic:
                last_traffic["congestion_index"] = max(0.2, last_traffic["congestion_index"] - 0.15)
                last_traffic["average_speed_kmh"] = min(110, last_traffic["average_speed_kmh"] + 10)
                add_record("traffic", last_traffic)
            logs += f"[{timestamp_exec}] [SUCCESS] Smart signals timing adjusted.\n"

        elif category == "Citizen Complaint":
            logs += f"[{timestamp_exec}] [ACTION] Directing repair work order to Public Works department...\n"
            for c in get_records("complaints"):
                if "pothole" in c.get("title", "").lower() or "leak" in c.get("title", "").lower():
                    c["status"] = "In Progress"
                    add_record("complaints", c)
            logs += f"[{timestamp_exec}] [SUCCESS] Public Works ticket registered. Status: In Progress.\n"

        # 5. Finalize status (Completed)
        status = "Completed"
        timestamp_comp = datetime.utcnow().isoformat() + "Z"
        timeline.append({"time": timestamp_comp, "event": f"Workflow {wf_id} successfully finalized and closed."})
        logs += f"[{timestamp_comp}] [INFO] Execution completed. Closing task.\n"
        logs += f"========================================================================\n"
        
        # Save updated execution history
        update_workflow_status(wf_id, status, json.dumps(timeline), logs)
        
        # GCP Integration: Publish emergency alert to Pub/Sub
        from ..gcp import publish_pubsub_message, is_gcp_active
        from ..config import settings
        if is_gcp_active() and category in ["Emergency Response", "Flood Alert", "Power Failure"]:
            alert_payload = {
                "workflowId": wf_id,
                "title": action_title,
                "category": category,
                "department": department,
                "urgency": "High",
                "timestamp": timestamp
            }
            publish_pubsub_message(settings.PUBSUB_TOPIC, json.dumps(alert_payload))
        
        approved_item = {
            "id": action_id,
            "dispatchId": wf_id,
            "timestamp": timestamp,
            "title": action_title,
            "department": department,
            "sector": sector,
            "status": "Dispatched",
            "report": logs
        }
        
        # Push notification
        add_record("notifications", {
            "id": f"N-WF-{wf_id}",
            "category": "Workflow Automation",
            "title": f"Action Approved: {action_title}",
            "message": f"Municipal workflow initiated under {wf_id}. Sector: {sector}. Responsible: {department}.",
            "read": False
        })
        
        await broadcast("workflow:approved", approved_item)
        return approved_item
