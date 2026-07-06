import asyncio
import random
import logging
from datetime import datetime
from ..database import add_record, get_latest_record, get_records
from ..websocket_manager import broadcast
from .weather_service import fetch_live_weather
from .aqi_service import fetch_live_aqi
from .traffic_service import fetch_live_traffic
from .news_service import fetch_municipal_news_alerts

logger = logging.getLogger("CommunityOS.SyncScheduler")

async def run_sync_loop():
    logger.info("Initializing scheduled telemetry synchronization task...")
    
    # Simple rate-limiting ticket bucket
    api_rate_limiter = asyncio.Semaphore(2) # Allow max 2 parallel API tasks
    
    while True:
        try:
            # 1. Fetch live APIs concurrently with Semaphore limiting
            async def sync_weather():
                async with api_rate_limiter:
                    try:
                        weather_data = await fetch_live_weather()
                        add_record("weather", weather_data)
                    except Exception as e:
                        logger.error(f"[Scheduler Fallback] Weather fetch failed: {e}. Retaining latest cache.")

            async def sync_aqi():
                async with api_rate_limiter:
                    try:
                        aqi_data = await fetch_live_aqi()
                        add_record("airQuality", aqi_data)
                    except Exception as e:
                        logger.error(f"[Scheduler Fallback] AQI fetch failed: {e}. Retaining latest cache.")

            async def sync_traffic():
                async with api_rate_limiter:
                    try:
                        traffic_data = await fetch_live_traffic()
                        add_record("traffic", traffic_data)
                    except Exception as e:
                        logger.error(f"[Scheduler Fallback] Traffic fetch failed: {e}. Retaining latest cache.")

            async def sync_news():
                async with api_rate_limiter:
                    try:
                        news_items = await fetch_municipal_news_alerts()
                        for item in news_items:
                            # Avoid duplicate notifications by comparing titles
                            existing = get_records("notifications", limit=5)
                            if not any(n.get("title") == item["title"] for n in existing):
                                add_record("notifications", {
                                    "id": f"N-RSS-{int(datetime.utcnow().timestamp())}",
                                    "category": item["category"],
                                    "title": item["title"],
                                    "message": item["message"],
                                    "read": False
                                })
                    except Exception as e:
                        logger.error(f"[Scheduler Fallback] News RSS pull failed: {e}.")

            # Execute API gathers
            await asyncio.gather(
                sync_weather(),
                sync_aqi(),
                sync_traffic(),
                sync_news()
            )
            
            # 2. Simulate internal municipal grids changes (Power, Water, Hospitals)
            # Water reservoir levels
            water_data = get_latest_record("water", fallback={"facility": "Main Reservoir", "reservoir_level_pct": 78.8, "pressure_psi": 55, "leak_rate_lps": 12.0, "turbidity_ntu": 1.2, "status": "Normal"})
            water_data["reservoir_level_pct"] = max(0.0, min(100.0, round(water_data["reservoir_level_pct"] + random.uniform(-0.15, 0.15), 2)))
            add_record("water", water_data)
            
            # Power grid loads
            power_records = get_records("power", limit=1)
            power_data = power_records[0] if power_records else {"grid_id": "Grid-A", "zone": "Downtown Core", "demand_mw": 240, "capacity_mw": 300, "efficiency_pct": 94.0, "status": "Stable"}
            power_data["demand_mw"] = max(100, min(500, power_data["demand_mw"] + random.randint(-5, 5)))
            add_record("power", power_data)

            # Hospital occupancy wait time updates
            hospital_records = get_records("hospital", limit=1)
            hospital_data = hospital_records[0] if hospital_records else {"hospital_name": "City General Hospital", "total_beds": 500, "occupied_beds": 380, "icu_beds": 50, "occupied_icu_beds": 35, "emergency_wait_minutes": 25, "status": "Normal"}
            hospital_data["occupied_beds"] = max(100, min(hospital_data["total_beds"], hospital_data["occupied_beds"] + random.randint(-3, 3)))
            hospital_data["emergency_wait_minutes"] = max(5, min(180, hospital_data["emergency_wait_minutes"] + random.randint(-2, 2)))
            add_record("hospital", hospital_data)

            # 3. Pull latest values for WebSocket broadcast
            last_traffic = get_latest_record("traffic")
            last_aqi = get_latest_record("airQuality")
            last_water = get_latest_record("water")
            last_weather = get_latest_record("weather")
            
            total_beds = hospital_data["total_beds"]
            occupied_beds = hospital_data["occupied_beds"]
            active_power = power_data["demand_mw"]
            active_water = last_water["reservoir_level_pct"] if last_water else 78.8

            stats = {
                "trafficIndex": last_traffic.get("congestion_index", 0.58) if last_traffic else 0.58,
                "averageSpeed": last_traffic.get("average_speed_kmh", 42) if last_traffic else 42,
                "vehicleCount": last_traffic.get("vehicle_count", 1680) if last_traffic else 1680,
                "weather": last_weather or {"temperature_c": 22.0, "humidity_pct": 65, "rainfall_mm": 0.0, "condition": "Clear", "warnings": "None"},
                "aqi": last_aqi.get("aqi", 75) if last_aqi else 75,
                "aqiStatus": last_aqi.get("risk_status", "Moderate") if last_aqi else "Moderate",
                "hospitalOccupancy": round((occupied_beds / total_beds) * 100) if total_beds else 75,
                "activePowerMW": active_power,
                "reservoirLevelPct": active_water,
                "unresolvedComplaintsCount": len([c for c in get_records("complaints") if c.get("status") != "Resolved"]),
                "activeEmergenciesCount": len([e for e in get_records("emergency") if e.get("status") != "Resolved"]),
                "recentDecisions": get_records("approvedActions", limit=5),
                "notifications": get_records("notifications", limit=15)
            }

            await broadcast("telemetry:update", {
                "stats": stats,
                "traffic": get_records("traffic", limit=30),
                "airQuality": get_records("airQuality", limit=30),
                "water": get_records("water", limit=30),
                "complaints": get_records("complaints", limit=30),
                "emergency": get_records("emergency", limit=30)
            })

            logger.info("Successfully completed telemetry synchronization and WS broadcast.")
        except Exception as e:
            logger.error(f"Error in background sync loop execution: {e}")
            
        await asyncio.sleep(60) # Sync intervals: every 60 seconds
