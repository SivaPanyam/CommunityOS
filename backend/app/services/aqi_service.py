import httpx
import logging
from typing import Dict, Any

logger = logging.getLogger("CommunityOS.AQIService")

AQI_API_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

async def fetch_live_aqi(lat: float = 40.7128, lon: float = -74.0060) -> Dict[str, Any]:
    """
    Fetches real-time air quality metrics from Open-Meteo Air Quality API.
    """
    logger.info(f"Fetching live AQI for coordinates: {lat}, {lon}...")
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "european_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,ozone"
    }
    
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(AQI_API_URL, params=params)
                if response.status_code == 200:
                    data = response.json()
                    current = data.get("current", {})
                    
                    # Open-Meteo European AQI maps nicely to standard scales (0-100+)
                    aqi_val = int(current.get("european_aqi", 45))
                    pm25 = float(current.get("pm2_5", 12.0))
                    pm10 = float(current.get("pm10", 22.0))
                    no2 = float(current.get("nitrogen_dioxide", 15.0))
                    co = float(current.get("carbon_monoxide", 250.0))
                    o3 = float(current.get("ozone", 65.0))
                    
                    risk_status = "Good"
                    if aqi_val > 100:
                        risk_status = "Unhealthy"
                    elif aqi_val > 50:
                        risk_status = "Moderate"
                        
                    return {
                        "location": "Downtown",
                        "aqi": aqi_val,
                        "pm2_5": pm25,
                        "pm10": pm10,
                        "no2": no2,
                        "co": co,
                        "o3": o3,
                        "risk_status": risk_status
                    }
        except Exception as e:
            logger.warn(f"AQI API attempt {attempt + 1} failed: {e}")
            
    raise RuntimeError("Failed to fetch AQI from external Open-Meteo endpoint after 3 attempts.")
