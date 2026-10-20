import { PDFDocument } from 'pdf-lib';
import { $, cls, mountShell, setupDropzone, setStatus, showError, readBytes, download, baseName, parseRanges, sleep } from './common.js';

const panel = mountShell({
  title: '分割與擷取頁面',
  desc: '輸入頁碼區間擷取成新檔案，或每 N 頁自動切分成獨立的 PDF。',
});

panel.innerHTML = `
  <div class="${cls.card} space-y-4">
    <p id="info" class="font-semibold text-sm"></p>

    <label class="flex items-start gap-2 text-sm">
      <input type="radio" name="mode" value="extract" checked class="mt-1" />
      <span>擷取：把下方頁碼合併成<strong>一個</strong>新檔案</span>
    </label>
    <label class="flex items-start gap-2 text-sm">
      <input type="radio" name="mode" value="ranges" class="mt-1" />
      <span>分開：下方每個區間各自輸出成<strong>一個檔案</strong></span>
    </label>
    <input id="ranges" type="text" placeholder="例如 1-3, 5, 8-10" class="${cls.input} w-full sm:w-80 block" />

    <label class="flex items-center gap-2 text-sm">
      <input type="radio" name="mode" value="every" />
      <span>每 <input id="everyN" type="number" min="1" value="5" class="${cls.input} w-16" /> 頁自動切成一個檔案</span>
    </label>

    <div class="flex items-center gap-3">
      <button id="runBtn" class="${cls.primary}">分割並下載</button>
      <span class="text-xs text-slate-400">輸出多個檔案時，瀏覽器可能會詢問是否允許下載多個檔案</span>
    </div>
  </div>`;

let src = null;
let fileName = '';

setupDropzone(async ([file]) => {
  setStatus('讀取中…');
  try {
    src = await PDFDocument.load(await readBytes(file));
    fileName = file.name;
    $('info').textContent = `${file.name} · 共 ${src.getPageCount()} 頁`;
    panel.hidden = false;
    setStatus('');
  } catch (e) { showError(e); }
});

$('runBtn').addEventListener('click', async () => {
  const mode = document.querySelector('input[name=mode]:checked').value;
  const total = src.getPageCount();
  let groups;
  try {
    if (mode === 'every') {
      const n = parseInt($('everyN').value, 10);
      if (!(n >= 1)) throw new Error('每份頁數必須是 1 以上的整數');
      groups = [];
      for (let s = 0; s < total; s += n) {
        groups.push(Array.from({ length: Math.min(n, total - s) }, (_, i) => s + i));
      }
    } else {
      groups = parseRanges($('ranges').value, total);
      if (mode === 'extract') groups = [groups.flat()];
    }
  } catch (e) { return setStatus(e.message, true); }

  $('runBtn').disabled = true;
  try {
    const base = baseName(fileName);
    for (let i = 0; i < groups.length; i++) {
      const out = await PDFDocument.create();
      (await out.copyPages(src, groups[i])).forEach((p) => out.addPage(p));
      const name = mode === 'extract' ? `${base}-extract.pdf` : `${base}-part${i + 1}.pdf`;
      download(await out.save(), name);
      if (i < groups.length - 1) await sleep(300);
    }
    setStatus(`已輸出 ${groups.length} 個檔案`);
  } catch (e) { showError(e); }
  finally { $('runBtn').disabled = false; }
});
