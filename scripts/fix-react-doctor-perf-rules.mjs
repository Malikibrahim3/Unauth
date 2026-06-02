#!/usr/bin/env node
/**
 * Applies mechanical fixes for react-doctor JS performance rules.
 * Run: node scripts/fix-react-doctor-perf-rules.mjs
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const PERF_RULES = new Set([
  'js-flatmap-filter',
  'js-combine-iterations',
  'js-index-maps',
  'js-set-map-lookups',
  'js-hoist-intl',
  'js-hoist-regexp',
  'js-cache-property-access',
  'js-min-max-loop',
  'async-parallel',
  'async-defer-await',
  'server-sequential-independent-await',
]);

const report = JSON.parse(fs.readFileSync(path.join(root, 'react-doctor-report.json'), 'utf8'));
const diagnostics = (report.projects?.[0]?.diagnostics ?? report.diagnostics ?? []).filter((d) =>
  PERF_RULES.has(d.rule),
);

/** @type {Map<string, { content: string, lines: string[] }>} */
const fileCache = new Map();

function loadFile(rel) {
  if (!fileCache.has(rel)) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) return null;
    const content = fs.readFileSync(abs, 'utf8');
    fileCache.set(rel, { content, lines: content.split('\n') });
  }
  return fileCache.get(rel);
}

function saveFile(rel) {
  const entry = fileCache.get(rel);
  if (!entry) return;
  const next = entry.lines.join('\n');
  if (next !== entry.content) {
    fs.writeFileSync(path.join(root, rel), next);
    entry.content = next;
  }
}

function replaceInFile(rel, oldStr, newStr) {
  const entry = loadFile(rel);
  if (!entry) return false;
  if (!entry.lines.join('\n').includes(oldStr)) return false;
  const joined = entry.lines.join('\n').replace(oldStr, newStr);
  entry.lines = joined.split('\n');
  return true;
}

// ── Common map().filter(Boolean) patterns ───────────────────────────────────
const FLATMAP_REPLACEMENTS = [
  [/.map\((\w+) => \1\.customer_profile_id\)\.filter\(Boolean\)/g, '.flatMap($1 => $1.customer_profile_id ? [$1.customer_profile_id] : [])'],
  [/.map\(\((\w+)\) => \1\.customer_id\)\.filter\(Boolean\)/g, '.flatMap(($1) => $1.customer_id ? [$1.customer_id] : [])'],
  [/.map\(\((\w+)\) => \1\.shopify_order_id\)\.filter\(Boolean\)/g, '.flatMap(($1) => $1.shopify_order_id ? [$1.shopify_order_id] : [])'],
  [/.map\(\((\w+)\) => \1\.id\)\.filter\(Boolean\)/g, '.flatMap(($1) => $1.id ? [$1.id] : [])'],
  [/.map\((\w+) => \1\.id\)\.filter\(\((\w+)\) => typeof \2 === 'string'\)/g, '.flatMap(($1) => (typeof $1.id === \'string\' ? [$1.id] : []))'],
  [/.map\((\w+) => String\(\1\)\)\.filter\(Boolean\)/g, '.flatMap($1 => { const v = String($1); return v ? [v] : []; })'],
  [/.map\(\((\w+)\) => (\w+)\.get\(\1\.id\)\)\.filter\(Boolean\)/g, '.flatMap(($1) => { const v = $2.get($1.id); return v ? [v] : []; })'],
  [/.map\(\((\w+)\) => \1\.customer_profile_id\)\.filter\(Boolean\)/g, '.flatMap(($1) => $1.customer_profile_id ? [$1.customer_profile_id] : [])'],
  [/.map\(\((\w+)\) => \1\.emailHash\)\.filter\(Boolean\)/g, '.flatMap(($1) => $1.emailHash ? [$1.emailHash] : [])'],
  [/.map\(\((\w+)\) => \1\.body\)\.filter\(Boolean\)/g, '.flatMap(($1) => $1.body ? [$1.body] : [])'],
  [/.map\(\((\w+)\) => \1\.trim\(\)\)\.filter\(Boolean\)/g, '.flatMap(($1) => { const v = $1.trim(); return v ? [v] : []; })'],
  [/.map\(\((\w+)\) => \1\?\.trim\(\)\)\.filter\(Boolean\)/g, '.flatMap(($1) => { const v = $1?.trim(); return v ? [v] : []; })'],
  [/.map\(\((\w+)\) => \1\.processedAt\)\.filter\(Boolean\)/g, '.flatMap(($1) => $1.processedAt ? [$1.processedAt] : [])'],
  [/.map\(\((\w+)\) => \1\.job_id\)\.filter\(Boolean\)/g, '.flatMap(($1) => $1.job_id ? [$1.job_id] : [])'],
  [/.map\(\((\w+)\) => \1\.cluster_id\)\.filter\(Boolean\)/g, '.flatMap(($1) => $1.cluster_id ? [$1.cluster_id] : [])'],
  [/.map\(\((\w+)\) => truthByOrder\.get\(\1\)\)\.filter\(Boolean\)/g, '.flatMap((id) => { const v = truthByOrder.get(id); return v ? [v] : []; })'],
  [/.map\(\((\w+)\) => \1\.created_at_shopify\)\.filter\(Boolean\)/g, '.flatMap(($1) => $1.created_at_shopify ? [$1.created_at_shopify] : [])'],
  [/.map\(\((\w+)\) => String\(\1\)\)\.filter\(Boolean\)/g, '.flatMap(($1) => { const v = String($1); return v ? [v] : []; })'],
  [/.map\(\((\w+)\) => \1\.shipping_address\?\.trim\(\) ?? ''\)\.filter\(Boolean\)/g,
    ".flatMap(($1) => { const v = $1.shipping_address?.trim() ?? ''; return v ? [v] : []; })"],
  [/.map\(\((\w+)\) => \1\.device_ip\?\.trim\(\) ?? ''\)\.filter\(Boolean\)/g,
    ".flatMap(($1) => { const v = $1.device_ip?.trim() ?? ''; return v ? [v] : []; })"],
  [/.map\(\((\w+)\) => \1\.payment_method ?? ''\)\.filter\(Boolean\)/g,
    ".flatMap(($1) => { const v = $1.payment_method ?? ''; return v ? [v] : []; })"],
  [/.map\(\((\w+)\) => \1\.payment_method \?\? ''\)\.filter\(Boolean\)/g,
    ".flatMap(($1) => { const v = $1.payment_method ?? ''; return v ? [v] : []; })"],
];

