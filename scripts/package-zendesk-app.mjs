#!/usr/bin/env node
/**
 * Package extensions/zendesk into public/downloads/unauth-zendesk-app.zip
 * with the layout Zendesk requires (manifest + translations + assets at zip root).
 */
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const zendeskRoot = path.join(repoRoot, 'extensions', 'zendesk');
const outZip = process.env.ZENDESK_OUTPUT_PATH
  ? path.resolve(process.env.ZENDESK_OUTPUT_PATH)
  : path.join(repoRoot, 'public', 'downloads', 'unauth-zendesk-app.zip');

const REQUIRED = [
  'manifest.json',
  'translations/en.json',
  'assets/iframe.html',
  'assets/logo.png',
  'assets/logo-small.png',
];

function fail(message) {
  console.error(`package-zendesk-app: ${message}`);
  process.exit(1);
}

for (const rel of REQUIRED) {
  const full = path.join(zendeskRoot, rel);
  if (!fs.existsSync(full)) {
    fail(`missing required file: ${rel}`);
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(zendeskRoot, 'manifest.json'), 'utf8'));
const sidebar = manifest.location?.support?.ticket_sidebar;
const sidebarUrl = typeof sidebar === 'string' ? sidebar : sidebar?.url;
if (!sidebarUrl || !sidebarUrl.startsWith('assets/')) {
  fail('manifest location.support.ticket_sidebar must point to assets/*.html');
}
if (sidebarUrl.startsWith('http://')) {
  fail('sidebar url must use HTTPS, not HTTP');
}

fs.mkdirSync(path.dirname(outZip), { recursive: true });
if (fs.existsSync(outZip)) {
  fs.unlinkSync(outZip);
}

execFileSync('zip', ['-r', outZip, 'manifest.json', 'translations', 'assets'], {
  cwd: zendeskRoot,
  stdio: 'inherit',
});

const listing = execFileSync('unzip', ['-l', outZip], { encoding: 'utf8' });
for (const rel of REQUIRED) {
  if (!listing.includes(rel)) {
    fail(`zip missing ${rel}`);
  }
}

console.log(`Wrote ${outZip}`);
console.log(listing.trim());
