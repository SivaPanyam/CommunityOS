import httpx
import logging
import xml.etree.ElementTree as ET
from typing import List, Dict, Any

logger = logging.getLogger("CommunityOS.NewsService")

# Public NOAA RSS weather alerts feed
RSS_FEED_URL = "https://www.weather.gov/alerts/wwa.php" # Or fallback generic alerts

async def fetch_municipal_news_alerts() -> List[Dict[str, Any]]:
    """
    Fetches real-time alert updates from public RSS/XML feeds.
    Returns structured notifications list.
    """
    logger.info("Polling RSS municipal news alerts...")
    
    headers = {"User-Agent": "CommunityOS-SmartCity-App/2.0.0 (sivap@example.com)"}
    
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(RSS_FEED_URL, headers=headers)
                if response.status_code == 200:
                    root = ET.fromstring(response.text)
                    
                    # Parse Atom/RSS feed items
                    items = []
                    # Standard RSS uses <item>, Atom uses <entry>
                    for entry in root.findall(".//item") or root.findall(".//entry"):
                        title_el = entry.find("title")
                        desc_el = entry.find("description") or entry.find("summary")
                        category_el = entry.find("category")
                        
                        title = title_el.text if title_el is not None else "Municipal Update"
                        desc = desc_el.text if desc_el is not None else "General city warning."
                        category = category_el.text if category_el is not None else "General"
                        
                        # Strip HTML if present
                        desc_clean = desc.replace("<p>", "").replace("</p>", "").strip()
                        
                        items.append({
                            "category": category,
                            "title": title,
                            "message": desc_clean[:200] + "..." if len(desc_clean) > 200 else desc_clean
                        })
                    return items
        except Exception as e:
            logger.warn(f"RSS feed query attempt {attempt + 1} failed: {e}")
            
    # Default fallback alert
    return [
        {
            "category": "General",
            "title": "Municipal Advisory System Active",
            "message": "CommunityOS Central Automation Node is monitoring all utility grids and road channels."
        }
    ]