function applyRegexReplacements(rel) {
  const entry = loadFile(rel);
  if (!entry) return;
  let joined = entry.lines.join('\n');
  let changed = false;
  for (const [re, repl] of FLATMAP_REPLACEMENTS) {
    const next = joined.replace(re, repl);
    if (next !== joined) {
      joined = next;
      changed = true;
    }
  }
  if (changed) entry.lines = joined.split('\n');
}

// Sweep all project source files for flatmap patterns
const sourceGlobs = ['app', 'components', 'lib', 'audit', 'synthetic-lab'];
function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      walk(p, acc);
    } else if (/\.(ts|tsx|js|mjs)$/.test(name)) acc.push(p);
  }
  return acc;
}

for (const dir of sourceGlobs) {
  const absDir = path.join(root, dir);
  if (!fs.existsSync(absDir)) continue;
  for (const abs of walk(absDir)) {
    applyRegexReplacements(path.relative(root, abs));
  }
}

// ── lib/utils/format.ts — hoist Intl ────────────────────────────────────────
if (loadFile('lib/utils/format.ts')) {
  const intlBlock = `const MERCHANT_DISPLAY_CURRENCY = 'USD';
const MERCHANT_DISPLAY_LOCALE = 'en-US';

const currencyFormatter = new Intl.NumberFormat(MERCHANT_DISPLAY_LOCALE, {
  style: 'currency',
  currency: MERCHANT_DISPLAY_CURRENCY,
  minimumFractionDigits: 2,
});

const dateTimePartsFormatter = new Intl.DateTimeFormat(MERCHANT_DISPLAY_LOCALE, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

const dateTableFormatter = new Intl.DateTimeFormat(MERCHANT_DISPLAY_LOCALE, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
});

const dateProseFormatter = new Intl.DateTimeFormat(MERCHANT_DISPLAY_LOCALE, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

const dateShortFormatter = new Intl.DateTimeFormat(MERCHANT_DISPLAY_LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
`;

  if (loadFile('lib/utils/format.ts') && !loadFile('lib/utils/format.ts')!.lines.join('\n').includes('const currencyFormatter =')) {
  replaceInFile(
    'lib/utils/format.ts',
    `const MERCHANT_DISPLAY_CURRENCY = 'USD';
const MERCHANT_DISPLAY_LOCALE = 'en-US';`,
    intlBlock.trimEnd(),
  );
  replaceInFile(
    'lib/utils/format.ts',
    `  return new Intl.NumberFormat(MERCHANT_DISPLAY_LOCALE, {
    style: 'currency',
    currency: MERCHANT_DISPLAY_CURRENCY,
    minimumFractionDigits: 2,
  }).format(amount);`,
    '  return currencyFormatter.format(amount);',
  );
  replaceInFile(
    'lib/utils/format.ts',
    `  const parts = new Intl.DateTimeFormat(MERCHANT_DISPLAY_LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).formatToParts(d);`,
    '  const parts = dateTimePartsFormatter.formatToParts(d);',
  );
  replaceInFile(
    'lib/utils/format.ts',
    `    return new Intl.DateTimeFormat(MERCHANT_DISPLAY_LOCALE, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC',
    }).format(d);`,
    '    return dateTableFormatter.format(d);',
  );
  replaceInFile(
    'lib/utils/format.ts',
    `    return new Intl.DateTimeFormat(MERCHANT_DISPLAY_LOCALE, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d);`,
    '    return dateProseFormatter.format(d);',
  );
  replaceInFile(
    'lib/utils/format.ts',
    `    return new Intl.DateTimeFormat(MERCHANT_DISPLAY_LOCALE, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d);`,
    '    return dateShortFormatter.format(d);',
  );
  }
}

// ── lib/scorer.ts — hoist RegExp ────────────────────────────────────────────
if (loadFile('lib/scorer.ts')) {
  replaceInFile(
    'lib/scorer.ts',
    `const FORBIDDEN_WORDS = ['fraud', 'fraudulent', 'scammer', 'criminal', 'confirmed fraud'];

function guardLanguage(text: string): string {
  let safe = text;
  for (const word of FORBIDDEN_WORDS) {
    const re = new RegExp(word, 'gi');
    safe = safe.replace(re, 'unusual activity');
  }
  return safe;
}`,
    `const FORBIDDEN_WORDS = ['fraud', 'fraudulent', 'scammer', 'criminal', 'confirmed fraud'];
const FORBIDDEN_WORD_PATTERNS = FORBIDDEN_WORDS.map((word) => new RegExp(word, 'gi'));

function guardLanguage(text: string): string {
  let safe = text;
  for (const re of FORBIDDEN_WORD_PATTERNS) {
    safe = safe.replace(re, 'unusual activity');
  }
  return safe;
}`,
  );
}

// Save all touched files
for (const rel of fileCache.keys()) saveFile(rel);

console.log(`Processed ${fileCache.size} files from perf rule sweep`);
