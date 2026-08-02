#!/usr/bin/env node
/*
 * Visual adoption verifier — docs/IMPL_authenticated_execution_ledger.md §8.1
 * ---------------------------------------------------------------------------
 * The previous eleven visual passes each shipped a specification and no way to
 * tell whether it landed. Nine of the last document's thirteen acceptance greps
 * sat at baseline when re-run three weeks later, and nobody noticed, because
 * running them was a manual step nobody owned.
 *
 * This script owns it. Every item in the ledger that can be counted is counted
 * here, printed as `baseline -> target -> actual`, and a regression past the
 * recorded baseline exits non-zero.
 *
 * Baselines were measured on 2026-08-02 against 76503cb4 + 105 uncommitted
 * files. When an item reaches target, tighten its baseline in the same commit
 * so the ratchet only turns one way.
 *
 *   node scripts/verify-visual-adoption.mjs          # report + gate
 *   node scripts/verify-visual-adoption.mjs --report # report only, always 0
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const REPORT_ONLY = process.argv.includes('--report');

const SKIP_DIRS = new Set([
  'node_modules', '.next', '.git', 'dist', 'build', 'coverage',
  '.impeccable', 'extensions', 'supabase',
]);

/** Recursively collect files under `roots` whose extension is in `exts`. */
function collect(roots, exts) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;
      const full = join(dir, entry);
      let s;
      try { s = statSync(full); } catch { continue; }
      if (s.isDirectory()) walk(full);
      else if (exts.has(extname(entry))) out.push(full);
    }
  };
  for (const r of roots) {
    const abs = join(ROOT, r);
    if (existsSync(abs)) walk(abs);
  }
  return out;
}

const TSX = collect(['app', 'components'], new Set(['.tsx']));
const TS_ALL = collect(['app', 'components', 'lib'], new Set(['.ts', '.tsx']));
const CSS = collect(['app', 'components', 'styles'], new Set(['.css']));

const cache = new Map();
function read(file) {
  if (!cache.has(file)) {
    try { cache.set(file, readFileSync(file, 'utf8')); } catch { cache.set(file, ''); }
  }
  return cache.get(file);
}

/** Total occurrences of `re` across `files`. */
function occurrences(files, re) {
  let n = 0;
  for (const f of files) n += (read(f).match(re) || []).length;
  return n;
}

/** Number of files in `files` containing `re`. */
function fileCount(files, re) {
  let n = 0;
  for (const f of files) if (re.test(read(f))) n += 1;
  return n;
}

/*
 * Checks. `target` is a predicate over the measured value; `targetLabel`
 * describes it for the report. `baseline` is the 2026-08-02 measurement and is
 * the regression floor — going the wrong way from it fails even before target
 * is reached.
 *
 * `direction: 'down'` means lower is better (the default for adoption debt);
 * 'up' means higher is better.
 */
