#!/usr/bin/env node
/**
 * Applies safe mechanical fixes from react-doctor-report.json.
 * Run: node scripts/apply-react-doctor-autofix.mjs
 */
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const root = process.cwd();

function fixButtonTypes(content) {
  return content.replace(/<button(\s)(?![^>]*\btype=)/g, '<button$1type="button" ');
}

function fixButtonTypesMultiline(content) {
  return content.replace(/<button\s*\n(\s*)(?![\s\S]*?\btype=)/g, '<button\n$1type="button"\n$1');
}

function fixEmDashInJsx(content) {
  // Replace em dash in JSX text nodes only (heuristic: between > and <)
  return content.replace(
    />([^<]*?)—([^<]*?)</g,
    (match, before, after) => `>${before}-${after}<`,
  );
}

function fixThreePeriodEllipsis(content) {
  return content.replace(/>([^<]*?)\.\.\.([^<]*?)</g, (match, before, after) => {
    if (before.endsWith('.') || after.startsWith('.')) return match;
    if (/[{}[\]=]/.test(before) || /[{}[\]=]/.test(after)) return match;
    return `>${before}…${after}<`;
  });
}

function processFile(filePath) {
  const abs = path.join(root, filePath);
  if (!fs.existsSync(abs)) return false;
  if (abs.includes('node_modules') || abs.includes('.next/')) return false;
  let content = fs.readFileSync(abs, 'utf8');
  const original = content;
  content = fixButtonTypes(content);
  content = fixEmDashInJsx(content);
  if (content !== original) {
    fs.writeFileSync(abs, content);
    return true;
  }
  return false;
}

const report = JSON.parse(fs.readFileSync(path.join(root, 'react-doctor-report.json'), 'utf8'));
const diagnostics = report.diagnostics ?? [];

const rulesToAutofix = new Set([
  'button-has-type',
  'design-no-em-dash-in-jsx-text',
]);

const files = new Set();
for (const d of diagnostics) {
  if (rulesToAutofix.has(d.rule) && d.filePath) {
    files.add(d.filePath);
  }
}

let changed = 0;
for (const file of files) {
  if (processFile(file)) changed++;
}

// Also sweep all TSX for buttons missing type (catches files not in report slice)
const allTsx = globSync('**/*.{tsx,jsx}', {
  cwd: root,
  ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**'],
});
for (const rel of allTsx) {
  const abs = path.join(root, rel);
  let content = fs.readFileSync(abs, 'utf8');
  const next = fixButtonTypes(content);
  if (next !== content) {
    fs.writeFileSync(abs, next);
    changed++;
  }
}

console.log(`Updated ${changed} files`);
