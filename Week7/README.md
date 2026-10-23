# 第七週：針對網站進行測試

## 1. 專案結構

- 校務系統測試

- 臺北旅館預訂網頁

## 2. 測試項目

- 單元測試 (後端 server 一定要測, 例如 rust, 前端 client 可以不測，例如 node.js)
- 系統測試 （web api 測試）
- e2e測試 (無頭瀏覽器，playwright)

## 3. 測試所需指令

```bash
npm install
npx playwright install chromium     # 只需第一次，下載無頭瀏覽器

npm start                 # 啟動網站 http://localhost:3000
npm run test:unit         # 單元測試
npm run test:api          # 系統測試（API）
npm test                  # 單元 + API，並顯示覆蓋率
npm run test:e2e          # E2E（會自動啟動伺服器於 3100 埠）
npm run test:all          # 全部
npx playwright show-report   # 看 E2E 的 HTML 報告
```