import { PDFDocument } from 'pdf-lib';
import { $, cls, mountShell, setupDropzone, setStatus, showError, readBytes, download, escapeHtml } from './common.js';

const panel = mountShell({
  title: '雙面掃描交錯合併',
  desc: '沒有雙面掃描機時：先掃完所有正面（1, 3, 5…），翻面再掃背面（…6, 4, 2）。把兩份檔案放進來，自動交叉縫合成一份完整文件。',
  drop: false,
});

const slot = (k, title) => `
  <div id="dz${k}" tabindex="0" role="button" class="${cls.drop}">
    <input type="file" id="in${k}" accept="application/pdf" hidden />
    <p class="font-semibold">${title}</p>
    <p id="name${k}" class="text-slate-500 text-sm mt-1">點擊或拖曳 PDF 到這裡</p>
  </div>`;

panel.innerHTML = `
  <div class="grid sm:grid-cols-2 gap-4">
    ${slot('A', '第一疊：先掃的正面（1, 3, 5…）')}
    ${slot('B', '第二疊：翻面後掃的背面（…6, 4, 2）')}
  </div>
  <div class="${cls.card} mt-4 space-y-3">
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" id="revB" checked />
      第二疊是倒序掃描（翻面後從最後一頁開始掃），自動反轉
    </label>
    <button id="runBtn" disabled class="${cls.primary}">交錯合併並下載</button>
  </div>`;

const docs = { A: null, B: null };

async function load(k, file) {
  setStatus('讀取中…');
  try {
    const doc = await PDFDocument.load(await readBytes(file));
    docs[k] = { doc, n: doc.getPageCount(), name: file.name };
    $(`name${k}`).innerHTML = `${escapeHtml(file.name)} · ${docs[k].n} 頁`;
    $('runBtn').disabled = !(docs.A && docs.B);
    setStatus(docs.A && docs.B && docs.A.n !== docs.B.n
      ? `提醒：兩份頁數不同（A ${docs.A.n} 頁、B ${docs.B.n} 頁），多出來的頁面會接在最後面` : '');
  } catch (e) { showError(e); }
}

setupDropzone(([f]) => load('A', f), 'dzA', 'inA');
setupDropzone(([f]) => load('B', f), 'dzB', 'inB');

$('runBtn').addEventListener('click', async () => {
  $('runBtn').disabled = true;
  try {
    const { A, B } = docs;
    const out = await PDFDocument.create();
    const aIdx = Array.from({ length: A.n }, (_, i) => i);
    const bIdx = Array.from({ length: B.n }, (_, i) => i);
    if ($('revB').checked) bIdx.reverse();
    const aPages = await out.copyPages(A.doc, aIdx);
    const bPages = await out.copyPages(B.doc, bIdx);
    for (let i = 0; i < Math.max(aPages.length, bPages.length); i++) {
      if (aPages[i]) out.addPage(aPages[i]);
      if (bPages[i]) out.addPage(bPages[i]);
    }
    download(await out.save(), 'interleaved.pdf');
    setStatus(`已合併成 ${aPages.length + bPages.length} 頁`);
  } catch (e) { showError(e); }
  finally { $('runBtn').disabled = false; }
});
