import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = __dirname;
const dist = resolve(root, 'dist');

function copyExtensionAssets() {
  return {
    name: 'copy-extension-assets',
    closeBundle() {
      mkdirSync(dist, { recursive: true });
      cpSync(resolve(root, 'manifest.json'), resolve(dist, 'manifest.json'));
      cpSync(resolve(root, 'icons'), resolve(dist, 'icons'), { recursive: true });

      const popupHtml = readFileSync(resolve(dist, 'popup/popup.html'), 'utf8');
      const fixed = popupHtml
        .replace(/(href|src)="\/assets\//g, '$1="../assets/')
        .replace(/(href|src)="assets\//g, '$1="../assets/');
      writeFileSync(resolve(dist, 'popup/popup.html'), fixed);
    },
  };
}

export default defineConfig({
  root,
  base: './',
  plugins: [react(), copyExtensionAssets()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: resolve(root, 'popup/popup.html'),
        background: resolve(root, 'background/background.ts'),
        content: resolve(root, 'content/content.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'background/background.js';
          if (chunk.name === 'content') return 'content/content.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
