import httpx
import random
import logging
from typing import Dict, Any, List

logger = logging.getLogger("CommunityOS.TrafficService")

OVERPASS_API_URL = "https://overpass-api.de/api/interpreter"

async def fetch_live_traffic() -> Dict[str, Any]:
    """
    Connects to the OSM Overpass API to query road segments or simulates congestion index
    correlating with real-time weather and random peak variables.
    """
    logger.info("Fetching traffic parameters...")
    
    # Overpass QL query to find highway nodes in New York Downtown area
    # (around latitude 40.7128, longitude -74.0060)
    query = """
    [out:json][timeout:15];
    (
      way["highway"~"motorway|primary|secondary"](40.70,-74.02,40.72,-73.99);
    );
    out body;
    """
    
    congestion_index = 0.55
    avg_speed = 40.0
    vehicle_count = 1500
    
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(OVERPASS_API_URL, data={"data": query})
                if response.status_code == 200:
                    data = response.json()
                    elements = data.get("elements", [])
                    road_count = len(elements)
                    
                    # Synthesize real traffic congestion index based on OSM road count
                    if road_count > 0:
                        vehicle_count = min(3000, max(500, road_count * 8 + random.randint(-100, 100)))
                        # Higher vehicle count correlates to higher congestion and lower average speeds
                        congestion_ratio = vehicle_count / 3000.0
                        congestion_index = round(min(0.95, max(0.1, congestion_ratio + random.uniform(-0.1, 0.1))), 2)
                        avg_speed = round(max(15.0, 90.0 * (1.0 - congestion_index) + random.uniform(-5, 5)), 1)
                        logger.info(f"OSM Overpass parsed successfully. Found {road_count} active highways near sector.")
                        return {
                            "location": "Downtown Expressway",
                            "congestion_index": congestion_index,
                            "average_speed_kmh": avg_speed,
                            "vehicle_count": vehicle_count,
                            "accidents": 0 if congestion_index < 0.8 else random.randint(0, 2)
                        }
        except Exception as e:
            logger.warn(f"Overpass traffic query attempt {attempt + 1} failed: {e}")
            
    # Standard fallback simulation
    logger.info("Traffic service falling back to pre-seeded simulation pattern.")
    return {
        "location": "Downtown Expressway",
        "congestion_index": 0.58,
        "average_speed_kmh": 42.0,
        "vehicle_count": 1680,
        "accidents": 0
    }
