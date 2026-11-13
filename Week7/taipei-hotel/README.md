# 旅館網站：後端 + 四組測試

網站原本是**純前端**，作業要求「後端一定要測」，所以我把前端 JavaScript 裡的商業邏輯抽出來做成 Node.js + Express 後端，並由它提供網頁與 Web API。前端檔案在 `public/`，**內容沒有修改**。

涵蓋 9 間旅館：A1 凱達、A2 W、A3 寒舍艾美、B1 君悅、B2 晶華、B3 遠東國際、C1 美好境界西門館、C2 喜來登、C3 德立莊。

## 專案結構

```
public/                 前端：index、hotel_interface、A1~C3 詳情頁、A/B/C 訂房頁、CSS
server/
  app.js                Express app 與所有 API
  store.js              記憶體資料庫（訂單、願望清單、設施預約）
  services/
    hotels.js           旅館目錄與各類別房型 / 價格
    pricing.js          日期驗證、價格試算
    classifier.js       語音文字 → 使用者類型 A/B/C
    chat.js             A/B/C 三類 AI 客服回覆
    validators.js       訂房 / 設施預約驗證
tests/
  unit/                 1. 單元測試（Jest）
  api/                  2. 系統測試：Web API（Jest + Supertest）
  contract/             前端頁面 ↔ 後端資料的契約測試（Jest，直接讀 public/ 的 HTML）
  e2e/                  3. E2E（Playwright 無頭 Chromium）
```

## 執行

```bash
npm install
npx playwright install chromium   # 第一次
npm start                         # http://localhost:3000
npm test                          # 單元 + API + 契約（含覆蓋率）
npm run test:e2e                  # E2E（自動啟動伺服器於 3100 埠）
npm run test:all                  # 全部
npx playwright show-report
```

## API

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/health` | 健康檢查 |
| POST | `/api/classify` | `{text}` → 使用者類型 A/B/C |
| GET | `/api/recommendations?type=A` | 該類型的 3 間旅館（對應 hotel_interface） |
| GET | `/api/hotels[?category=B]`、`/api/hotels/:id`、`/api/hotels/:id/rooms` | 旅館目錄與房型 |
| GET | `/api/rooms`、`/api/rooms/:id` | 舊路徑，等同 A1 |
| POST | `/api/quote` | `{hotelId?, roomType, checkin, checkout, rooms?}` 價格試算（5% 服務費 + 6% 稅，四捨五入） |
| POST | `/api/bookings` | 建立訂單（`hotelId` 預設 A1；房型必須屬於該旅館） |
| GET / DELETE | `/api/bookings/:id` | 查詢 / 取消 |
| GET | `/api/wishlist` | 願望清單 |
| PUT / DELETE | `/api/wishlist/:hotelId` | 加入 / 移除（冪等，9 間都可） |
| POST | `/api/chat` | `{message, hotelId?}` AI 客服（A/B/C 三套規則） |
| POST | `/api/facility-bookings` | 游泳池 / 健身教練 / 會議室（A 類頁面的功能） |

## 測試各測什麼

1. **單元測試**：計價與四捨五入、日期邊界、分類優先順序、三類聊天規則、驗證、store、旅館目錄（含「回覆不會出現其他旅館名稱」的全組合檢查）。
2. **系統測試（API）**：對整個 app 發 HTTP 請求，驗證狀態碼、錯誤處理（壞 JSON、過大、例外不洩漏）、9 間旅館的報價 / 訂房 / 願望清單 / 聊天、所有頁面是否都由伺服器提供。
3. **契約測試**：讀取 `public/*.html`，確認前端寫死的資料與後端一致：推薦頁的旅館名稱與連結、三個訂房頁的 `roomData`、選房後的跳轉目標、`getAIResponse` 的回覆（用 `vm` 實際執行前端函式）。
4. **E2E**：語音推薦流程、推薦頁（A/B/C 內容、限時倒數）、9 間旅館詳情頁（房型彈窗 → 訂房頁、願望清單、AI 聊天）、C 類倒數、A/B/C 訂房頁、跨頁完整流程；部分測試會把畫面結果和後端 API 對照。

## 前端已知問題（以 `test.fail` / `test.failing` 記錄，修好後會提醒你移除標記）

| # | 問題 | 位置 |
|---|---|---|
| 1 | **B3 整頁是君悅的複製品**：標題、主標題、聊天、通知都寫「台北君悅酒店」，應為「台北遠東國際大飯店」 | `B3_detail.html` |
| 2 | **A2/A3 聊天自稱「台北凱達大飯店」**，願望清單通知也是凱達；B2/B3 寫君悅；C2/C3 寫美好境界西門館 | 各複製頁面 |
| 3 | 複製頁面的「位置」回覆沿用 1 號旅館的說明，A3 的地址也是凱達的 | A2/A3/B2/B3/C2/C3 |
| 4 | **願望清單所有旅館共用同一個 localStorage 鍵**：在 A2 加入後，A3、B1… 都顯示已加入。C2/C3 則完全沒有儲存 | 所有詳情頁 |
| 5 | 選好房型後改日期，價格退回預設房型（頁面載入時就刪掉 `selectedRoomType`） | `A1_room1_page.html` |
| 6 | 同類別共用一個訂房頁：訂 W 飯店時，標題與房型圖仍是凱達（B2/B3、C2/C3 同理） | `*1_room1_page.html` |
| 7 | 訂房成功訊息固定寫「台北君悅酒店」（A、C 類訂房頁） | `A1/C1_room1_page.html` |
| 8 | A 類價格回覆「小型套房 2，701」與訂房頁 3,685 不一致，且有「起起」 | `A1/A2/A3_detail.html` |
| 9 | `hotel_interface.html?type=X`（無效類型）整頁空白；註解寫預設 A，實際預設 B | `hotel_interface.html` |
| 10 | `index.html` 找不到 `#continueBtn`；A 類聊天輸入框的 `handleKeyPress` 未定義（會丟錯） | `index.html`、A 類詳情頁 |
| 11 | 金額未四捨五入（如 `TWD 12,271.05`）；退房早於入住時用 `Math.abs` 默默接受 | 三個訂房頁 |
| 12 | C 類倒數結束時，`updateCountdown()` 先於 `setInterval` 指派，造成多個計時器重疊 | `hotel_interface.html` |
| 13 | C1 沒有「加入願望清單」按鈕，C2/C3 有 | `C1_detail.html` |
| 14 | C 類房型彈窗卡片名稱（輕奢背包房）與傳給 `selectRoom` 的名稱（豪華雙人房）不一致 | `C1~C3_detail.html` |

## 備註

- E2E 擋掉外部 CDN（Font Awesome、Leaflet、地圖圖磚），不需要網路，也不測地圖。
- 目前前端沒有呼叫後端 API；若老師要求串接，可把 `fetch('/api/...')` 接上對應函式。
- 同類別的旅館共用房型與價格（因為共用同一個訂房頁）；後端目錄照此建模。
