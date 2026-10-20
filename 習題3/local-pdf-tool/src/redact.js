import { PDFDocument } from 'pdf-lib';
import { $, cls, mountShell, setupDropzone, setStatus, showError, openPdf, renderPage, canvasToBytes, download, baseName } from './common.js';

const panel = mountShell({
  title: '本機隱私塗黑',
  desc: '在頁面上框選要遮蓋的區域（身分證、電話等）。輸出時整份文件會轉成圖片，底層文字不會留下，無法反白複製或還原。',
});

panel.innerHTML = `
  <div class="${cls.card} space-y-3">
    <p id="info" class="font-semibold text-sm"></p>
    <div class="flex items-center gap-2 flex-wrap">
      <button id="prev" class="${cls.secondary}">← 上一頁</button>
      <span id="pageLabel" class="text-sm font-semibold px-1"></span>
      <button id="next" class="${cls.secondary}">下一頁 →</button>
      <span class="flex-1"></span>
      <button id="undo" class="${cls.secondary}">復原上一個框</button>
      <button id="clearPage" class="${cls.secondary}">清除本頁</button>
    </div>
    <p class="text-xs text-slate-500">在頁面上按住滑鼠（或手指）拖曳，畫出要塗黑的範圍。畫面上的半透明黑框只是預覽，輸出時會是完全不透明的純黑。</p>
    <div class="overflow-auto">
      <div class="relative inline-block max-w-full">
        <canvas id="pageCanvas" class="block max-w-full h-auto border border-slate-200"></canvas>
        <canvas id="overlay" class="absolute inset-0 w-full h-full cursor-crosshair touch-none"></canvas>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <button id="runBtn" class="${cls.primary}">塗黑並下載（整份轉成圖片）</button>
      <span id="rectCount" class="text-xs text-slate-400"></span>
    </div>
  </div>`;

const pageCanvas = $('pageCanvas');
const overlay = $('overlay');
let current = null;
let pageNo = 1;
const rects = new Map(); // pageNo -> [{x,y,w,h}]（以頁面寬高的比例表示，0~1）
const rectsOf = (n) => rects.get(n) || [];

setupDropzone(async ([file]) => {
  setStatus('讀取中…');
  try {
    current?.close();
    rects.clear();
    current = await openPdf(file);
    $('info').textContent = `${file.name} · 共 ${current.numPages} 頁`;
    panel.hidden = false;
    await show(1);
    setStatus('');
  } catch (e) { showError(e); }
});

async function show(n) {
  pageNo = n;
  const { canvas } = await renderPage(current.doc, n, 1.4);
  pageCanvas.width = overlay.width = canvas.width;
  pageCanvas.height = overlay.height = canvas.height;
  pageCanvas.getContext('2d').drawImage(canvas, 0, 0);
  $('pageLabel').textContent = `第 ${n} / ${current.numPages} 頁`;
  $('prev').disabled = n <= 1;
  $('next').disabled = n >= current.numPages;
  redraw();
}

function redraw(preview) {
  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  for (const r of rectsOf(pageNo)) ctx.fillRect(r.x * overlay.width, r.y * overlay.height, r.w * overlay.width, r.h * overlay.height);
  if (preview) {
    ctx.fillStyle = 'rgba(220,38,38,0.35)';
    ctx.fillRect(preview.x, preview.y, preview.w, preview.h);
  }
  const total = [...rects.values()].reduce((s, a) => s + a.length, 0);
  $('rectCount').textContent = `已框選 ${total} 個區域（本頁 ${rectsOf(pageNo).length} 個）`;
}

const toCanvas = (e) => {
  const r = overlay.getBoundingClientRect();
  return { x: ((e.clientX - r.left) * overlay.width) / r.width, y: ((e.clientY - r.top) * overlay.height) / r.height };
};
const boxOf = (a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });

let start = null;
overlay.addEventListener('pointerdown', (e) => { overlay.setPointerCapture(e.pointerId); start = toCanvas(e); });
overlay.addEventListener('pointermove', (e) => { if (start) redraw(boxOf(start, toCanvas(e))); });
overlay.addEventListener('pointerup', (e) => {
  if (!start) return;
  const b = boxOf(start, toCanvas(e));
  start = null;
  if (b.w > 6 && b.h > 6) {
    const list = rectsOf(pageNo).slice();
    list.push({ x: b.x / overlay.width, y: b.y / overlay.height, w: b.w / overlay.width, h: b.h / overlay.height });
    rects.set(pageNo, list);
  }
  redraw();
});

$('prev').addEventListener('click', () => show(pageNo - 1));
$('next').addEventListener('click', () => show(pageNo + 1));
$('undo').addEventListener('click', () => { rects.set(pageNo, rectsOf(pageNo).slice(0, -1)); redraw(); });
$('clearPage').addEventListener('click', () => { rects.set(pageNo, []); redraw(); });

$('runBtn').addEventListener('click', async () => {
  $('runBtn').disabled = true;
  try {
    const out = await PDFDocument.create(); // 全新文件：不帶原始文字、也不帶原始中繼資料
    for (let n = 1; n <= current.numPages; n++) {
      setStatus(`處理第 ${n} / ${current.numPages} 頁…`);
      const { canvas, ptWidth, ptHeight } = await renderPage(current.doc, n, 2);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000';
      for (const r of rectsOf(n)) ctx.fillRect(r.x * canvas.width, r.y * canvas.height, r.w * canvas.width, r.h * canvas.height);
      const img = await out.embedJpg(await canvasToBytes(canvas, 'image/jpeg', 0.92));
      out.addPage([ptWidth, ptHeight]).drawImage(img, { x: 0, y: 0, width: ptWidth, height: ptHeight });
    }
    download(await out.save(), `${baseName(current.name)}-redacted.pdf`);
    setStatus('已下載（原始檔案沒有被改動）');
  } catch (e) { showError(e); }
  finally { $('runBtn').disabled = false; }
});
