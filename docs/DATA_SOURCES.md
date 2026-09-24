# NZ Outdoor · 数据源手册 (2026-09 验证)

## ✅ P0 — 已验证可用

### 1. DOC Developer API (全国 tracks / huts / campsites)
- Portal: https://api.doc.govt.nz — 免费注册 → 订阅 API → 拿 X-API-Key
- DOC 官方说明: "APIs are available for tracks, huts and campsites. Request DOC APIs."
- ⚠️ 旧 ArcGIS Hub 数据集 (doc-deptconservation.opendata.arcgis.com) 已标记 Deprecated, 不要基于它建管道
- 备选镜像: data.govt.nz 有 DOC Tracks CSV (CC-BY 4.0), Koordinates 有 DOC 图层镜像
- 版权要求: 衍生作品需标注 "Crown Copyright: Department of Conservation Te Papa Atawhai [year]"

### 2. Auckland Council Open Data (Auckland 试点主力)
- Hub: https://data-aucklandcouncil.opendata.arcgis.com
- 免认证、无 API key, 标准 ArcGIS REST FeatureServer 查询
- Licence: CC-BY 4.0 (可商用, 需署名)
- 已知数据集: Park Asset Location (~2,022 条), Park Extents (全部公园保护区多边形)
- 用法: 数据集页 → "View API resources" → 复制 GeoService URL → 填进 etl/config.yaml
- 待补充图层: 海滩 (搜 "beach" / "safeswim"), BBQ/野餐区, 公厕

## 🔜 P1 — 待接入
| 源 | 内容 | 门槛 |
|---|---|---|
| LINZ Data Service (data.linz.govt.nz) | 官方地名、保护区边界、地形底图 | 免费 API key |
| Wellington City Council open data | 公园/海滩/步道 | ArcGIS Hub, 免认证 |
| Christchurch City Council open data | 同上 | 免认证 |
| Fish & Game NZ | 钓点规则 | 需确认 licence |

## ❌ 禁用源 (无明确 API/licence)
Google Maps · Google Search · AllTrails · Trade Me · Homes.co.nz · 商业旅游网站

## 铁律
1. `source_name` / `source_url` / `source_id` / `last_updated` 永远入库并展示
2. 官方数据没有的字段 = null → UI 显示 "Unknown"
3. OSM 数据可用但必须标 `source_name = 'OpenStreetMap'`
