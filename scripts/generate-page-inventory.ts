import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { surfaceManifest, scenarioLedger } from '../lib/surfaces/manifest';

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
    '',
    'Current acceptance scope is governed by `GLOBAL_RULES.md`, `docs/product/MERCHANT_CLARITY_IMPLEMENTATION.md` and the public-only `docs/product/PUBLIC_EXPERIENCE_TRANSFORMATION.md`. Historical cutover phases do not authorise replacement. Landing/pricing/legal support responsive marketing at 390/768. Auth/demo/onboarding/app remain desktop-only; verify 1024/1280/1440, short heights, zoom and safe destination/plan handoff independently. These are requirements, not a runtime-compliance claim.',
    '',
    '### Planned merchant-clarity scenarios',
    '',
    'Generated from the same scenario ledger. These obligations are not implemented or accepted merely by being listed.',
    '',
    '| Scenario | Owner | Required exercise |',
    '|---|---|---|',
    ...scenarioLedger.filter((scenario) => scenario.readiness === 'planned').map((scenario) =>
      `| \`${scenario.id}\` | \`${scenario.owner}\` | ${scenario.activationRecipe} |`,
    ),
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
