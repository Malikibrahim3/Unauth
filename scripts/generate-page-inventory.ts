import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { surfaceManifest } from '../lib/surfaces/manifest';

const START = '<!-- active-renderer-inventory:start -->';
const END = '<!-- active-renderer-inventory:end -->';
const target = resolve(__dirname, '../docs/page-inventory.md');
const checkOnly = process.argv.includes('--check');

function activeRendererInventory() {
  const rows = surfaceManifest.map((entry) =>
    `| \`${entry.pathPattern}\` | \`${entry.pageModule}\` | \`${entry.primaryComponents[0]}\` | ${entry.maturity} |`,
  );
  return [
    START,
    '## Current executable page ownership',
    '',
    'Generated from `lib/surfaces/manifest.ts`; do not edit this block by hand. The verifier confirms that each named owner is reachable from the active page import graph and that the first-named owner is rendered, invoked, or directly re-exported by its page module. This ledger supersedes owner/component claims in archived audits and completion reports.',
    '',
    '| Route | Page module | Active renderer | Maturity |',
    '|---|---|---|---|',
    ...rows,
    END,
  ].join('\n');
}

const current = readFileSync(target, 'utf8');
const block = activeRendererInventory();
const next = current.includes(START) && current.includes(END)
  ? current.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block)
  : current.replace(/^# Frontend page and surface inventory\n/, `# Frontend page and surface inventory\n\n${block}\n`);
if (checkOnly) {
  if (current !== next) {
    console.error('Page inventory is stale. Run `npm run generate:page-inventory` and commit the generated projection.');
    process.exit(1);
  }
  console.log('PASS generated page inventory is current.');
} else {
  writeFileSync(target, next);
  console.log('Generated docs/page-inventory.md from lib/surfaces/manifest.ts.');
}
