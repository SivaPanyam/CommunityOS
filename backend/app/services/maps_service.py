import httpx
import logging
from typing import Dict, Any, List

logger = logging.getLogger("CommunityOS.MapsService")

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

async def geocode_address(address: str) -> Dict[str, float]:
    """
    Geocodes an address or location name to latitude/longitude using OpenStreetMap Nominatim.
    """
    logger.info(f"Geocoding address via OpenStreetMap Nominatim: {address}")
    headers = {"User-Agent": "CommunityOS-SmartCity-App/2.0.0 (sivap@example.com)"}
    params = {
        "q": address,
        "format": "json",
        "limit": 1
    }
    
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(NOMINATIM_URL, params=params, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if data:
                        lat = float(data[0].get("lat", 0.0))
                        lon = float(data[0].get("lon", 0.0))
                        return {"latitude": lat, "longitude": lon}
                    break
        except Exception as e:
            logger.warn(f"Nominatim geocoding attempt {attempt + 1} failed: {e}")
            
    # Default fallback coordinates (Downtown New York)
    return {"latitude": 40.7128, "longitude": -74.0060}
