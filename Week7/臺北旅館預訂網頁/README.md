# 旅館網站：後端 + 三層測試

你的網站原本是**純前端**（沒有伺服器），而作業要求「後端一定要測」，所以我把前端裡本來寫在 JavaScript 的**商業邏輯**抽出來做成一個 Node.js + Express 後端，並用它提供網頁與 Web API。前端檔案放在 `public/`，**內容沒有修改**。

## 專案結構

```
hotel-site/
├─ public/                  你的前端（index.html、A1_detail.html、A1_detail.css、A1_room1_page.html）
├─ server/
│  ├─ app.js                Express app 與所有 API 路由
│  ├─ server.js             啟動入口
│  ├─ store.js              記憶體資料庫（訂單、願望清單、設施預約）
│  └─ services/
│     ├─ pricing.js         房型、日期驗證、價格試算
│     ├─ classifier.js      語音文字 → 使用者類型 A/B/C
│     ├─ chat.js            AI 客服關鍵字回覆
│     └─ validators.js      訂房 / 設施預約的輸入驗證
├─ tests/
│  ├─ unit/                 1. 單元測試（Jest）
│  ├─ api/                  2. 系統測試（Jest + Supertest，打 Web API）
│  └─ e2e/                  3. E2E 測試（Playwright，無頭瀏覽器）
└─ playwright.config.js
```

## 執行方式

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

## API 一覽

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/health` | 健康檢查 |
| POST | `/api/classify` | `{text}` → 使用者類型 A/B/C |
| GET | `/api/rooms`、`/api/rooms/:id` | 房型列表 / 單一房型 |
| POST | `/api/quote` | 價格試算（房價 + 5% 服務費 + 6% 稅） |
| POST | `/api/bookings` | 建立訂單（201） |
| GET / DELETE | `/api/bookings/:id` | 查詢 / 取消訂單 |
| GET | `/api/wishlist` | 願望清單 |
| PUT / DELETE | `/api/wishlist/:hotelId` | 加入 / 移除（冪等） |
| POST | `/api/chat` | AI 客服回覆 |
| POST | `/api/facility-bookings` | 游泳池 / 健身教練 / 會議室預約（名額滿回 409） |

## 三層測試各測什麼

1. **單元測試**（`tests/unit`）：不啟動伺服器，直接呼叫函式。涵蓋計價與四捨五入、日期邊界（閏年、不存在的日期）、分類優先順序、聊天規則順序、各種輸入驗證、store 行為。
2. **系統測試**（`tests/api`）：用 Supertest 對整個 Express app 發 HTTP 請求，驗證狀態碼、回應內容、錯誤處理（壞 JSON → 400、過大 → 413、例外 → 500 且不洩漏訊息）、完整流程（試算 → 訂房 → 查詢 → 取消），以及靜態網頁是否正確提供。
3. **E2E 測試**（`tests/e2e`）：Playwright 以無頭 Chromium 操作真實頁面：語音推薦與跳轉、願望清單、房型彈窗、景點切換、AI 聊天、設施預約、訂房表單，以及「詳情頁 → 訂房頁 → 預訂成功」的跨頁流程。另外有幾個測試把**前端顯示的結果與後端 API 對照**（房價、聊天回覆）。

## 測試中發現的前端問題

| # | 問題 | 位置 |
|---|---|---|
| 1 | 聊天回覆「小型套房 TWD 2，701」與訂房頁的 3,685 不一致，且有多餘的「起起」字樣。後端已改正為 3,685，因此前後端聊天只有「價格」這一句不同 | `A1_detail.html` `getAIResponse` |
| 2 | 選好房型後改日期，價格會退回預設房型：`selectedRoomType` 在頁面載入時就被刪除（已用 `test.fail` 記錄） | `A1_room1_page.html` |
| 3 | `index.html` 找不到 `#continueBtn`，結尾 `addEventListener` 會丟 TypeError | `index.html` |
| 4 | `handleKeyPress` 未定義，聊天輸入框每按一鍵都會丟 ReferenceError | `A1_detail.html` |
| 5 | 訂房成功訊息寫「台北君悅酒店」，其他地方是「台北凱達大飯店」 | `A1_room1_page.html` |
| 6 | 前端金額未四捨五入（例：`TWD 12,271.05`），後端試算回傳整數 | `A1_room1_page.html` |
| 7 | 退房日早於入住日時，前端用 `Math.abs` 默默接受；後端會回 400 | `A1_room1_page.html` |

## 備註

- E2E 擋掉了外部 CDN（Font Awesome、Leaflet、地圖圖磚），所以不需要網路，也不測地圖。
- `index.html` 會跳轉到 `hotel_interface.html`，該檔不在目前檔案內，所以 E2E 用 stub 取代；你若有這個檔案，放進 `public/` 後可拿掉 stub。
- 前端目前沒有呼叫後端 API（維持你原本的程式）。若老師要求前端串接，可把 `fetch('/api/...')` 接上對應的函式。
