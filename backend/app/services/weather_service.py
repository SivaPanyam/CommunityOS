import httpx
import logging
from typing import Dict, Any

logger = logging.getLogger("CommunityOS.WeatherService")

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

async def fetch_live_weather(lat: float = 40.7128, lon: float = -74.0060) -> Dict[str, Any]:
    """
    Fetches real-time weather indicators from the free Open-Meteo API.
    Defaults to New York City coordinates.
    """
    logger.info(f"Fetching live weather for coordinates: {lat}, {lon}...")
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
        "timezone": "auto"
    }
    
    # 3-retries configuration
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(OPEN_METEO_URL, params=params)
                if response.status_code == 200:
                    data = response.json()
                    current = data.get("current", {})
                    temp_c = current.get("temperature_2m", 22.5)
                    humidity = current.get("relative_humidity_2m", 65)
                    precipitation = current.get("precipitation", 0.0)
                    wind_speed = current.get("wind_speed_10m", 12.0)
                    
                    # Interpret conditions
                    condition = "Clear"
                    warnings = "None"
                    if precipitation > 10.0:
                        condition = "Heavy Rain"
                        warnings = "Flood Warning: Underpasses at risk"
                    elif precipitation > 1.0:
                        condition = "Rain"
                        warnings = "Flood Advisory: Expect delays"
                    elif humidity > 85:
                        condition = "Overcast"
                        
                    return {
                        "temperature_c": round(temp_c, 1),
                        "humidity_pct": int(humidity),
                        "rainfall_mm": round(precipitation, 1),
                        "wind_speed_kmh": round(wind_speed, 1),
                        "condition": condition,
                        "warnings": warnings
                    }
        except Exception as e:
            logger.warn(f"Weather API attempt {attempt + 1} failed: {e}")
            
    # Raise exception to let scheduler handle fallback caching
    raise RuntimeError("Failed to fetch weather from external Open-Meteo endpoint after 3 attempts.")
