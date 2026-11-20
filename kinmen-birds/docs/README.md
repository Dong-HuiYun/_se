# 🐦 金門 WebGL 鳥類生態互動地圖

> Kinmen Bird Ecology Interactive Map

軟體工程期末專案。以金門的真實賞鳥熱點（慈湖、陵水湖、雙鯉湖、田埔水庫）為場景，在 WebGL 地圖上用 3D 鳥類模型標示各鳥種的棲地分佈，並規劃結合使用者賞鳥回報、AI 導覽與鳥鳴音訊，讓民眾能直覺地認識金門鳥類生態。全站部署於 Cloudflare 生態系。

## 目錄

- [功能特色](#功能特色)
- [技術棧](#技術棧)
- [系統架構](#系統架構)
- [專案結構](#專案結構)
- [快速開始](#快速開始)
- [API 一覽](#api-一覽)
- [資料庫設計](#資料庫設計)
- [部署](#部署)
- [開發路線圖](#開發路線圖)
- [常見問題](#常見問題)
- [資料來源與授權](#資料來源與授權)

## 功能特色

**第一階段（開發中）：地圖骨架與 3D 標記**

- 以 MapLibre GL JS 呈現金門地圖，圖資使用免費開源的 OpenFreeMap
- 以 Three.js 自訂圖層（custom layer）在地圖上渲染 3D 鳥類模型，會旋轉、浮動，並隨縮放維持適當的螢幕大小
- 同一地點有多種鳥時自動環狀散開，避免重疊
- 左側鳥種列表可篩選，地圖自動縮放到該鳥種的棲地範圍
- 點擊 3D 鳥類顯示詳細資訊：習性、留鳥/候鳥類型、出現月份、IUCN 與保育等級、觀察地點與建議季節
- 顯示「本月可見」提示，協助規劃賞鳥時間

**第二階段（規劃中）：互動與媒體**

- 賞鳥打卡回報表單，以 Cloudflare Turnstile 防止機器人
- 回報預設待審核，通過後才顯示於地圖
- 從 R2 提供鳥類圖片與鳥鳴音訊（.mp3）播放

**第三階段（規劃中）：AI 與完善**

- 以 Cloudflare Workers AI（Llama 3.1 8B Instruct）提供金門鳥類導覽問答
- 使用者照片上傳至 R2
- 效能優化、部署與期末報告文件

## 技術棧

| 層級 | 技術 |
|---|---|
| 前端框架 | React、Vite、TypeScript、Tailwind CSS v4 |
| 地圖 | MapLibre GL JS v5（OpenFreeMap `liberty` 樣式） |
| 3D 渲染 | Three.js（MapLibre custom layer，程式生成低多邊形鳥模型） |
| 後端框架 | Hono + TypeScript |
| 執行環境 | Cloudflare Workers（API）、Cloudflare Pages（前端） |
| 資料庫 | Cloudflare D1（SQLite）+ Drizzle ORM |
| 物件儲存 | Cloudflare R2（圖片、音訊、GLB 模型） |
| AI | Cloudflare Workers AI（`@cf/meta/llama-3.1-8b-instruct`） |
| 安全 | Cloudflare Turnstile |
| 套件管理 | pnpm workspaces（Monorepo） |

> MapLibre 請使用 v5（`maplibre-gl@5`）。自訂圖層的 render 介面使用 v5 的 `defaultProjectionData.mainMatrix`。

## 系統架構

```
┌────────────────────────┐        ┌──────────────────────────────┐
│  Cloudflare Pages      │  HTTP  │  Cloudflare Workers          │
│  React + MapLibre      │ ─────▶ │  Hono API                    │
│  + Three.js            │        │                              │
└────────────────────────┘        │   ├─▶ D1 (Drizzle ORM)       │
                                  │   ├─▶ R2 (圖片/音訊/GLB)      │
                                  │   ├─▶ Workers AI             │
                                  │   └─▶ Turnstile 驗證          │
                                  └──────────────────────────────┘
```

- 前端與 API **分開部署**，以環境變數 `VITE_API_BASE` 連接；本機開發時由 Vite 將 `/api` 代理到 `localhost:8787`
- 共用型別放在 `packages/shared`，前後端引用同一份，避免 API 契約不同步
- R2 資料表只存物件 key，不存完整網址，之後更換網域或 CDN 不需改資料

## 專案結構

```
kinmen-birds/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── README.md
│
├── apps/
│   ├── api/                      # Hono → Cloudflare Workers
│   │   ├── wrangler.toml
│   │   ├── drizzle.config.ts
│   │   ├── migrations/           # drizzle-kit 產生的 SQL
│   │   ├── seed/seed.sql         # 種子資料
│   │   └── src/
│   │       ├── index.ts          # 進入點、CORS、路由掛載
│   │       ├── env.ts            # Bindings 型別
│   │       ├── db/               # schema.ts、client.ts
│   │       └── routes/           # birds.ts、sightings.ts（後續：reports、media、ai）
│   │
│   └── web/                      # React → Cloudflare Pages
│       ├── vite.config.ts
│       └── src/
│           ├── App.tsx
│           ├── api/client.ts
│           ├── lib/placement.ts  # 同地點散開、模型尺寸計算
│           └── components/
│               ├── map/          # KinmenMap.tsx
│               ├── three/        # BirdLayer.ts、birdModel.ts
│               └── bird/         # BirdList.tsx、DetailPanel.tsx
│
└── packages/
    └── shared/                   # 前後端共用型別與常數（@kinmen/shared）
        └── src/                  # index.ts、types.ts
```

## 快速開始

### 環境需求

- Node.js 20 以上
- pnpm 9 以上
- Cloudflare 帳號（僅部署時需要，本機開發不用）

### 安裝與啟動

```bash
# 1. 安裝依賴
pnpm install

# 2. 建立本機資料庫（在專案根目錄執行）
pnpm --filter api db:generate         # 依 schema 產生 migration
pnpm --filter api db:migrate:local    # 套用到本機 D1
pnpm --filter api db:seed:local       # 匯入種子資料

# 3. 啟動（需開兩個終端機）
pnpm dev:api     # API：http://localhost:8787
pnpm dev:web     # 前端：http://localhost:5173
```

### 驗證後端

```bash
curl http://localhost:8787/api/health
curl http://localhost:8787/api/birds
curl "http://localhost:8787/api/sightings?bird=black-faced-spoonbill"
```

## API 一覽

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/health` | 健康檢查 |
| GET | `/api/birds` | 取得所有鳥類 |
| GET | `/api/birds/:slug` | 取得單一鳥類 |
| GET | `/api/sightings` | 取得所有棲地座標 |
| GET | `/api/sightings?bird=:slug` | 取得單一鳥種的棲地座標 |
| POST | `/api/reports` | 提交賞鳥回報（第二階段） |
| GET | `/api/media/:key` | 從 R2 取得圖片／音訊（第二階段） |
| POST | `/api/ai/ask` | AI 導覽問答（第三階段） |

## 資料庫設計

三張主要資料表，定義於 `apps/api/src/db/schema.ts`：

| 資料表 | 用途 |
|---|---|
| `birds` | 鳥類基本資料：中英文名、學名、習性、留候鳥類型、出現月份、保育等級、R2 媒體 key |
| `sightings` | 官方／研究的棲地座標分佈（可信資料），由管理員維護 |
| `user_reports` | 使用者打卡回報（群眾資料），預設 `pending`，審核通過才顯示 |

設計重點：

- `sightings` 與 `user_reports` 分開，前端可分圖層呈現可信度不同的資料
- 回報只存 IP 的雜湊值（`ip_hash`）用於頻率限制，不存明碼
- Turnstile token 只在 Worker 端向 Cloudflare 驗證一次，不入庫

### 種子資料

預設五種金門代表性鳥類：鸕鶿、栗喉蜂虎、戴勝、黑面琵鷺、環頸雉，分布於慈湖、陵水湖、雙鯉湖、田埔水庫。座標為近似值（約 ±1 公里），僅供開發測試，正式展示前請對照實際地圖校正。

## 部署

### 1. 後端（Cloudflare Workers）

```bash
cd apps/api

# 建立 D1 資料庫，將輸出的 database_id 填入 wrangler.toml
npx wrangler d1 create kinmen-birds

# 套用 migration 與種子資料到遠端
pnpm db:migrate:remote
pnpm db:seed:remote

# 部署
pnpm deploy
```

部署前請在 `wrangler.toml` 將 `ALLOWED_ORIGIN` 改成實際的 Pages 網址，以通過 CORS。

### 2. 前端（Cloudflare Pages）

- Build command：`pnpm --filter web build`
- Build output directory：`apps/web/dist`
- 環境變數：`VITE_API_BASE` 設為 Worker 的網址（例如 `https://kinmen-birds-api.<帳號>.workers.dev`）

## 開發路線圖

- [x] 專案架構與資料庫 Schema、種子資料
- [ ] **第一階段**：後端 API、MapLibre 地圖、Three.js 3D 鳥類標記、篩選與詳細面板
- [ ] **第二階段**：回報表單 + Turnstile、R2 圖片與鳥鳴、回報審核流程
- [ ] **第三階段**：Workers AI 導覽、照片上傳、效能與部署打磨、期末報告

## 常見問題

**`pnpm --filter api ...` 出現 `No projects matched the filters`**
pnpm 找不到名為 `api` 的套件。請確認 `apps/api/package.json` 存在、不是空檔案，且 `name` 為 `"api"`；用 `pnpm ls -r --depth -1` 可列出 pnpm 認得的所有專案。

**`ERR_PNPM_PACKAGE_MANIFEST_SERIALIZATION_ERROR`**
某個 `package.json` 是空檔案或格式錯誤，補上內容並存檔即可。

**地圖上的鳥落在海上或陸地上不合理的位置**
種子座標為估計值，請編輯 `apps/api/seed/seed.sql` 校正後重新匯入。

**專案路徑含中文導致工具異常**
少數工具在非 ASCII 路徑下可能出問題，可先將專案移到純英文路徑（例如 `C:\dev\kinmen-birds`）。

## 資料來源與授權

- 底圖：[OpenFreeMap](https://openfreemap.org/)，資料來自 © [OpenStreetMap](https://www.openstreetmap.org/copyright) 貢獻者。地圖右下角的版權標示請勿移除
- OpenFreeMap 公開服務為 as-is 提供，可能變動或停止；若需穩定服務，可自行架設
- 3D 模型為程式生成的簡化幾何體，不使用第三方模型
- 鳥類描述為專案內撰寫的簡介；保育等級等資料請以主管機關最新公告為準
- 授權：待補（請依課程要求或個人需求填寫，例如 MIT）
