# NZ Outdoor 🌿

> 把新西兰分散的公共户外数据，做成一个所有人都可以免费使用的 Outdoor Discovery Layer。
> 第一阶段: Data → Map → Discovery → Check-in

## 架构速览
- **App**: Expo + React Native + Expo Router (`app/`)
- **后端**: Supabase (Postgres + PostGIS + Auth + RPC) — 无手写服务器
- **地图**: MapLibre + 自托管 PMTiles (≈$0/月)
- **数据管道**: Python ETL (`etl/`) + GitHub Actions 每周定时
- 详细架构见 `docs/` 与决策记录 (Step 1 文档)

## 快速开始

### 1. 数据库 (5 分钟)
```bash
# 装 Supabase CLI 后:
supabase init
supabase start              # 本地开发库
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql
psql "$SUPABASE_DB_URL" -f supabase/seed.sql   # Auckland 8 个种子点
```

### 2. ETL (可选, 需要 council 图层 URL)
```bash
cd etl
pip install -r requirements.txt
# 到 https://data-aucklandcouncil.opendata.arcgis.com 打开数据集页
# → "View API resources" → 复制 GeoService URL 填入 config.yaml
python run.py --source auckland_council
```

### 3. App（预览 = 本机模拟器/真机，不是 Vercel）
```bash
cd app
cp .env.example .env        # 填入 Supabase URL + anon key
npm install
npx expo prebuild           # MapLibre 是原生模块，不能用 Expo Go
npx expo run:ios            # 或 run:android — 首次会编译 dev client
npm start                   # 之后改 JS 可热更新，仍用同一个 dev client
```

**环境分工**
| 用途 | 工具 |
|------|------|
| 日常预览 | 本机 Xcode Simulator / Android Emulator，或 USB 真机 + dev client |
| 给测试员装包 | [Expo EAS Build](https://docs.expo.dev/build/introduction/) → TestFlight / 内测 APK |
| 正式上架 | EAS Submit → App Store / Google Play |
| 后端 | [Supabase Cloud](https://supabase.com)（Auth + DB + RPC） |
| 数据同步 | GitHub Actions 跑 `etl/`（已有 workflow） |

**推荐下一步（按顺序）**
1. Supabase 建项目 → Dashboard 跑 migration/seed（或 CLI `db push`）→ 复制 URL + anon key 到 `app/.env`
2. 本机 `cd app && npm install && npx expo prebuild && npx expo run:ios`（或 Android）
3. 打开 Explore：应看到 MapLibre 底图 + 8 个 Auckland 种子点
4. （可选）Council 图层 URL 进 `etl/config.yaml`，`python run.py` 灌更多点
5. `npm i -g eas-cli && eas login && eas build:configure`，打第一个 **development** 或 **preview** 包装到真机
6. M2：地图 marker 样式、Search 筛选；M3：Auth + Check-in + Passport

## 数据原则 (不可妥协)
1. 只用官方公开数据 (DOC / LINZ / councils / OSM 标注来源)
2. 不碰 Google Maps / AllTrails / Trade Me 等商业源
3. 官方没有的字段 = null → UI 显示 "Unknown", 绝不猜
4. 每个地点带 source_name / source_url / source_id / last_updated

## 路线图
- [x] M1 骨架: schema + RPC + seed + app 壳 + ETL 管道
- [ ] M2: Home Map 真实渲染 + Search 筛选打磨 (Step 6)
- [ ] M3: Auth (magic link/Google/Apple) + Check-in + Passport 地图 (Step 7)
- [ ] M4: DOC API 接入 (需注册 key) + 数据扩展到 1k+ (Step 8)

## 待办 (下一步)
1. ~~注册 DOC API key~~ ✅ 2026-09-24 已注册 (key 存 .env / GitHub Secrets)
   - 验证 key: `curl -H "x-api-key: $DOC_API_KEY" "https://api.doc.govt.nz/api/tracks?limit=1"`
     (确切端点路径以 DOC Developer Portal → API 文档页为准; 返回 200 + JSON 即成功)
2. 从 Auckland Council hub 复制 2-3 个图层 URL 填进 config.yaml
3. `supabase db push` 到云端项目, app/.env 填云端凭证
4. 首次全量: `python etl/run.py --source doc_api` (按 portal 文档核对 doc_api.py 里的字段映射)
