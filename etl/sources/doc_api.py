"""DOC Developer API adapter — https://api.doc.govt.nz (免费, 需 API key).

注册流程: portal 注册 → 订阅 Tracks/Huts/Campsites API → 拿到 X-API-Key。
确切端点路径以 portal 文档为准 (Getting Started 页)。
"""
import os, requests

BASE = "https://api.doc.govt.nz"

def fetch_all(endpoint: str) -> list[dict]:
    key = os.environ.get("DOC_API_KEY")
    if not key:
        raise RuntimeError("DOC_API_KEY not set — register at https://api.doc.govt.nz")
    out, offset = [], 0
    while True:
        r = requests.get(BASE + endpoint, headers={"x-api-key": key},
                         params={"offset": offset, "limit": 500}, timeout=60)
        r.raise_for_status()
        data = r.json()
        items = data if isinstance(data, list) else data.get("data", [])
        if not items:
            break
        out.extend(items)
        if len(items) < 500:
            break
        offset += 500
    return out

# DOC 字段名以实际响应为准; 这里只处理确定存在的核心字段, 其余进 raw 不猜测
def to_place(rec: dict, category: str) -> dict:
    lat = rec.get("lat") or rec.get("latitude")
    lng = rec.get("lon") or rec.get("longitude")
    if lat is None or lng is None:
        return None
    return {
        "name": rec.get("name") or "Unnamed",
        "category": category,
        "lat": lat, "lng": lng,
        "description": rec.get("introduction"),
        "region": rec.get("region"),
        "difficulty": None,          # 用 normalize.map_difficulty(rec.get('walkDuration')...) 按实际字段接
        "source_name": "DOC",
        "source_url": rec.get("assetId") and f"https://www.doc.govt.nz/parks-and-recreation/places-to-go/{rec['assetId']}",
        "source_id": str(rec.get("assetId") or rec.get("id") or ""),
        "last_updated": rec.get("dateLastUpdated"),
        "raw": rec,
    }