const CHECKS = [
  // ── M5 type migration ────────────────────────────────────────────────────
  { id: 'M5.a', label: 'text-sm utilities', direction: 'down', baseline: 571,
    targetLabel: '< 40', target: (n) => n < 40,
    measure: () => occurrences(TSX, /\btext-sm\b/g) },

  { id: 'M5.b', label: 'text-xs utilities', direction: 'down', baseline: 558,
    targetLabel: '< 40', target: (n) => n < 40,
    measure: () => occurrences(TSX, /\btext-xs\b/g) },

  { id: 'M5.c', label: 'font-semibold utilities', direction: 'down', baseline: 472,
    targetLabel: '< 60', target: (n) => n < 60,
    measure: () => occurrences(TSX, /\bfont-semibold\b/g) },

  { id: 'M5.d', label: '.ua-text-working-title (files)', direction: 'up', baseline: 0,
    targetLabel: '> 30', target: (n) => n > 30,
    measure: () => fileCount(TSX, /ua-text-working-title/) },

  { id: 'M5.e', label: '.ua-text-caption-role (files)', direction: 'up', baseline: 0,
    targetLabel: '> 20', target: (n) => n > 20,
    measure: () => fileCount(TSX, /ua-text-caption-role/) },

  { id: 'M5.f', label: '.ua-text-section-title (files)', direction: 'up', baseline: 5,
    targetLabel: '> 20', target: (n) => n > 20,
    measure: () => fileCount(TSX, /ua-text-section-title/) },

  // ── M6 native controls ───────────────────────────────────────────────────
  { id: 'M6.a', label: 'bare <select> outside components/ui', direction: 'down', baseline: 39,
    targetLabel: '0', target: (n) => n === 0,
    measure: () => occurrences(TSX.filter(notUiPrimitive), /<select\b/g) },

  { id: 'M6.b', label: 'bare <textarea> outside components/ui', direction: 'down', baseline: 24,
    targetLabel: '0', target: (n) => n === 0,
    measure: () => occurrences(TSX.filter(notUiPrimitive), /<textarea\b/g) },

  { id: 'M6.c', label: '<details> disclosures', direction: 'down', baseline: 6,
    targetLabel: '0', target: (n) => n === 0,
    measure: () => occurrences(TSX.filter(notUiPrimitive), /<details\b/g) },

  { id: 'M6.d', label: 'raw type="checkbox"', direction: 'down', baseline: 10,
    targetLabel: '0', target: (n) => n === 0,
    measure: () => occurrences(TSX.filter(notUiPrimitive), /type="checkbox"/g) },

  // ── M4 elevation reaches the product ─────────────────────────────────────
  { id: 'M4.a', label: '--ua-elev-1 references', direction: 'up', baseline: 4,
    targetLabel: '>= 12', target: (n) => n >= 12,
    measure: () => occurrences([...CSS, ...TSX], /var\(--ua-elev-1/g) },

  { id: 'M4.b', label: 'transparent panels in dashboardPilot.module.css', direction: 'down', baseline: 8,
    targetLabel: '<= 1', target: (n) => n <= 1,
    measure: () => {
      const f = join(ROOT, 'components/dashboard/dashboardPilot.module.css');
      return existsSync(f) ? (read(f).match(/background:\s*transparent/g) || []).length : 0;
    } },

  // ── M1 dead config ───────────────────────────────────────────────────────
  { id: 'M1.a', label: 'tailwind.config.ts present (dead under v4)', direction: 'down', baseline: 1,
    targetLabel: '0', target: (n) => n === 0,
    measure: () => (existsSync(join(ROOT, 'tailwind.config.ts')) ? 1 : 0) },

  // ── M2 layer inversion ───────────────────────────────────────────────────
  { id: 'M2.a', label: 'styles/authenticated/*.css files without @layer', direction: 'down', baseline: 12,
    targetLabel: '0', target: (n) => n === 0,
    measure: () => {
      // Pure @import barrels (index.css) have no rule content of their own to
      // layer — only files that declare at least one rule block count.
      const files = collect(['styles/authenticated'], new Set(['.css']))
        .filter((f) => read(f).includes('{'));
      return files.filter((f) => !/@layer\s/.test(read(f))).length;
    } },

  // ── M3 radius collision ──────────────────────────────────────────────────
  // The three legacy --radius-md definitions in globals.css:root are correct
  // and left alone — they serve the public/marketing tree, which is out of
  // scope. The actual defect was that .ua-app inherited the public value
  // instead of --ua-radius-control; the fix is the scoped bridge in
  // tokens.css, not fewer :root declarations. This checks the fix landed.
  { id: 'M3.a', label: '.ua-app legacy-radius bridge present (tokens.css)', direction: 'up', baseline: 0,
    targetLabel: '1', target: (n) => n === 1,
    measure: () => {
      const f = join(ROOT, 'styles/authenticated/tokens.css');
      if (!existsSync(f)) return 0;
      return /--radius-md:\s*var\(--ua-radius-control\)/.test(read(f)) ? 1 : 0;
    } },

  { id: 'M3.b', label: 'dead .dark{} selector block in globals.css', direction: 'down', baseline: 1,
    targetLabel: '0', target: (n) => n === 0,
    measure: () => {
      const f = join(ROOT, 'app/globals.css');
      if (!existsSync(f)) return 0;
      return /^\s*\.dark\s*\{/m.test(read(f)) ? 1 : 0;
    } },

  // ── M7 repeated copy ─────────────────────────────────────────────────────
  { id: 'M7.a', label: 'exact-string boilerplate denylist (WorkQueue)', direction: 'down', baseline: 1,
    targetLabel: '0 — use a structural rule', target: (n) => n === 0,
    measure: () => {
      const f = join(ROOT, 'components/work/WorkQueue.tsx');
      return existsSync(f) && /REDUNDANT_DESCRIPTIONS\s*=\s*new Set/.test(read(f)) ? 1 : 0;
    } },

  { id: 'M7.b', label: 'permanent KPI definition <dd> on Reports', direction: 'down', baseline: 1,
    targetLabel: '0 — move to tooltip', target: (n) => n === 0,
    measure: () => {
      const f = join(ROOT, 'components/reporting/IntelligenceReportView.tsx');
      return existsSync(f) ? (read(f).match(/<dd[^>]*>\{step\.definition\}/g) || []).length : 0;
    } },

  // ── Cross-cutting debt the ledger inherits ───────────────────────────────
  { id: 'X.a', label: 'font-weight: 650 declarations', direction: 'down', baseline: 40,
    targetLabel: '0', target: (n) => n === 0,
    measure: () => occurrences(CSS, /font-weight:\s*650/g) },

  { id: 'X.b', label: 'hex literals in .ts/.tsx (app+components+lib)', direction: 'down', baseline: 151,
    targetLabel: '< 40', target: (n) => n < 40,
    measure: () => occurrences(TS_ALL, /#[0-9a-fA-F]{3,8}\b/g) },
];

function notUiPrimitive(f) {
  return !relative(ROOT, f).startsWith('components/ui/');
}

// ── Run ────────────────────────────────────────────────────────────────────
const rows = CHECKS.map((c) => {
  const actual = c.measure();
  const met = c.target(actual);
  const worse = c.direction === 'down' ? actual > c.baseline : actual < c.baseline;
  return { ...c, actual, met, regressed: worse && !met };
});

const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);

console.log('\nVisual adoption — docs/IMPL_authenticated_execution_ledger.md\n');
console.log(
  `  ${pad('ID', 7)}${pad('Item', 46)}${lpad('base', 6)}${lpad('now', 7)}  ${pad('target', 30)}status`,
);
console.log(`  ${'-'.repeat(105)}`);

for (const r of rows) {
  const status = r.met ? 'MET' : r.regressed ? 'REGRESSED' : 'open';
  console.log(
    `  ${pad(r.id, 7)}${pad(r.label, 46)}${lpad(r.baseline, 6)}${lpad(r.actual, 7)}  ${pad(r.targetLabel, 30)}${status}`,
  );
}

const met = rows.filter((r) => r.met).length;
const regressed = rows.filter((r) => r.regressed);

console.log(`\n  ${met}/${rows.length} at target.`);

if (regressed.length) {
  console.log(`\n  REGRESSED past the recorded baseline:`);
  for (const r of regressed) {
    console.log(`    ${r.id}  ${r.label}: ${r.baseline} -> ${r.actual}`);
  }
}

if (met === rows.length) {
  console.log('\n  All ledger items at target. Tighten baselines before the next pass.\n');
} else {
  console.log('');
}

if (!REPORT_ONLY && regressed.length) process.exit(1);
