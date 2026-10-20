import './style.css';

// [資料夾名, 圖示, 標題, 說明]  —— 新增工具時，在這裡加一行就會多一張卡片
const tools = [
  ['merge', '📎', 'PDF 合併與排序', '拖曳多個檔案，跨檔案調整頁面順序、刪除頁面，一鍵合併匯出。'],
  ['rotate', '🔄', '頁面旋轉與校正', '掃描檔橫倒、顛倒？一鍵轉正單頁或整份文件。'],
  ['split', '✂️', '分割與擷取頁面', '輸入頁碼區間，或每 N 頁自動切成獨立檔案。'],
  ['watermark', '💧', '浮水印與頁碼', '壓上防偽浮水印，補上統一格式的頁碼。'],
  ['nup', '🧾', '發票 N-Up 拼貼', '多張電子發票排成一張 A4，附裁切虛線。'],
  ['redact', '⬛', '隱私塗黑', '框選要遮的區域，整頁轉成圖片，底層文字無法還原。'],
  ['interleave', '📠', '雙面掃描交錯合併', '正面一疊 + 背面一疊，自動縫合成完整文件。'],
  ['compress', '🗜️', 'PDF 壓縮', '輕量最佳化，或轉成圖片大幅縮小檔案。'],
];

document.getElementById('grid').innerHTML = tools
  .map(
    ([dir, icon, title, desc]) => `
    <a href="/tools/${dir}/" class="group bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-2 shadow-sm hover:shadow-md hover:border-teal-300 transition">
      <span class="text-3xl">${icon}</span>
      <h3 class="font-semibold text-slate-800">${title}</h3>
      <p class="text-sm text-slate-500 flex-1">${desc}</p>
      <span class="text-sm font-semibold text-teal-600 group-hover:underline">開始使用 →</span>
    </a>`
  )
  .join('');
