import './style.css';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

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
const rotateAllBtn = document.getElementById('rotateAllBtn');
const fixEvenBtn = document.getElementById('fixEvenBtn');
const fixLandscapeBtn = document.getElementById('fixLandscapeBtn');
const resetAllBtn = document.getElementById('resetAllBtn');
const statusEl = document.getElementById('status');

// ---------- 狀態 ----------
// page: { id, fileId, pageIndex, fileName, pageNumber, thumb, baseWidth, baseHeight, offset }
// offset 是使用者「額外疊加」的旋轉角度（0/90/180/270），實際輸出時會疊加在 PDF 原本的旋轉上
const state = { pages: [] };
const sourceBytes = new Map(); // fileId -> ArrayBuffer
let fileCounter = 0;
let pageCounter = 0;

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

  const loadingTask = pdfjsLib.getDocument({ data: bytesForRender });
  const pdfDoc = await loadingTask.promise;

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
      baseWidth: viewport.width,
      baseHeight: viewport.height,
      offset: 0,
    });
    page.cleanup();
  }
  loadingTask.destroy();
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
    card.className = 'relative bg-white border border-slate-200 rounded-lg p-2 shadow-sm select-none';
    card.innerHTML = `
      <span class="absolute top-2 left-2 z-10 bg-black/60 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">${index + 1}</span>
      ${p.offset !== 0 ? `<span class="absolute top-2 right-2 z-10 bg-teal-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">+${p.offset}°</span>` : ''}
      <div class="w-full aspect-square flex items-center justify-center overflow-hidden bg-slate-50 rounded border border-slate-100">
        <img
          src="${p.thumb}"
          alt="第 ${index + 1} 頁縮圖"
          class="max-w-[85%] max-h-[85%] transition-transform duration-150 pointer-events-none"
          style="transform: rotate(${p.offset}deg);"
        />
      </div>
      <p class="text-xs text-slate-500 mt-1.5 truncate">${escapeHtml(p.fileName)} · p.${p.pageNumber}</p>
      <div class="flex gap-1.5 mt-1.5">
        <button class="rotate-left flex-1 text-sm bg-slate-100 hover:bg-slate-200 rounded py-1" title="向左轉 90°" aria-label="向左轉 90°">⟲</button>
        <button class="rotate-right flex-1 text-sm bg-slate-100 hover:bg-slate-200 rounded py-1" title="向右轉 90°" aria-label="向右轉 90°">⟳</button>
      </div>
    `;
    card.querySelector('.rotate-left').addEventListener('click', () => rotatePage(p.id, -90));
    card.querySelector('.rotate-right').addEventListener('click', () => rotatePage(p.id, 90));
    grid.appendChild(card);
  });

  statsEl.textContent = `共 ${state.pages.length} 頁`;
  downloadBtn.disabled = state.pages.length === 0;
}

function rotatePage(id, delta) {
  const p = state.pages.find((x) => x.id === id);
  if (!p) return;
  p.offset = ((p.offset + delta) % 360 + 360) % 360;
  render();
}

// ---------- 批次動作 ----------
rotateAllBtn.addEventListener('click', () => {
  state.pages.forEach((p) => (p.offset = (p.offset + 90) % 360));
  render();
});
fixEvenBtn.addEventListener('click', () => {
  state.pages.forEach((p) => {
    if (p.pageNumber % 2 === 0) p.offset = (p.offset + 180) % 360;
  });
  render();
});
fixLandscapeBtn.addEventListener('click', () => {
  state.pages.forEach((p) => {
    if (p.baseWidth > p.baseHeight) p.offset = (p.offset + 90) % 360;
  });
  render();
});
resetAllBtn.addEventListener('click', () => {
  state.pages.forEach((p) => (p.offset = 0));
  render();
});

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

// ---------- 套用旋轉並下載 ----------
function downloadBlob(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function applyRotationsAndDownload() {
  if (state.pages.length === 0) return;
  downloadBtn.disabled = true;
  const originalLabel = downloadBtn.textContent;
  downloadBtn.textContent = '處理中…';
  setStatus('');
  try {
    const fileIds = [...new Set(state.pages.map((p) => p.fileId))];
    for (let i = 0; i < fileIds.length; i++) {
      const fileId = fileIds[i];
      const doc = await PDFDocument.load(sourceBytes.get(fileId));
      const pagesForFile = state.pages.filter((p) => p.fileId === fileId);
      for (const p of pagesForFile) {
        const pdfPage = doc.getPage(p.pageIndex);
        const original = pdfPage.getRotation().angle;
        const final = ((original + p.offset) % 360 + 360) % 360;
        pdfPage.setRotation(degrees(final));
      }
      const outBytes = await doc.save();
      const baseName = pagesForFile[0].fileName.replace(/\.pdf$/i, '');
      downloadBlob(outBytes, `${baseName}-rotated.pdf`);
      // 多檔案下載之間稍微錯開時間，避免瀏覽器把連續下載當成彈出視窗擋掉
      if (i < fileIds.length - 1) await new Promise((r) => setTimeout(r, 300));
    }
    setStatus(`已下載 ${fileIds.length} 個檔案`);
  } catch (err) {
    console.error(err);
    setStatus('處理失敗：' + err.message);
  } finally {
    downloadBtn.disabled = state.pages.length === 0;
    downloadBtn.textContent = originalLabel;
  }
}

downloadBtn.addEventListener('click', applyRotationsAndDownload);

render();
