import './style.css';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
export { parseRanges } from './ranges.js';

// 檔案拖到 dropzone 以外的地方時，不要讓瀏覽器直接把 PDF 打開
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

export const $ = (id) => document.getElementById(id);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 共用的 Tailwind class，各工具頁面沿用同一套外觀
export const cls = {
  primary: 'bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:opacity-90',
  secondary: 'bg-slate-100 text-slate-700 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-200 transition',
  card: 'bg-white border border-slate-200 rounded-lg p-4',
  input: 'border border-slate-300 rounded px-2 py-1 text-sm bg-slate-50',
  drop: 'bg-white border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-teal-500 hover:bg-teal-50 focus-visible:border-teal-500 outline-none transition',
};

export function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function setStatus(msg, isError = false) {
  const el = $('status');
  if (!el) return;
  el.textContent = msg || '';
  el.className = `text-center text-sm mt-4 min-h-5 ${isError ? 'text-orange-700' : 'text-slate-500'}`;
}

export function fmtSize(bytes) {
  return bytes < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(2)} MB`;
}

export const baseName = (name) => name.replace(/\.pdf$/i, '');
export const onlyPdfs = (files) => files.filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
export const readBytes = async (file) => new Uint8Array(await file.arrayBuffer());

// 頁面外框：標題 + 說明 + 上傳區 + 工具面板（#panel）+ 狀態列（#status）
export function mountShell({ title, desc, hint = '或點擊選擇檔案', multiple = false, drop = true }) {
  document.title = `${title} · 本機 PDF 工具箱`;
  $('app').innerHTML = `
    <a href="/" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600 mb-4">← 回首頁</a>
    <header class="flex items-start justify-between gap-4 flex-wrap mb-6">
      <div>
        <h1 class="text-2xl font-bold mb-1">${title}</h1>
        <p class="text-slate-500 text-sm max-w-lg">${desc}</p>
      </div>
      <span class="bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap">🔒 全程本機處理</span>
    </header>
    ${drop ? `
    <div id="dropzone" tabindex="0" role="button" aria-label="選擇或拖曳 PDF 檔案" class="${cls.drop}">
      <input type="file" id="fileInput" accept="application/pdf" ${multiple ? 'multiple' : ''} hidden />
      <p class="font-semibold">拖曳 PDF 檔案到這裡</p>
      <p class="text-slate-500 text-sm mt-1">${hint}</p>
    </div>` : ''}
    <div id="panel" class="mt-5" ${drop ? 'hidden' : ''}></div>
    <p id="status" role="status" class="text-center text-sm text-slate-500 mt-4 min-h-5"></p>`;
  return $('panel');
}

// 綁定點擊選檔 + 拖曳上傳。onFiles 只會收到 PDF 檔案陣列。
export function setupDropzone(onFiles, dzId = 'dropzone', inputId = 'fileInput') {
  const dz = $(dzId);
  const input = $(inputId);
  const hot = ['border-teal-500', 'bg-teal-50'];
  const deliver = (files) => {
    const pdfs = onlyPdfs(files);
    if (pdfs.length === 0) return setStatus('請選擇 PDF 檔案', true);
    onFiles(pdfs);
  };
  dz.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
  dz.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
  });
  input.addEventListener('change', () => {
    const files = Array.from(input.files);
    input.value = ''; // 讓同一個檔案可以再選一次
    deliver(files);
  });
  ['dragenter', 'dragover'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.add(...hot); }));
  ['dragleave', 'drop'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.remove(...hot); }));
  dz.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) deliver(files);
  });
}

// 用 pdf.js 開啟 PDF（需要渲染畫面時使用）
export async function openPdf(file) {
  const bytes = await readBytes(file);
  const task = pdfjsLib.getDocument({ data: bytes.slice() }); // 給 pdf.js 一份複本，原始 bytes 留給 pdf-lib
  const doc = await task.promise;
  return { name: file.name, bytes, doc, numPages: doc.numPages, close: () => task.destroy() };
}

// 把某一頁渲染成 canvas，並回傳該頁以 pt 為單位的尺寸（已含頁面本身的旋轉）
export async function renderPage(doc, pageNumber, scale) {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  page.cleanup();
  return { canvas, ptWidth: base.width, ptHeight: base.height };
}

export function canvasToBytes(canvas, type = 'image/png', quality = 0.92) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(async (b) => (b ? resolve(new Uint8Array(await b.arrayBuffer())) : reject(new Error('圖片轉換失敗'))), type, quality)
  );
}

export function download(bytes, filename, mime = 'application/pdf') {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function showError(e) {
  console.error(e);
  setStatus('發生錯誤：' + (e && e.message ? e.message : e), true);
}
