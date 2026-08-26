import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(process.cwd());
const errors = [];
const retiredProductName = ['Parcel', 'Claim'].join('');

const requiredOwners = [
  'ARCHITECTURE.md',
  'PRODUCT.md',
  'DESIGN.md',
  'docs/product/MVP_PLUS_SCOPE.md',
  'docs/product/CAPABILITY_STATUS.md',
  'docs/product/MR6_HANDOFF.md',
  'docs/product/RELEASE_READINESS.md',
  'docs/product/UX9_STATUS.md',
  'docs/product/DEPLOYMENT_READINESS.md',
  'docs/product/DEPENDENCY_UPGRADES.md',
  'docs/page-inventory.md',
  'lib/navigation/appRoutes.ts',
  'lib/navigation/aliases.js',
  'next.config.js',
  'lib/surfaces/manifest.ts',
  'lib/integrations/registry.ts',
  'lib/connectors/registry.ts',
  'lib/billing/plans.ts',
  'lib/utils/env.ts',
  'lib/permissions/constants.ts',
  'lib/permissions/roles.ts',
  'lib/notifications/kinds.ts',
  'lib/claims/statusMachine.ts',
  'lib/cases/stateMachine.ts',
  'lib/utils/format.ts',
  'lib/financial/canonicalAggregates.ts',
  'scripts/release-migration-manifest.mjs',
];

for (const owner of requiredOwners) {
  if (!existsSync(join(root, owner))) errors.push(`Missing canonical owner: ${owner}`);
}

const architecturePath = join(root, 'ARCHITECTURE.md');
const architecture = readFileSync(architecturePath, 'utf8');
if (!architecture.includes('| Concern | Binding owner | Projection or boundary |')) {
  errors.push('ARCHITECTURE.md is missing the canonical owner table.');
}

