import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

// 每新增一個工具，在這個陣列加上資料夾名稱即可（tools/<名稱>/index.html）
const tools = ['merge', 'rotate', 'split', 'watermark', 'nup', 'redact', 'interleave', 'compress'];

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        ...Object.fromEntries(tools.map((t) => [t, resolve(import.meta.dirname, `tools/${t}/index.html`)])),
      },
    },
  },
});
