"""Auckland Council ArcGIS REST adapter — 免认证, CC-BY 4.0."""
import requests

PAGE_SIZE = 1000  # ArcGIS 单次返回上限

def fetch_layer(layer_url: str, where: str = "1=1") -> list[dict]:
    """标准 ArcGIS FeatureServer query, 自动分页."""
    out, offset = [], 0
    while True:
        r = requests.get(layer_url + "/query", params={
            "where": where, "outFields": "*", "outSR": "4326",
            "f": "json", "resultOffset": offset, "resultRecordCount": PAGE_SIZE,
        }, timeout=60)
        r.raise_for_status()
        data = r.json()
        feats = data.get("features", [])
        if not feats:
            break
        out.extend(f.get("attributes", {}) | {"_geom": f.get("geometry")} for f in feats)
        if not data.get("exceededTransferLimit"):
            break
        offset += PAGE_SIZE
    return out

def to_place(rec: dict, category: str, source_name: str, layer_url: str) -> dict:
    g = rec.get("_geom") or {}
    lat, lng = g.get("y"), g.get("x")
    if lat is None or lng is None:
        return None  # 无坐标不入库
    return {
        "name": rec.get("NAME") or rec.get("Name") or rec.get("name") or "Unnamed",
        "category": category,
        "lat": lat, "lng": lng,
        "address": rec.get("ADDRESS") or rec.get("Address"),
        "source_name": source_name,
        "source_url": layer_url,
        "source_id": str(rec.get("OBJECTID") or rec.get("GlobalID") or ""),
        "last_updated": None,
        "raw": rec,
    }
