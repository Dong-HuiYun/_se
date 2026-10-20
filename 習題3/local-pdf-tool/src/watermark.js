import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { $, cls, mountShell, setupDropzone, setStatus, showError, readBytes, download, baseName, canvasToBytes } from './common.js';

const panel = mountShell({
  title: '浮水印與頁碼',
  desc: '壓上可調透明度、傾斜角與密度的防偽浮水印，並可補上統一格式的頁碼。',
});

panel.innerHTML = `
  <div class="${cls.card} space-y-5">
    <p id="info" class="font-semibold text-sm"></p>

    <fieldset class="space-y-3">
      <label class="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" id="wmOn" checked /> 加上浮水印</label>
      <input id="wmText" type="text" value="僅供 ○○ 審查使用，轉載無效" class="${cls.input} w-full" />
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-slate-600">
        <label>透明度 <span id="opacityVal">20</span>%
          <input id="wmOpacity" type="range" min="5" max="60" value="20" class="w-full" /></label>
        <label>傾斜角 <span id="angleVal">30</span>°
          <input id="wmAngle" type="range" min="-60" max="60" value="30" class="w-full" /></label>
        <label>字體大小
          <input id="wmSize" type="number" min="12" max="120" value="40" class="${cls.input} w-full" /></label>
        <label>排列密度
          <select id="wmDensity" class="${cls.input} w-full">
            <option value="1.2">稀疏</option><option value="0.6" selected>中等</option><option value="0.2">緊密</option>
          </select></label>
      </div>
    </fieldset>

    <fieldset class="space-y-3">
      <label class="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" id="pnOn" /> 補上頁碼</label>
      <div class="flex gap-3 flex-wrap text-sm text-slate-600">
        <label>格式
          <select id="pnFormat" class="${cls.input}">
            <option value="pageof">Page 1 of 20</option><option value="slash">1 / 20</option><option value="dash">- 1 -</option>
          </select></label>
        <label>位置
          <select id="pnPos" class="${cls.input}"><option value="center">置中</option><option value="right">靠右</option></select></label>
      </div>
    </fieldset>

    <button id="runBtn" class="${cls.primary}">套用並下載</button>
  </div>`;

$('wmOpacity').addEventListener('input', (e) => ($('opacityVal').textContent = e.target.value));
$('wmAngle').addEventListener('input', (e) => ($('angleVal').textContent = e.target.value));

let bytes = null;
let fileName = '';

setupDropzone(async ([file]) => {
  setStatus('讀取中…');
  try {
    bytes = await readBytes(file);
    const n = (await PDFDocument.load(bytes)).getPageCount();
    fileName = file.name;
    $('info').textContent = `${file.name} · 共 ${n} 頁`;
    panel.hidden = false;
    setStatus('');
  } catch (e) { showError(e); }
});

// 用瀏覽器 canvas 畫出（可旋轉的）文字圖塊。這樣中文不需要另外嵌入字型檔。
function makeTile(text, fontPx, angleDeg) {
  const font = `600 ${fontPx}px "Noto Sans TC","Microsoft JhengHei","PingFang TC",sans-serif`;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const w = Math.ceil(probe.measureText(text).width) + 8;
  const h = Math.ceil(fontPx * 1.4);
  const rad = (angleDeg * Math.PI) / 180;
  const bw = Math.ceil(Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad)));
  const bh = Math.ceil(Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad)));
  const c = document.createElement('canvas');
  c.width = bw;
  c.height = bh;
  const ctx = c.getContext('2d');
  ctx.font = font;
  ctx.fillStyle = '#444';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(bw / 2, bh / 2);
  ctx.rotate(-rad);
  ctx.fillText(text, 0, 0);
  return c;
}

$('runBtn').addEventListener('click', async () => {
  const wmOn = $('wmOn').checked;
  const pnOn = $('pnOn').checked;
  if (!wmOn && !pnOn) return setStatus('請至少勾選一項：浮水印或頁碼', true);
  const text = $('wmText').value.trim();
  if (wmOn && !text) return setStatus('請輸入浮水印文字', true);

  $('runBtn').disabled = true;
  setStatus('處理中…');
  try {
    const doc = await PDFDocument.load(bytes);
    const pages = doc.getPages();

    if (wmOn) {
      const opacity = Number($('wmOpacity').value) / 100;
      const gap = Number($('wmDensity').value);
      const tile = makeTile(text, Number($('wmSize').value) * 2, Number($('wmAngle').value)); // 2 倍解析度，輸出更清晰
      const img = await doc.embedPng(await canvasToBytes(tile));
      const tw = tile.width / 2;
      const th = tile.height / 2;
      const stepX = tw * (1 + gap);
      const stepY = th * (1 + gap);
      for (const page of pages) {
        const { width, height } = page.getSize();
        let row = 0;
        for (let y = 0; y < height; y += stepY, row++) {
          for (let x = row % 2 ? -stepX / 2 : 0; x < width; x += stepX) {
            page.drawImage(img, { x, y, width: tw, height: th, opacity });
          }
        }
      }
    }

    if (pnOn) {
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fmt = $('pnFormat').value;
      const pos = $('pnPos').value;
      const n = pages.length;
      pages.forEach((page, i) => {
        const label = { pageof: `Page ${i + 1} of ${n}`, slash: `${i + 1} / ${n}`, dash: `- ${i + 1} -` }[fmt];
        const textW = font.widthOfTextAtSize(label, 10);
        const { width } = page.getSize();
        const x = pos === 'center' ? (width - textW) / 2 : width - 36 - textW;
        page.drawText(label, { x, y: 20, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
      });
    }

    download(await doc.save(), `${baseName(fileName)}-stamped.pdf`);
    setStatus('已下載');
  } catch (e) { showError(e); }
  finally { $('runBtn').disabled = false; }
});
