import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const root = resolve(process.cwd());
const outputRoot = join(root, 'docs/unauth/implementation/p01/references');
const sampleOnly = process.argv.includes('--sample');
const surfaces = ['hero_overview', 'cases_workbench', 'recovery_portfolio', 'reconciliation_command_centre', 'rule_impact_proof'];
const states = sampleOnly ? ['normal'] : ['normal', 'partial', 'stale', 'unavailable', 'permission', 'error'];
const conditions = sampleOnly ? [
  { id: '1440x900', width: 1440, height: 900, mode: 'viewport' },
  { id: '320x640', width: 320, height: 640, mode: 'viewport' },
] : [
  { id: '1440x900', width: 1440, height: 900, mode: 'viewport' },
  { id: '1280x800', width: 1280, height: 800, mode: 'viewport' },
  { id: '1024x768', width: 1024, height: 768, mode: 'viewport' },
  { id: '320x640', width: 320, height: 640, mode: 'viewport' },
  { id: 'text200-1440x900', width: 1440, height: 900, mode: 'text200' },
  { id: 'zoom400-1280x1024', width: 320, height: 256, physicalWidth: 1280, physicalHeight: 1024, mode: 'zoom400', deviceScaleFactor: 4, browserZoomPercent: 400 },
];
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png' };
const sha = (buffer) => createHash('sha256').update(buffer).digest('hex');

const server = createServer((request, response) => {
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  const candidate = normalize(join(root, decodeURIComponent(pathname)));
  if (!candidate.startsWith(root) || !statSafe(candidate)) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.writeHead(200, { 'content-type': mime[extname(candidate)] || 'application/octet-stream', 'cache-control': 'no-store' });
  response.end(readFileSync(candidate));
});

function statSafe(path) {
  try { return statSync(path).isFile(); } catch { return false; }
}

await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;
mkdirSync(outputRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
const manifestRows = [];

try {
  for (const surface of surfaces) {
    for (const state of states) {
      for (const condition of conditions) {
        const context = await browser.newContext({ viewport: { width: condition.width, height: condition.height }, deviceScaleFactor: condition.deviceScaleFactor || 1, reducedMotion: 'reduce' });
        const page = await context.newPage();
        const url = `${base}/docs/unauth/implementation/p01/reference.html?surface=${surface}&state=${state}&mode=${condition.mode}`;
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => document.body.dataset.ready === 'true');
        const errors = await page.locator('body').evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight }));
        const directory = join(outputRoot, surface, state);
        mkdirSync(directory, { recursive: true });
        const path = join(directory, `${condition.id}.png`);
        await page.screenshot({ path, fullPage: false, animations: 'disabled' });
        const data = readFileSync(path);
        manifestRows.push({ surface, state, condition: condition.id, physical_viewport: `${condition.physicalWidth || condition.width}x${condition.physicalHeight || condition.height}`, layout_viewport: `${condition.width}x${condition.height}`, mode: condition.mode, device_scale_factor: condition.deviceScaleFactor || 1, browser_zoom_percent: condition.browserZoomPercent || 100, overflow: errors, path: path.slice(root.length + 1), sha256: sha(data) });
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}

if (!sampleOnly) {
  const expected = surfaces.length * states.length * conditions.length;
  if (manifestRows.length !== expected) throw new Error(`Expected ${expected} references; received ${manifestRows.length}`);
  const normalDesktop = surfaces.map((surface) => join(outputRoot, surface, 'normal', '1440x900.png'));
  const thumbs = await Promise.all(normalDesktop.map((path) => sharp(path).resize(480, 300, { fit: 'cover', position: 'top' }).png().toBuffer()));
  const contact = sharp({ create: { width: 960, height: 900, channels: 4, background: '#f7f8fa' } });
  await contact.composite(thumbs.map((input, index) => ({ input, left: (index % 2) * 480, top: Math.floor(index / 2) * 300 }))).png().toFile(join(outputRoot, 'contact-sheet.png'));
}

writeFileSync(join(outputRoot, sampleOnly ? 'sample-manifest.json' : 'reference-manifest.json'), JSON.stringify({ label: 'PROVISIONAL — NOT CERTIFICATION EVIDENCE', specification_version: '1.2', specification_sha256: '3acc6ae06192edde91a2ea549f6e676a4cdbe64639eefe9342f7691dbe0a17da', fixture_sha256: '21ab3b0bfc310a6356158f394cdd6f2cd638ad3c7b7586b3aaf2195e6e86ea13', supplement_sha256: '0c410b6b40c82426ba727d69ba56a119af37f2c0f0978afd648283d29c5c4c55', generator: 'scripts/p01-capture-references.mjs', sample_only: sampleOnly, rows: manifestRows }, null, 2) + '\n');
console.log(JSON.stringify({ sampleOnly, references: manifestRows.length, outputRoot }, null, 2));
