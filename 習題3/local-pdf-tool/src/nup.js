import { PDFDocument, rgb } from 'pdf-lib';
import { $, cls, mountShell, setupDropzone, setStatus, showError, openPdf, renderPage, canvasToBytes, download, escapeHtml } from './common.js';

const panel = mountShell({
  title: '發票 N-Up 拼貼',
  desc: '把多張單頁的電子發票、收據排成一張 A4（2、4 或 6 張），附裁切虛線，直接列印。',
  hint: '可一次選取多個檔案，每一頁都會成為一張拼貼的小圖',
  multiple: true,
});

panel.innerHTML = `
  <div class="${cls.card} space-y-4">
    <div>
      <p id="summary" class="font-semibold text-sm"></p>
      <ul id="fileList" class="text-xs text-slate-500 mt-1 space-y-0.5"></ul>
    </div>
    <div class="flex items-center gap-4 flex-wrap text-sm text-slate-600">
      <label>每頁張數
        <select id="layout" class="${cls.input}">
          <option value="2">2 張（上下）</option><option value="4" selected>4 張（2×2）</option><option value="6">6 張（2×3）</option>
        </select></label>
      <label class="flex items-center gap-1.5"><input type="checkbox" id="cut" checked /> 畫裁切虛線</label>
    </div>
    <div class="flex items-center gap-3">
      <button id="runBtn" class="${cls.primary}">產生 A4 拼貼並下載</button>
      <button id="clearBtn" class="${cls.secondary}">清除全部</button>
    </div>
  </div>`;

const sources = [];
const LAYOUTS = { 2: { cols: 1, rows: 2 }, 4: { cols: 2, rows: 2 }, 6: { cols: 2, rows: 3 } };
const A4 = [595.28, 841.89];

function refresh() {
  const total = sources.reduce((s, x) => s + x.numPages, 0);
  panel.hidden = sources.length === 0;
  $('summary').textContent = `共 ${sources.length} 個檔案、${total} 頁`;
  $('fileList').innerHTML = sources.map((s) => `<li>${escapeHtml(s.name)} · ${s.numPages} 頁</li>`).join('');
}

setupDropzone(async (files) => {
  setStatus(`讀取 ${files.length} 個檔案…`);
  for (const f of files) {
    try { sources.push(await openPdf(f)); } catch (e) { showError(e); }
  }
  refresh();
  if (sources.length) setStatus('');
});

$('clearBtn').addEventListener('click', () => {
  sources.splice(0).forEach((s) => s.close());
  refresh();
  setStatus('');
});

$('runBtn').addEventListener('click', async () => {
  const perPage = Number($('layout').value);
  const { cols, rows } = LAYOUTS[perPage];
  const cut = $('cut').checked;
  const items = sources.flatMap((s) => Array.from({ length: s.numPages }, (_, i) => ({ s, n: i + 1 })));

  $('runBtn').disabled = true;
  try {
    const out = await PDFDocument.create();
    const cw = A4[0] / cols;
    const ch = A4[1] / rows;
    const margin = 14;

    for (let start = 0; start < items.length; start += perPage) {
      const page = out.addPage(A4);
      for (let k = 0; k < perPage && start + k < items.length; k++) {
        const { s, n } = items[start + k];
        const { canvas, ptWidth, ptHeight } = await renderPage(s.doc, n, 2);
        const img = await out.embedJpg(await canvasToBytes(canvas, 'image/jpeg', 0.92));
        // 等比縮放置中，避免發票變形
        const sc = Math.min((cw - 2 * margin) / ptWidth, (ch - 2 * margin) / ptHeight);
        const w = ptWidth * sc;
        const h = ptHeight * sc;
        const col = k % cols;
        const row = Math.floor(k / cols);
        page.drawImage(img, { x: col * cw + (cw - w) / 2, y: A4[1] - (row + 1) * ch + (ch - h) / 2, width: w, height: h });
      }
      if (cut) {
        const line = { thickness: 0.6, color: rgb(0.6, 0.6, 0.6), dashArray: [4, 3] };
        for (let c = 1; c < cols; c++) page.drawLine({ start: { x: c * cw, y: 0 }, end: { x: c * cw, y: A4[1] }, ...line });
        for (let r = 1; r < rows; r++) page.drawLine({ start: { x: 0, y: A4[1] - r * ch }, end: { x: A4[0], y: A4[1] - r * ch }, ...line });
      }
      setStatus(`處理中… ${Math.min(start + perPage, items.length)} / ${items.length}`);
    }
    download(await out.save(), 'nup-collage.pdf');
    setStatus(`已輸出 ${Math.ceil(items.length / perPage)} 張 A4`);
  } catch (e) { showError(e); }
  finally { $('runBtn').disabled = false; }
});
