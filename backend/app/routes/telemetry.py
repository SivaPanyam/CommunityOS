from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ..database import state

router = APIRouter()

@router.get("/api/data/all")
async def get_all_data():
    last_traffic = next((t for t in reversed(state["traffic"]) if t.get("location") == "Downtown Expressway"), {
        "congestion_index": 0.58, "average_speed_kmh": 42, "vehicle_count": 1680
    })
    last_weather = state["weather"][-1] if state["weather"] else {
        "temperature_c": 24.0, "humidity_pct": 82, "rainfall_mm": 5.5, "condition": "Rain", "warnings": "Flood Advisory"
    }
    last_aqi = next((a for a in reversed(state["airQuality"]) if a.get("location") == "Downtown"), {
        "aqi": 75, "risk_status": "Moderate"
    })
    
    total_beds = sum(h.get("total_beds", 0) or 0 for h in state["hospital"]) or 820
    occupied_beds = sum(h.get("occupied_beds", 0) or 0 for h in state["hospital"]) or 620
    active_power = sum(p.get("demand_mw", 0) or 0 for p in state["power"][-3:]) or 450
    active_water = next((w.get("reservoir_level_pct", 78.8) for w in state["water"] if w.get("facility") == "Main Reservoir"), 78.8)

    stats = {
        "trafficIndex": last_traffic.get("congestion_index", 0.58),
        "averageSpeed": last_traffic.get("average_speed_kmh", 42),
        "vehicleCount": last_traffic.get("vehicle_count", 1680),
        "weather": last_weather,
        "aqi": last_aqi.get("aqi", 75),
        "aqiStatus": last_aqi.get("risk_status", "Moderate"),
        "hospitalOccupancy": round((occupied_beds / total_beds) * 100) if total_beds else 75,
        "activePowerMW": active_power,
        "reservoirLevelPct": active_water,
        "unresolvedComplaintsCount": len([c for c in state["complaints"] if c.get("status") != "Resolved"]),
        "activeEmergenciesCount": len([e for e in state["emergency"] if e.get("status") != "Resolved"]),
        "recentDecisions": state["approvedActions"][:5],
        "notifications": state["notifications"]
    }

    return {
        "stats": stats,
        "traffic": state["traffic"],
        "weather": state["weather"],
        "airQuality": state["airQuality"],
        "complaints": state["complaints"],
        "power": state["power"],
        "water": state["water"],
        "hospital": state["hospital"],
        "emergency": state["emergency"],
        "citizenFeedback": state["citizenFeedback"]
    }

@router.get("/api/download/{dataset}")
async def download_dataset(dataset: str):
    if dataset not in state:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    rows = state[dataset]
    if not rows:
        return StreamingResponse(iter([""]), media_type="text/csv")
        
    headers = list(rows[0].keys())
    
    def csv_generator():
        yield ",".join(headers) + "\n"
        for r in rows:
            line_vals = []
            for h in headers:
                val = r.get(h, "")
                val_str = str(val) if val is not None else ""
                if "," in val_str or '"' in val_str or "\n" in val_str:
                    val_str = '"' + val_str.replace('"', '""') + '"'
                line_vals.append(val_str)
            yield ",".join(line_vals) + "\n"

    headers_disp = {
        "Content-Disposition": f"attachment; filename=communityos_{dataset}.csv"
    }
    return StreamingResponse(csv_generator(), media_type="text/csv", headers=headers_disp)
