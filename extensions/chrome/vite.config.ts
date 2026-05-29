import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const root = __dirname;
const dist = resolve(root, 'dist');
const projectRoot = resolve(root, '..', '..');

const DEFAULT_API_BASE = 'https://unauth-pi.vercel.app';

// Resolve the deployment the packed extension should call. Reads the same
// .env.local the Next app uses (NEXT_PUBLIC_APP_URL) so the build auto-adapts;
// VITE_UNAUTH_API_BASE overrides for one-off builds; falls back to the live URL.
function resolveApiBase(mode: string): string {
  const rootEnv = loadEnv(mode, projectRoot, '');
  const candidate =
    process.env.VITE_UNAUTH_API_BASE ||
    process.env.NEXT_PUBLIC_APP_URL ||
    rootEnv.VITE_UNAUTH_API_BASE ||
    rootEnv.NEXT_PUBLIC_APP_URL ||
    DEFAULT_API_BASE;
  return candidate.replace(/\/+$/, '');
}

function copyExtensionAssets(apiBase: string) {
  return {
    name: 'copy-extension-assets',
    closeBundle() {
      mkdirSync(dist, { recursive: true });

      // host_permissions must match the API base so the service worker is
      // allowed to fetch it. Rewrite from the resolved base rather than the
      // checked-in default.
      const manifest = JSON.parse(
        readFileSync(resolve(root, 'manifest.json'), 'utf8')
      ) as { host_permissions: string[]; [key: string]: unknown };
      manifest.host_permissions = [`${apiBase}/*`];
      writeFileSync(resolve(dist, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

      cpSync(resolve(root, 'icons'), resolve(dist, 'icons'), { recursive: true });

      const popupHtml = readFileSync(resolve(dist, 'popup/popup.html'), 'utf8');
      const fixed = popupHtml
        .replace(/(href|src)="\/assets\//g, '$1="../assets/')
        .replace(/(href|src)="assets\//g, '$1="../assets/');
      writeFileSync(resolve(dist, 'popup/popup.html'), fixed);
    },
  };
}

export default defineConfig(({ mode }) => {
  const apiBase = resolveApiBase(mode);
  return {
    root,
    base: './',
    define: {
      __UNAUTH_API_BASE__: JSON.stringify(apiBase),
    },
    plugins: [react(), copyExtensionAssets(apiBase)],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
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
  };
});
