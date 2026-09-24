"""ETL 主流程: 拉取 → 归一化 → upsert → 审计.
用法: python run.py [--source auckland_council|doc_api]
"""
import json, os, sys, time

# 本地开发从 etl/.env 读 key (生产走 GitHub Secrets 环境变量)
from pathlib import Path
for line in Path(__file__).parent.joinpath(".env").read_text().splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())

import yaml
from supabase import create_client

from normalize import map_category, map_difficulty, to_bool
import sources.auckland_council as ac
import sources.doc_api as doc

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]   # service_role, 仅 ETL 使用

def upsert_places(sb, places: list[dict]):
    rows = []
    for p in places:
        if not p:
            continue
        rows.append({
            "name": p["name"], "description": p.get("description"),
            "category": p.get("category", "other"),
            "geom": f"SRID=4326;POINT({p['lng']} {p['lat']})",
            "region": p.get("region"), "city": p.get("city"), "address": p.get("address"),
            "difficulty": p.get("difficulty"),
            "dog_allowed": p.get("dog_allowed"), "parking": p.get("parking"),
            "camping_allowed": p.get("camping_allowed"), "fishing_allowed": p.get("fishing_allowed"),
            "swimming_allowed": p.get("swimming_allowed"),
            "source_name": p["source_name"], "source_url": p.get("source_url"),
            "source_id": p["source_id"], "last_updated": p.get("last_updated"),
            "raw": p.get("raw"),
        })
    if rows:
        sb.table("places").upsert(rows, on_conflict="source_name,source_id").execute()

def import_auckland(sb, cfg):
    total_i, total_u, errs = 0, 0, []
    for layer in cfg["layers"]:
        if layer["layer_url"] in ("", "FILL_FROM_HUB"):
            print(f"skip {layer['name']}: layer_url not set — copy GeoService URL from the hub dataset page")
            continue
        try:
            recs = ac.fetch_layer(layer["layer_url"])
            places = [ac.to_place(r, layer["category"], layer["source_name"], layer["layer_url"]) for r in recs]
            imp = sb.table("data_imports").insert({"source_name": layer["source_name"]}).execute()
            upsert_places(sb, [p for p in places if p])
            print(f"{layer['name']}: {len(recs)} fetched")
        except Exception as e:
            errs.append({"layer": layer["name"], "error": str(e)})
            print(f"ERROR {layer['name']}: {e}")
    return errs

def import_doc(sb, cfg):
    errs = []
    for kind, ep in cfg["endpoints"].items():
        try:
            recs = doc.fetch_all(ep)
            cat = cfg["category_map"].get(kind, "other")
            upsert_places(sb, [doc.to_place(r, cat) for r in recs])
            print(f"DOC {kind}: {len(recs)} fetched")
        except Exception as e:
            errs.append({"endpoint": ep, "error": str(e)})
            print(f"ERROR DOC {kind}: {e}")
    return errs

if __name__ == "__main__":
    cfg = yaml.safe_load(open("config.yaml"))
    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    src = sys.argv[sys.argv.index("--source") + 1] if "--source" in sys.argv else None
    errors = []
    for name, c in cfg["sources"].items():
        if src and name != src:
            continue
        if not c.get("enabled"):
            print(f"skip {name} (disabled)")
            continue
        errors += import_auckland(sb, c) if name == "auckland_council" else import_doc(sb, c)
    if errors:
        sys.exit(1)
