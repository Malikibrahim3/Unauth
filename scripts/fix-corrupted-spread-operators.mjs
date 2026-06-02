#!/usr/bin/env node
/** Restore `...` spread operators corrupted by ellipsis JSX codemod (... U+2026). */
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const root = process.cwd();
const ELL = '\u2026';

function fixSpreads(content) {
  if (!content.includes(ELL)) return content;
  let c = content;
  const rules = [
    [/\[.../g, '[...'],
    [/\(.../g, '(...'],
    [/,\s*…(?=[A-Za-z_$[\]])/g, ', ...'],
    [/\{\s*…(?=[A-Za-z_$])/g, '{ ...'],
    [/Math\.max\(\s*…/g, 'Math.max(...'],
    [/Math\.max\(([^,]+),\s*…/g, 'Math.max($1, ...'],
    [/return\s*\{\s*nodes:\s*\[[^,]+,\s*…/g, (m) => m.replace(ELL, '...')],
    [/push\(.../g, 'push(...'],
    [/flatMap\(\(email\)\s*=>\s*\n?\s*…/g, 'flatMap((email) => ...'],
    [/...props\b/g, '...props'],
    [/...dataAttributes\b/g, '...dataAttributes'],
    [/...svgProps\b/g, '...svgProps'],
    [/...rest\b/g, '...rest'],
    [/...FIELD_STYLE/g, '...FIELD_STYLE'],
    [/…p,\s*\[id\]/g, '...p, [id]'],
    [/...x,/g, '...x,'],
    [/...sq,/g, '...sq,'],
    [/...item,/g, '...item,'],
    [/...i,/g, '...i,'],
    [/...prev/g, '...prev'],
    [/...r,/g, '...r,'],
    [/...sp,/g, '...sp,'],
    [/...exact/g, '...exact'],
    [/...rows/g, '...rows'],
    [/...notes/g, '...notes'],
    [/...q,/g, '...q,'],
    [/...m,/g, '...m,'],
    [/...merchant/g, '...merchant'],
    [/...statusStyle/g, '...statusStyle'],
    [/...FINAL/g, '...FINAL'],
    [/...GRADE_META/g, '...GRADE_META'],
    [/...faqFeatured/g, '...faqFeatured'],
    [/...SPARKLINE/g, '...SPARKLINE'],
    [/...customerAgg/g, '...customerAgg'],
    [/...networkRows/g, '...networkRows'],
    [/...buckets/g, '...buckets'],
    [/...searchParams/g, '...searchParams'],
    [/...verdicts/g, '...verdicts'],
    [/...graphNodes/g, '...graphNodes'],
    [/...orders/g, '...orders'],
    [/...signals/g, '...signals'],
    [/...TIERS/g, '...TIERS'],
    [/...rates/g, '...rates'],
    [/...pkgs/g, '...pkgs'],
    [/...querySearchParams/g, '...querySearchParams'],
    [/...serif/g, '...serif'],
    [/...mono/g, '...mono'],
    [/...style,/g, '...style,'],
    [/…style\}/g, '...style}'],
    [/...item\b/g, '...item'],
    [/...marker/g, '...marker'],
  ];
  for (const [re, rep] of rules) {
    c = c.replace(re, rep);
  }
  return c;
}

let n = 0;
for (const rel of globSync('**/*.{ts,tsx,js,mjs}', {
  cwd: root,
  ignore: ['**/node_modules/**', '**/.next/**'],
})) {
  const abs = path.join(root, rel);
  const orig = fs.readFileSync(abs, 'utf8');
  const next = fixSpreads(orig);
  if (next !== orig) {
    fs.writeFileSync(abs, next);
    n++;
  }
}
console.log(`Fixed ${n} files`);
