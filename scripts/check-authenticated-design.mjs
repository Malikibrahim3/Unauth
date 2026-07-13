import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const ROOT = process.cwd();
const scanRoots = [
  'app/(app)',
  'app/onboarding',
  'app/audit-running',
  ...[
    'apply', 'analytics', 'billing', 'cases', 'claims', 'collaboration',
    'connections', 'customers', 'evidence', 'exceptions', 'identity', 'imports',
    'inbox', 'integrations', 'layout', 'losses', 'nav', 'navigation',
    'notifications', 'product', 'relationships', 'reporting', 'reports', 'rules',
    'settings', 'shopify', 'sources', 'states', 'support', 'ui', 'work', 'workbench',
  ].map((dir) => `components/${dir}`),
];

const ignored = new Set([
  'components/ui/LandingPrimitives.tsx',
  'components/ui/tokens.ts',
]);

const oldPalette = /#(?:7b2d26|5e2018|a85040|f4e6e0|f8f5ee|fdfbf6|d8d0bd|4a4640|8a8472|ead8d2|8a2828|c45c4c|a84035|18150f|211d16)\b|var\(--(?:copper-(?:bright|mid|dim|glow)|brand-rust(?:-hover|-soft)?)\)/gi;
const landingDependency = /var\(--(?:landing-|fl-)/g;
const allowedExtensions = new Set(['.ts', '.tsx', '.css']);

async function filesUnder(path) {
  const absolute = join(ROOT, path);
  const entries = await readdir(absolute, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) results.push(...await filesUnder(child));
    else if (allowedExtensions.has(extname(entry.name))) results.push(child);
  }
  return results;
}

const files = (await Promise.all(scanRoots.map(filesUnder))).flat();
const failures = [];

for (const file of files) {
  const normalized = relative(ROOT, join(ROOT, file));
  if (ignored.has(normalized) || normalized === 'app/(app)/authenticated.css') continue;
  const source = await readFile(join(ROOT, file), 'utf8');
  for (const [rule, expression] of [['old palette', oldPalette], ['landing token dependency', landingDependency]]) {
    expression.lastIndex = 0;
    let match;
    while ((match = expression.exec(source))) {
      const line = source.slice(0, match.index).split('\n').length;
      failures.push(`${normalized}:${line} ${rule}: ${match[0]}`);
    }
  }
}

if (failures.length) {
  console.error('Authenticated design guard failed:\n' + failures.join('\n'));
  process.exit(1);
}

console.log(`Authenticated design guard passed (${files.length} files checked).`);
