import { PDFDocument } from 'pdf-lib';
import { $, cls, mountShell, setupDropzone, setStatus, showError, openPdf, renderPage, canvasToBytes, download, baseName, fmtSize } from './common.js';

const panel = mountShell({
  title: 'PDF 壓縮',
  desc: '輕量最佳化（保留文字），或把每頁轉成較低解析度的圖片來大幅縮小檔案，適合遇到上傳大小限制時使用。',
});

panel.innerHTML = `
  <div class="${cls.card} space-y-4">
    <p id="info" class="font-semibold text-sm"></p>

    <label class="flex items-start gap-2 text-sm">
      <input type="radio" name="mode" value="light" checked class="mt-1" />
      <span><strong>輕量最佳化</strong>：重建檔案、移除沒用到的物件。文字維持可選取，但通常只能縮小一點。</span>
    </label>
    <label class="flex items-start gap-2 text-sm">
      <input type="radio" name="mode" value="strong" class="mt-1" />
      <span><strong>轉成圖片壓縮</strong>：每頁重新取樣成 JPEG，可大幅縮小，但<strong>文字會變成圖片、無法再選取或搜尋</strong>。</span>
    </label>

    <div id="strongOpts" class="flex gap-4 flex-wrap text-sm text-slate-600 pl-6">
      <label>畫質
        <select id="quality" class="${cls.input}">
          <option value="0.85">高</option><option value="0.65" selected>中</option><option value="0.45">低</option>
        </select></label>
      <label>解析度
        <select id="dpi" class="${cls.input}">
          <option value="150">150 dpi</option><option value="120" selected>120 dpi</option><option value="96">96 dpi</option>
        </select></label>
    </div>

    <button id="runBtn" class="${cls.primary}">開始壓縮</button>
    <div id="result" class="text-sm space-y-2"></div>
  </div>`;

let current = null;
let output = null;

document.querySelectorAll('input[name=mode]').forEach((r) =>
  r.addEventListener('change', () => {
    $('strongOpts').style.opacity = document.querySelector('input[name=mode]:checked').value === 'strong' ? '1' : '0.4';
  })
);
$('strongOpts').style.opacity = '0.4';

setupDropzone(async ([file]) => {
  setStatus('讀取中…');
  try {
    current?.close();
    current = await openPdf(file);
    output = null;
    $('result').innerHTML = '';
    $('info').textContent = `${file.name} · ${current.numPages} 頁 · ${fmtSize(current.bytes.length)}`;
    panel.hidden = false;
    setStatus('');
  } catch (e) { showError(e); }
});

$('runBtn').addEventListener('click', async () => {
  const mode = document.querySelector('input[name=mode]:checked').value;
  $('runBtn').disabled = true;
  $('result').innerHTML = '';
  try {
    let bytes;
    if (mode === 'light') {
      setStatus('最佳化中…');
      const src = await PDFDocument.load(current.bytes);
      const out = await PDFDocument.create();
      (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
      bytes = await out.save({ useObjectStreams: true });
    } else {
      const scale = Number($('dpi').value) / 72;
      const quality = Number($('quality').value);
      const out = await PDFDocument.create();
      for (let n = 1; n <= current.numPages; n++) {
        setStatus(`壓縮第 ${n} / ${current.numPages} 頁…`);
        const { canvas, ptWidth, ptHeight } = await renderPage(current.doc, n, scale);
        const img = await out.embedJpg(await canvasToBytes(canvas, 'image/jpeg', quality));
        out.addPage([ptWidth, ptHeight]).drawImage(img, { x: 0, y: 0, width: ptWidth, height: ptHeight });
      }
      bytes = await out.save();
    }
    output = bytes;
    const change = (1 - bytes.length / current.bytes.length) * 100;
    $('result').innerHTML = `
      <p>${fmtSize(current.bytes.length)} → <strong>${fmtSize(bytes.length)}</strong>
        （${change >= 0 ? `縮小 ${change.toFixed(0)}%` : `反而變大 ${(-change).toFixed(0)}%`}）</p>
      ${change < 0 ? '<p class="text-orange-700">壓縮後比原檔更大，建議不要使用這份結果（純文字 PDF 轉成圖片常會這樣）。</p>' : ''}
      <button id="dlBtn" class="${cls.primary}">下載壓縮後的 PDF</button>`;
    $('dlBtn').addEventListener('click', () => download(output, `${baseName(current.name)}-compressed.pdf`));
    setStatus('');
  } catch (e) { showError(e); }
  finally { $('runBtn').disabled = false; }
});
