# 本機 PDF 合併工具

## 這個資料夾怎麼用

你已經跑過：

```bash
npm create vite@latest local-pdf-tool -- --template vanilla
cd local-pdf-tool
npm install pdf-lib pdfjs-dist
npm install -D tailwindcss
```

現在把這個壓縮檔裡的檔案，**覆蓋到你原本 `local-pdf-tool` 資料夾裡對應的位置**：

```
local-pdf-tool/
├── index.html          ← 覆蓋原本 Vite 產生的版本
├── vite.config.js       ← 新增這個檔案
├── src/
│   ├── style.css        ← 覆蓋原本的版本
│   └── main.js          ← 覆蓋原本的版本
```

Vite 預設模板裡其他檔案（`src/counter.js`、`src/javascript.svg`、`public/vite.svg` 等）用不到，
可以刪掉，留著也不影響運作。

## 安裝剩下需要的套件

Tailwind v4 對 Vite 專案要用官方外掛，不是走 `npx tailwindcss init -p` 那一套：

```bash
npm install -D @tailwindcss/vite
```

## 執行

```bash
npm run dev
```

終端機會印出一個網址，通常是 `http://localhost:5173`，打開瀏覽器貼上去就能看到畫面。
改任何程式碼存檔會自動重新整理（HMR）。

## 打包上線

```bash
npm run build
```

會產生 `dist/` 資料夾，裡面是純靜態檔案（沒有後端）。想預覽打包後的結果可以跑：

```bash
npm run preview
```

正式上線就是把 `dist/` 整個資料夾丟給 Vercel、Netlify、Cloudflare Pages 或 GitHub Pages 這類靜態託管，
免費且不需要伺服器——因為所有 PDF 運算都在使用者的瀏覽器裡完成。

## 常見問題

**執行 `npm run dev` 後出現找不到 `pdf.worker.min.mjs` 的錯誤：**

不同版本的 `pdfjs-dist` 打包出來的 worker 檔名可能不一樣。打開
`node_modules/pdfjs-dist/build/` 這個資料夾，看實際的檔名是什麼（可能是
`pdf.worker.min.mjs`、`pdf.worker.mjs`，或帶版本號的檔名），然後把
`src/main.js` 最上面這一行改成對應的檔名：

```javascript
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
```

**畫面沒有套用 Tailwind 樣式：**

確認 `vite.config.js` 有正確引入 `@tailwindcss/vite`，以及 `src/style.css`
第一行是 `@import "tailwindcss";`（不是舊版的三行 `@tailwind` 指令），
改完後重新跑一次 `npm run dev`。

**跟網頁上看到的 Artifact 版本比，這裡少了什麼：**

下載的觸發方式不一樣。Artifact 版本因為跑在 Claude 平台上，用的是平台專屬的
`claude.use('downloads')` API；這裡是一般網站，改用瀏覽器原生的
`URL.createObjectURL` + `<a download>`，功能完全一樣，只是實作方式配合
執行環境不同。