// The owner column is deliberately parsed from the authority index so adding a
// new concern without a real file cannot silently pass review.
for (const row of architecture.matchAll(/^\|[^\n]+\|([^\n]+)\|[^\n]+\|$/gm)) {
  const ownerCell = row[1];
  for (const owner of ownerCell.matchAll(/`([^`]+)`/g)) {
    const candidate = owner[1];
    if (candidate.includes('/') || /\.(?:md|ts|tsx|js|mjs|json)$/.test(candidate)) {
      if (!existsSync(join(root, candidate))) errors.push(`Authority table points to missing file: ${candidate}`);
    }
  }
}

const currentDocs = [
  'ARCHITECTURE.md',
  'PRODUCT.md',
  'DESIGN.md',
  'docs/page-inventory.md',
  'docs/product/MVP_PLUS_SCOPE.md',
  'docs/product/CAPABILITY_STATUS.md',
  'docs/product/MR6_HANDOFF.md',
  'docs/product/RELEASE_READINESS.md',
  'docs/product/UX9_STATUS.md',
  'docs/product/DEPLOYMENT_READINESS.md',
  'docs/product/DEPENDENCY_UPGRADES.md',
  'docs/product/DEAD_CODE_CANDIDATES.md',
];

for (const doc of currentDocs) {
  const path = join(root, doc);
  if (!existsSync(path)) continue;
  const source = readFileSync(path, 'utf8');
  if (!/^#\s+\S/m.test(source)) errors.push(`${doc} has no Markdown heading.`);
  if (doc !== 'ARCHITECTURE.md' && /\b(?:binding|sole)\s+(?:authority|owner)\b/i.test(source)) {
    errors.push(`${doc} claims binding authority; route the concern through ARCHITECTURE.md.`);
  }
  for (const match of source.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1];
    if (/^(?:https?:|mailto:|#)/i.test(target)) continue;
    const [rawPath, rawFragment] = target.split('#', 2);
    if (!rawPath || !/\.(?:md|markdown|txt)$/i.test(rawPath)) continue;
    const resolved = rawPath.startsWith('/') ? join(root, rawPath.slice(1)) : resolve(path, '..', rawPath);
    if (!existsSync(resolved)) {
      errors.push(`${doc} links to missing document: ${target}`);
      continue;
    }
    if (rawFragment) {
      const headings = readFileSync(resolved, 'utf8')
        .split('\n')
        .filter((line) => /^#{1,6}\s+/.test(line))
        .map((line) => line.replace(/^#{1,6}\s+/, '').trim().toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-'));
      if (!headings.includes(rawFragment.toLowerCase())) errors.push(`${doc} links to missing heading: ${target}`);
    }
  }
}

// Never allow the old product/package name or stale section anchors back into
// current source and documentation. Archived evidence is outside this tree.
const skipDirectories = new Set(['.git', 'node_modules', 'private', 'artifacts', 'references', 'tests/reports', 'extensions/chrome/dist']);
const textExtensions = new Set(['.md', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css']);
function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(directory, entry.name);
    const rel = relative(root, full);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.next') || skipDirectories.has(rel) || [...skipDirectories].some((item) => rel.startsWith(`${item}/`))) continue;
      walk(full);
      continue;
    }
    if (!textExtensions.has(entry.name.slice(entry.name.lastIndexOf('.')))) continue;
    let source;
    try {
      if (statSync(full).size > 2_000_000) continue;
      source = readFileSync(full, 'utf8');
    } catch {
      continue;
    }
    if (/ARCHITECTURE\.md\s+§/.test(source)) errors.push(`${rel} contains a stale ARCHITECTURE.md section reference.`);
    if (source.toLowerCase().includes(retiredProductName.toLowerCase())) errors.push(`${rel} contains the retired product name.`);
  }
}
walk(root);

const inventoryCheck = spawnSync('node_modules/.bin/ts-node', [
  '--transpile-only',
  '--compiler-options',
  '{"module":"commonjs","moduleResolution":"node"}',
  'scripts/generate-page-inventory.ts',
  '--check',
], { cwd: root, encoding: 'utf8' });
if (inventoryCheck.status !== 0) {
  errors.push(`Generated page inventory is stale: ${(inventoryCheck.stderr || inventoryCheck.stdout).trim()}`);
}

const providerCheck = spawnSync('node_modules/.bin/ts-node', [
  '--transpile-only',
  '-r',
  'tsconfig-paths/register',
  '--compiler-options',
  '{"module":"commonjs","moduleResolution":"node"}',
  '-e',
  "const r=require('./lib/integrations/registry'); console.log(JSON.stringify(r.INTEGRATION_PROVIDERS.map(p=>({name:p.name,stage:r.deriveProviderDisplayStage(p)}))))",
], { cwd: root, encoding: 'utf8' });
if (providerCheck.status !== 0) {
  errors.push(`Could not evaluate provider registry: ${(providerCheck.stderr || providerCheck.stdout).trim()}`);
} else {
  const jsonLine = providerCheck.stdout.trim().split('\n').reverse().find((line) => line.startsWith('['));
  try {
    const providers = JSON.parse(jsonLine ?? '[]');
    const byName = new Map(providers.map((provider) => [provider.name, provider.stage]));
    const capabilityDoc = readFileSync(join(root, 'docs/product/CAPABILITY_STATUS.md'), 'utf8');
    for (const row of capabilityDoc.matchAll(/^\|\s*([^|]+?)\s*\|\s*[^|]+\|\s*(Live|Beta|Partial|Planned)\s*\|/gmi)) {
      const name = row[1].trim();
      const expected = row[2].toLowerCase();
      const actual = byName.get(name);
      if (!actual) errors.push(`Capability document names an unknown provider: ${name}`);
      else if (actual !== expected) errors.push(`Capability document drift for ${name}: says ${expected}, registry derives ${actual}.`);
    }
  } catch {
    errors.push('Could not parse provider registry output for capability drift check.');
  }
}

if (errors.length) {
  console.error(`Authority verification failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`PASS canonical authority map (${currentDocs.length} current documents; page and capability projections in sync).`);
