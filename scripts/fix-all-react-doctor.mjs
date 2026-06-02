#!/usr/bin/env node
/**
 * Mechanical fixes for react-doctor warnings across the codebase.
 * Run: node scripts/fix-all-react-doctor.mjs
 * Then: npx react-doctor . --json > react-doctor-report.json
 */
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const root = process.cwd();

const IGNORE = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/package-lock.json',
  '**/react-doctor-report.json',
  '**/scripts/react-doctor-fix-queue.json',
];

function bumpTinyText(content) {
  let next = content;
  // Tailwind arbitrary sizes below 12px -> text-xs (12px)
  next = next.replace(/text-\[(8(?:\.5)?|9(?:\.5)?|10(?:\.5)?|11(?:\.5)?)px\]/g, 'text-xs');
  // Common fixed small sizes
  next = next.replace(/\btext-\[10px\]/g, 'text-xs');
  next = next.replace(/\btext-\[11px\]/g, 'text-xs');
  next = next.replace(/\btext-\[9px\]/g, 'text-xs');
  next = next.replace(/\btext-\[8px\]/g, 'text-xs');
  // Inline fontSize in style objects (whole px values 8-11)
  next = next.replace(/fontSize:\s*['"]?(8|9|10|11)(?:\.5)?px['"]?/g, "fontSize: '12px'");
  next = next.replace(/fontSize:\s*(8|9|10|11)(?:\.5)?/g, 'fontSize: 12');
  next = next.replace(/['"]fontSize['"]:\s*['"]?(8|9|10|11)(?:\.5)?px['"]?/g, "'fontSize': '12px'");
  return next;
}

function fixWideLetterSpacing(content) {
  let next = content;
  // Drop wide tracking on body-scale utility combos (keep on uppercase label patterns)
  next = next.replace(/\btracking-widest\b/g, 'tracking-wide');
  next = next.replace(/\btracking-\[0\.0[6-9]em\]/g, 'tracking-normal');
  next = next.replace(/\btracking-\[0\.1em\]/g, 'tracking-wide');
  next = next.replace(/letterSpacing:\s*['"]?0\.0[6-9]em['"]?/g, "letterSpacing: '0.02em'");
  return next;
}

function fixRedundantPadding(content) {
  return content.replace(/\bpx-(\d+)\s+py-\1\b/g, 'p-$1');
}

function fixEmDash(content) {
  return content.replace(/>([^<]*?)—([^<]*?)</g, (m, a, b) => `>${a}-${b}<`);
}

function fixEllipsis(content) {
  return content.replace(/>([^<]*?)\.\.\.([^<]*?)</g, (match, before, after) => {
    if (before.endsWith('.') || after.startsWith('.')) return match;
    // Only UI text between tags — never touch code that contains braces or spread-like tokens
    if (/[{}[\]=]/.test(before) || /[{}[\]=]/.test(after)) return match;
    return `>${before}…${after}<`;
  });
}

function fixButtonTypes(content) {
  return content.replace(/<button(\s)(?![^>]*\btype=)/g, '<button$1type="button" ');
}

function fixToSorted(content) {
  let next = content;
  // arr.toSorted( -> arr.toSorted(
  next = next.replace(/\[\.\.\.([a-zA-Z_$][\w$.?[\]'"]*)\]\.sort\(/g, '$1.toSorted(');
  // .toSorted( -> .toSorted(
  next = next.replace(/\.slice\(\)\.sort\(/g, '.toSorted(');
  return next;
}

function fixTransitionAll(content) {
  return content.replace(/transition:\s*['"]all\b/g, "transition: 'opacity 200ms, transform 200ms");
}

function fixNoTransitionAllClass(content) {
  return content.replace(/\btransition-all\b/g, 'transition-colors');
}

const stats = { files: 0, rules: {} };

function apply(name, fn, content) {
  const next = fn(content);
  if (next !== content) {
    stats.rules[name] = (stats.rules[name] || 0) + 1;
    return next;
  }
  return content;
}

const patterns = ['**/*.{tsx,ts,jsx,js,mjs}'];
const files = globSync(patterns, { cwd: root, ignore: IGNORE });

for (const rel of files) {
  const abs = path.join(root, rel);
  let content = fs.readFileSync(abs, 'utf8');
  const original = content;

  content = apply('tiny-text', bumpTinyText, content);
  content = apply('letter-spacing', fixWideLetterSpacing, content);
  content = apply('padding', fixRedundantPadding, content);
  if (rel.endsWith('.tsx') || rel.endsWith('.jsx')) {
    content = apply('em-dash', fixEmDash, content);
    content = apply('ellipsis', fixEllipsis, content);
    content = apply('button-type', fixButtonTypes, content);
  }
  content = apply('toSorted', fixToSorted, content);
  content = apply('transition-colors', fixTransitionAll, content);
  content = apply('transition-colors-class', fixNoTransitionAllClass, content);

  if (content !== original) {
    fs.writeFileSync(abs, content);
    stats.files++;
  }
}

console.log(JSON.stringify(stats, null, 2));
