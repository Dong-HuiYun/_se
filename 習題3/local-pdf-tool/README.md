# 本機 PDF 工具箱

八個工具，全部在瀏覽器本機運算，檔案不會上傳。

## 專案結構

```
local-pdf-tool/
├── index.html            首頁（卡片由 src/home.js 產生）
├── vite.config.js        多頁打包設定（工具清單在最上面的 tools 陣列）
├── tools/<名稱>/index.html   每個工具一個入口
└── src/
    ├── style.css         Tailwind v4（一行 @import）
    ├── common.js         共用函式：上傳區、讀檔、渲染頁面、下載、版面外框
    ├── ranges.js         頁碼區間解析（"1-3, 5, 8-10"）
    ├── merge.js / rotate.js          先前做好的兩個（維持原樣）
    └── split.js / watermark.js / nup.js / redact.js / interleave.js / compress.js
```

不需要安裝任何新套件，依賴跟之前一樣（pdf-lib、pdfjs-dist、tailwindcss、@tailwindcss/vite）。

## 覆蓋方式

解壓縮後，把整包檔案複製進你的 `local-pdf-tool` 資料夾，遇到同名檔案選擇「取代」即可
（`package.json`、`node_modules` 不在壓縮檔裡，不會被動到）。然後：

```bash
npm run dev
```

## 各工具的實作方式與限制（請看一下）

| 工具 | 做法 | 限制 |
|---|---|---|
| 分割與擷取 | pdf-lib `copyPages`，保留文字與向量 | 無 |
| 浮水印與頁碼 | 浮水印用 canvas 畫成透明 PNG 再平鋪（中文不需字型檔）；頁碼用 Helvetica | 頁碼只支援英數格式；若頁面本身帶有旋轉屬性，浮水印/頁碼方向可能跟畫面不同 |
| 發票 N-Up | pdf.js 把每頁轉成圖片（約 144dpi）貼進 A4 格子，`drawLine` 畫虛線 | 輸出是圖片，文字不可選取 |
| 隱私塗黑 | 整份文件轉成圖片後燒入純黑色塊，輸出是全新 PDF | 所有頁面都變成圖片（這正是它安全的原因）；檔案可能變大 |
| 雙面交錯合併 | 第二疊（可選擇反轉）與第一疊逐頁交錯 | 兩份頁數不同時，多的頁面接在最後 |
| PDF 壓縮 | 「輕量」重建文件移除未引用物件；「圖片」轉成 JPEG | 輕量模式效果有限；圖片模式文字無法選取，純文字 PDF 甚至可能變大（畫面會提醒） |

壓縮工具沒有叫「無損壓縮」，因為不用 WebAssembly（Ghostscript 等）就做不到真正的無損、
保留文字的深度壓縮；那是之後可以升級的方向。

## 如果某個頁面「點了沒反應」

按 F12 → Console 看紅字。最常見的原因是對應的 `src/<名稱>.js` 沒有被複製進來，
或 `node_modules/pdfjs-dist/build/` 裡的 worker 檔名跟 `src/common.js`（以及 merge.js、rotate.js）
開頭 import 的不一致。

## 新增工具的流程

1. 複製 `tools/split/` 成 `tools/<新名稱>/`，把 HTML 裡的 `/src/split.js` 改成 `/src/<新名稱>.js`
2. 寫 `src/<新名稱>.js`（參考 split.js：`mountShell` → 填 `panel.innerHTML` → `setupDropzone`）
3. `vite.config.js` 的 `tools` 陣列加上名稱；`src/home.js` 的 `tools` 陣列加一行
