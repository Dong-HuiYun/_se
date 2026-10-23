# 國立浯江大學 教務資訊系統（示範專案）

Node.js (Express) 後端 REST API + 單頁式前端（`public/index.html`）+ 三層自動化測試。

## 專案結構

```
server/
  app.js              Express 路由、驗證/授權(RBAC)、統一錯誤處理
  index.js            啟動入口（預設 port 3000）
  lib/                純函式：成績換算/GPA、衝堂判斷、種子資料、記憶體 store
  services/           業務邏輯：auth / enrollment / grades / catalog
public/index.html     前端（React，瀏覽器內由 Babel 轉譯）
tests/unit/           ① 單元測試（後端服務層，node:test）
tests/api/            ② 系統測試（Web API，啟動真實 HTTP server + fetch）
e2e/                  ③ E2E 測試（Playwright 無頭瀏覽器）
playwright.config.js
```

## 安裝與執行

```bash
npm install
npm start                      # http://localhost:3000
```
示範帳號：學生 `S001`/`1234`、教師 `T001`/`1234`、管理者 `A001`/`1234`

## 執行測試（需 Node.js 18+，建議 20+）

| 作業要求 | 指令 | 內容 |
|---|---|---|
| 1. 單元測試（後端） | `npm run test:unit` | 成績/GPA 邊界值、衝堂、加退選規則、成績登錄驗證、CRUD 驗證、登入與改密碼 |
| 2. 系統測試（Web API） | `npm run test:api` | 登入、401/403/404/409、選課完整往返、教師登錄→學生查詢、管理員 CRUD、公告 |
| 全部（1+2） | `npm test` | |
| 3. E2E（Playwright） | 首次：`npx playwright install chromium`<br>之後：`npm run test:e2e` | 無頭 Chromium 操作真實畫面，涵蓋學生/教師/管理者與跨角色流程 |
| 覆蓋率 | `npm run coverage` | Node 內建 coverage |

E2E 失敗時可用 `npx playwright show-report` 檢視報告、截圖與 trace。
執行時自動啟動 server（port 3100），**需要可連網**（前端以 CDN 載入 React / Babel / Tailwind / 字型）。

## 注意事項

- 目前前端的資料存在瀏覽器 localStorage，**尚未改為呼叫後端 API**；E2E 測的是前端 UI 本身，單元/系統測試測的是後端。兩者規則一致（衝堂、額滿、GPA、等第…）。
- 後端資料為記憶體儲存（重啟即還原），密碼為明文——僅供教學示範，請勿用於正式環境。
