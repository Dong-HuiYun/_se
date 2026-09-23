# 本機 PDF 工具箱（多頁版）

## 這次改了什麼

專案從「單一頁面」改成「首頁 + 各工具獨立頁面」的多頁架構（Vite 的 Multi-Page App 模式）：

```
local-pdf-tool/
├── index.html              ← 首頁，工具卡片入口
├── vite.config.js          ← 改成多入口打包設定
├── tools/
│   └── merge/
│       └── index.html      ← PDF 合併工具（原本的 index.html 搬過來這裡）
└── src/
    ├── style.css
    └── merge.js             ← 原本的 main.js，改名成 merge.js
```

之後每新增一個工具，就是照 `tools/merge/` 的樣子，多開一個
`tools/rotate/index.html`、`src/rotate.js`，再到 `vite.config.js` 的
`build.rollupOptions.input` 補一行、首頁補一張卡片就完成串接。

## 覆蓋方式

把這次的檔案覆蓋 / 新增到你原本的 `local-pdf-tool` 資料夾：

- `index.html` → **直接覆蓋**（內容從合併工具換成首頁了）
- `vite.config.js` → **直接覆蓋**
- `tools/merge/index.html` → **新增**這個資料夾與檔案
- `src/merge.js` → **新增**（內容跟你原本 `src/main.js` 一樣，只是改了檔名）
- `src/style.css` → 內容沒變，不用動

你原本的 `src/main.js` 可以留著或刪掉都沒差，反正現在沒有任何 HTML 在引用它了
（引用的對象改成 `src/merge.js`）。

## 執行

跟之前一樣：

```bash
npm run dev
```

- 首頁：`http://localhost:5173/`
- PDF 合併工具：`http://localhost:5173/tools/merge/`

首頁點「PDF 合併與排序」的卡片就會導到合併工具頁面，其他卡片目前是
「即將推出」的靜態展示，之後做好對應工具再把連結接上去即可。

## 打包上線

```bash
npm run build
```

因為 `vite.config.js` 裡已經把 `index.html` 和 `tools/merge/index.html`
都列進 `rollupOptions.input`，打包後 `dist/` 資料夾會同時包含首頁和工具頁面，
兩個路徑都能正常訪問，靜態部署平台（Vercel、Netlify 等）不用額外設定。
