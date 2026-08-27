import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const schemaSource = readFileSync(resolve(root, 'lib/utils/env.ts'), 'utf8');
const exampleSource = readFileSync(resolve(root, '.env.local.example'), 'utf8');
const errors = [];

const schemaKeys = [...schemaSource.matchAll(/^\s{2}([A-Z][A-Z0-9_]+):/gm)].map((match) => match[1]);
const exampleMatches = [...exampleSource.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)];
const exampleKeys = exampleMatches.map((match) => match[1]);

const duplicates = [...new Set(exampleKeys.filter((key, index) => exampleKeys.indexOf(key) !== index))];
if (duplicates.length) errors.push(`Duplicate keys in .env.local.example: ${duplicates.join(', ')}`);

const schemaSet = new Set(schemaKeys);
const exampleSet = new Set(exampleKeys);
const missingExample = schemaKeys.filter((key) => !exampleSet.has(key));
const undocumented = exampleKeys.filter((key) => !schemaSet.has(key));
if (missingExample.length) errors.push(`Schema keys missing from .env.local.example: ${missingExample.join(', ')}`);
if (undocumented.length) errors.push(`Example keys missing from lib/utils/env.ts: ${undocumented.join(', ')}`);

// Scan application and checked-in tooling for direct reads. Every configurable
// key must be represented by the canonical schema; NODE_ENV/CI are included in
// the schema too, so a new direct read cannot silently create a second contract.
const directReads = new Set();
const scan = readFileSync(resolve(root, 'lib/utils/env.ts'), 'utf8');
for (const match of scan.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) directReads.add(match[1]);
// The schema itself is not the only source that reads env; use git's tracked
// file list so ignored evidence/private state never influences this check.
const { execFileSync } = await import('node:child_process');
const tracked = execFileSync('git', ['ls-files', '--', '*.ts', '*.tsx', '*.js', '*.jsx', '*.mjs', '*.cjs'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
for (const file of tracked) {
  if (file === 'lib/utils/env.ts' || file.startsWith('extensions/chrome/dist/')) continue;
  const source = readFileSync(resolve(root, file), 'utf8');
  for (const match of source.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) directReads.add(match[1]);
}
const untypedReads = [...directReads].filter((key) => !schemaSet.has(key)).sort();
if (untypedReads.length) errors.push(`Direct process.env reads missing from lib/utils/env.ts: ${untypedReads.join(', ')}`);

const productionRequired = [
  'RESEND_API_KEY',
  'CRON_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'INTERNAL_HMAC_SECRET',
  'SHOPIFY_API_KEY',
  'SHOPIFY_API_SECRET',
  'SHOPIFY_WEBHOOK_SECRET',
  'NEXT_PUBLIC_APP_URL',
];
for (const key of productionRequired) {
  if (!schemaSet.has(key) || !exampleSet.has(key)) errors.push(`Production-required environment key is not fully documented: ${key}`);
}

if (errors.length) {
  console.error(`Environment contract verification failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`PASS environment contract (${schemaKeys.length} schema keys; ${exampleKeys.length} documented keys; direct reads covered).`);
