import './style.css';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Vite 專用寫法：把 pdfjs 的 worker 檔案一起打包進來，而不是去外部 CDN 抓。
// 如果這行報錯找不到檔案，去 node_modules/pdfjs-dist/build/ 底下看實際檔名，
// 有些版本叫 pdf.worker.min.mjs，有些叫 pdf.worker.mjs，改成對應的檔名即可。
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// ---------- DOM 參照 ----------
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const grid = document.getElementById('grid');
const emptyState = document.getElementById('emptyState');
const toolbar = document.getElementById('toolbar');
const statsEl = document.getElementById('stats');
const downloadBtn = document.getElementById('downloadBtn');
const filenameInput = document.getElementById('filenameInput');
const statusEl = document.getElementById('status');

// ---------- 狀態 ----------
const state = { pages: [] }; // { id, fileId, pageIndex, fileName, pageNumber, thumb }
const sourceBytes = new Map(); // fileId -> ArrayBuffer（給 pdf-lib 合併用）
let fileCounter = 0;
let pageCounter = 0;
let dragSrcId = null;

function setStatus(msg) {
  statusEl.textContent = msg || '';
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ---------- 讀檔 + 產生縮圖 ----------
async function loadFilePages(file) {
  const originalBuffer = await file.arrayBuffer();
  const bytesForLib = originalBuffer.slice(0);
  const bytesForRender = new Uint8Array(originalBuffer.slice(0));

  const fileId = 'f' + (fileCounter++);
  sourceBytes.set(fileId, bytesForLib);

  const pdfDoc = await pdfjsLib.getDocument({ data: bytesForRender }).promise;
  const newPages = [];
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 0.32 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    newPages.push({
      id: 'p' + (pageCounter++),
      fileId,
      pageIndex: i - 1,
      fileName: file.name,
      pageNumber: i,
      thumb: canvas.toDataURL('image/png'),
    });
    page.cleanup();
  }
  pdfDoc.destroy();
  return newPages;
}

async function handleFiles(fileList) {
  const files = Array.from(fileList).filter(
    (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
  );
  if (files.length === 0) {
    setStatus('請選擇 PDF 檔案');
    return;
  }
  setStatus(`正在讀取 ${files.length} 個檔案…`);
  for (const file of files) {
    try {
      const pages = await loadFilePages(file);
      state.pages.push(...pages);
      render();
    } catch (err) {
      console.error(err);
      setStatus(`讀取「${file.name}」失敗：${err.message}`);
    }
  }
  setStatus('');
}

// ---------- 畫面渲染 ----------
function render() {
  grid.innerHTML = '';
  const hasPages = state.pages.length > 0;
  emptyState.hidden = hasPages;
  toolbar.classList.toggle('hidden', !hasPages);
  toolbar.classList.toggle('flex', hasPages);

  state.pages.forEach((p, index) => {
    const card = document.createElement('div');
    card.className =
      'relative bg-white border border-slate-200 rounded-lg p-2 shadow-sm cursor-grab select-none group';
    card.draggable = true;
    card.dataset.id = p.id;
    card.innerHTML = `
      <span class="absolute top-2 left-2 bg-black/60 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">${index + 1}</span>
      <img src="${p.thumb}" alt="第 ${index + 1} 頁縮圖" class="w-full rounded border border-slate-100 pointer-events-none" />
      <p class="text-xs text-slate-500 mt-1.5 truncate">${escapeHtml(p.fileName)} · p.${p.pageNumber}</p>
      <button
        class="delete-btn absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center text-sm rounded-full bg-orange-100 text-orange-700 opacity-0 group-hover:opacity-100 transition"
        title="刪除此頁" aria-label="刪除此頁"
      >×</button>
    `;
    card.querySelector('.delete-btn').addEventListener('click', () => removePage(p.id));
    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragover', onDragOver);
    card.addEventListener('dragleave', onDragLeave);
    card.addEventListener('drop', onDrop);
    card.addEventListener('dragend', onDragEnd);
    grid.appendChild(card);
  });

  statsEl.textContent = `共 ${state.pages.length} 頁`;
  downloadBtn.disabled = state.pages.length === 0;
}

function removePage(id) {
  state.pages = state.pages.filter((p) => p.id !== id);
  render();
}

// ---------- 拖曳排序 ----------
function onDragStart(e) {
  dragSrcId = e.currentTarget.dataset.id;
  e.currentTarget.classList.add('opacity-40');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragSrcId);
}
function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (e.currentTarget.dataset.id !== dragSrcId) {
    e.currentTarget.classList.add('ring-2', 'ring-teal-500');
  }
}
function onDragLeave(e) {
  e.currentTarget.classList.remove('ring-2', 'ring-teal-500');
}
function onDrop(e) {
  e.preventDefault();
  const targetId = e.currentTarget.dataset.id;
  e.currentTarget.classList.remove('ring-2', 'ring-teal-500');
  if (!dragSrcId || dragSrcId === targetId) return;
  const srcIndex = state.pages.findIndex((p) => p.id === dragSrcId);
  const targetIndex = state.pages.findIndex((p) => p.id === targetId);
  if (srcIndex === -1 || targetIndex === -1) return;
  const [moved] = state.pages.splice(srcIndex, 1);
  state.pages.splice(targetIndex, 0, moved);
  render();
}
function onDragEnd(e) {
  e.currentTarget.classList.remove('opacity-40');
  document.querySelectorAll('.ring-2').forEach((el) => el.classList.remove('ring-2', 'ring-teal-500'));
  dragSrcId = null;
}

// ---------- 上傳互動 ----------
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

['dragenter', 'dragover'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('border-teal-500', 'bg-teal-50');
  });
});
['dragleave', 'drop'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('border-teal-500', 'bg-teal-50');
  });
});
dropzone.addEventListener('drop', (e) => {
  if (e.dataTransfer.files && e.dataTransfer.files.length) {
    handleFiles(e.dataTransfer.files);
  }
});

// ---------- 合併 + 下載（一般網站用標準瀏覽器下載，不需要平台專屬 API）----------
async function mergeAndDownload() {
  if (state.pages.length === 0) return;
  downloadBtn.disabled = true;
  const originalLabel = downloadBtn.textContent;
  downloadBtn.textContent = '合併中…';
  setStatus('');
  try {
    const merged = await PDFDocument.create();
    const libDocCache = new Map();
    for (const p of state.pages) {
      let libDoc = libDocCache.get(p.fileId);
      if (!libDoc) {
        libDoc = await PDFDocument.load(sourceBytes.get(p.fileId));
        libDocCache.set(p.fileId, libDoc);
      }
      const [copied] = await merged.copyPages(libDoc, [p.pageIndex]);
      merged.addPage(copied);
    }
    const mergedBytes = await merged.save();
    const filename = (filenameInput.value.trim() || 'merged').replace(/\.pdf$/i, '') + '.pdf';
    const blob = new Blob([mergedBytes], { type: 'application/pdf' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setStatus(`已下載：${filename}`);
  } catch (err) {
    console.error(err);
    setStatus('合併失敗：' + err.message);
  } finally {
    downloadBtn.disabled = state.pages.length === 0;
    downloadBtn.textContent = originalLabel;
  }
}

downloadBtn.addEventListener('click', mergeAndDownload);

render();
