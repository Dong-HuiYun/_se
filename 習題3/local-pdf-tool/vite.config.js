import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        merge: resolve(import.meta.dirname, 'tools/merge/index.html'),
        rotate: resolve(import.meta.dirname, 'tools/rotate/index.html'),
      },
    },
  },
});
