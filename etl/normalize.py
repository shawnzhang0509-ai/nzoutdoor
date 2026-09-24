"""字段归一化: 任何数据源 → places schema. 铁律: 无官方依据 = None (Unknown)。"""
import re
from typing import Any, Optional

CATEGORY_MAP = {
    # DOC
    "track": "walk", "walking track": "walk", "tramp": "hiking", "tramping track": "hiking",
    "hut": "hut", "bivvy": "hut", "campsite": "campsite", "campground": "campsite",
    # Council
    "park": "park", "reserve": "park", "beach": "beach",
    "playground": "park", "picnic": "picnic", "bbq": "picnic",
}

def map_category(raw: Optional[str], default: str = "other") -> str:
    if not raw:
        return default
    return CATEGORY_MAP.get(re.sub(r"\s+", " ", raw.strip().lower()), default)

def map_difficulty(raw: Optional[str]) -> Optional[str]:
    """DOC 用 Easy/Intermediate/Advanced; 归一化到 easy/moderate/hard; 未知=None"""
    if not raw:
        return None
    r = raw.strip().lower()
    if r in ("easy",):
        return "easy"
    if r in ("intermediate", "moderate", "medium"):
        return "moderate"
    if r in ("advanced", "hard", "difficult", "expert"):
        return "hard"
    return None  # 不认识就不猜

def to_bool(raw: Any) -> Optional[bool]:
    if raw is None or raw == "":
        return None
    if isinstance(raw, bool):
        return raw
    r = str(raw).strip().lower()
    if r in ("yes", "y", "true", "1", "allowed", "permitted"):
        return True
    if r in ("no", "n", "false", "0", "prohibited", "not allowed"):
        return False
    return None  # 模糊表述不猜

def normalize_record(src: dict, mapping: dict) -> dict:
    """mapping: places字段 -> 源字段名 或 callable(src)->value"""
    out = {}
    for field, spec in mapping.items():
        if callable(spec):
            out[field] = spec(src)
        elif isinstance(spec, str) and spec in src:
            out[field] = src.get(spec)
        else:
            out[field] = None
    return out
