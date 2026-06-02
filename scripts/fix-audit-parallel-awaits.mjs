#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      walk(p, acc);
    } else if (/\.js$/.test(name)) acc.push(p);
  }
  return acc;
}

const patterns = [
  [
    /const id = await (\w+)\.getAttribute\('id'\)\.catch\(\(\) => ''\);\s*const name = await \1\.getAttribute\('name'\)\.catch\(\(\) => ''\);/g,
    "const [id, name] = await Promise.all([$1.getAttribute('id').catch(() => ''), $1.getAttribute('name').catch(() => '')]);",
  ],
  [
    /const name = await (\w+)\.getAttribute\('name'\)\.catch\(\(\) => ''\);\s*const id = await \1\.getAttribute\('id'\)\.catch\(\(\) => ''\);/g,
    "const [name, id] = await Promise.all([$1.getAttribute('name').catch(() => ''), $1.getAttribute('id').catch(() => '')]);",
  ],
  [
    /const name = await (\w+)\.getAttribute\('name'\)\.catch\(\(\) => ''\);\s*const placeholder = await \1\.getAttribute\('placeholder'\)\.catch\(\(\) => ''\);/g,
    "const [name, placeholder] = await Promise.all([$1.getAttribute('name').catch(() => ''), $1.getAttribute('placeholder').catch(() => '')]);",
  ],
];

let changed = 0;
for (const abs of walk(path.join(root, 'audit'))) {
  let content = fs.readFileSync(abs, 'utf8');
  const original = content;
  for (const [re, repl] of patterns) {
    content = content.replace(re, repl);
  }
  if (content !== original) {
    fs.writeFileSync(abs, content);
    changed++;
  }
}

console.log(`Updated ${changed} audit files`);
