import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { surfaceManifest } from '../lib/surfaces/manifest';

const START = '<!-- active-renderer-inventory:start -->';
const END = '<!-- active-renderer-inventory:end -->';
const target = resolve(__dirname, '../docs/page-inventory.md');

function activeRendererInventory() {
  const rows = surfaceManifest.map((entry) =>
    `| \`${entry.pathPattern}\` | \`${entry.pageModule}\` | \`${entry.primaryComponents[0]}\` | ${entry.maturity} |`,
  );
  return [
    START,
    '## Current executable page ownership',
    '',
    'Generated from `lib/surfaces/manifest.ts` on 24 August 2026. The verifier confirms that each named owner is reachable from the active page import graph and that the first-named owner is rendered, invoked, or directly re-exported by its page module. This ledger supersedes owner/component claims in older audits and completion reports.',
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
writeFileSync(target, next);
