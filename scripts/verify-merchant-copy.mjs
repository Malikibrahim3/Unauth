import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const TARGETS = [
  'app/(app)',
  'app/(public)/landing',
  'app/(public)/demo',
  'components',
  'lib/billing',
  'lib/audit',
  'lib/claims',
  'lib/copy',
  'lib/gorgias',
  'lib/notifications',
  'lib/payouts',
  'lib/reporting',
];

const PROHIBITED = [
  ['generic case noun', /\bpayout\s+case\b/i],
  ['generic claim history', /\bclaim\s+history\b/i],
  ['generic claim events', /\bclaim\s+events?\b/i],
  ['unmatched-rule failure copy', /no\s+merchant\s+rule\s+matched/i],
  ['release-gate copy', /release[\s-]+gate(?:d)?/i],
  ['cockpit copy', /\bcockpit\b/i],
  ['minor-unit input copy', /amount\s*\(\s*minor\s*\)|\bminor\s+units?\b/i],
  ['provider-neutral placeholder', /provider-neutral\s+source\s+connection/i],
  ['page-open instrumentation', /health\s+checks\s+update\s+when\s+this\s+page\s+opens/i],
  ['manual match-refresh instruction', /match\s+the\s+claimed\s+item\s+first|then\s+refresh\s+to\s+produce/i],
  ['ambiguous source label', /\bunknown\s+source\b/i],
  ['stale navigation label', /\bback\s+to\s+dashboard\b|\bopen\s+claims\b/i],
  ['stale report title', /payout\s+performance|payout\s+reports|no\s+payout\s+cases?/i],
  ['flow implementation copy', /preview\s+mode|dry[-\s]run/i],
  ['raw UUID in product source', /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i],
];

function filesUnder(path) {
  const absolute = resolve(ROOT, path);
  if (!statSync(absolute).isDirectory()) return [];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = join(absolute, entry.name);
    if (entry.isDirectory()) return filesUnder(relative(ROOT, child));
    if (!/\.(tsx?|mjs)$/.test(entry.name) || /\.test\./.test(entry.name)) return [];
    return [child];
  });
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/^\s*\/\/.*$/gm, (match) => match.replace(/[^\n]/g, ' '));
}

const files = [...new Set(TARGETS.flatMap(filesUnder))].sort();
const violations = [];
for (const file of files) {
  const source = stripComments(readFileSync(file, 'utf8'));
  source.split('\n').forEach((line, index) => {
    for (const [name, pattern] of PROHIBITED) {
      if (pattern.test(line)) {
        violations.push(`${relative(ROOT, file)}:${index + 1} ${name}: ${line.trim()}`);
      }
    }
  });
}

const registry = readFileSync(resolve(ROOT, 'lib/ui/merchantCopy.ts'), 'utf8');
for (const required of ['ENTITY_LABELS', 'FINANCIAL_STAGE_DEFINITIONS', 'DATA_STATE_COPY', 'parseMajorUnitInput', 'formatMajorUnitInput']) {
  if (!registry.includes(required)) violations.push(`lib/ui/merchantCopy.ts missing registry contract: ${required}`);
}

if (violations.length) {
  console.error(`Merchant copy scan failed with ${violations.length} violation${violations.length === 1 ? '' : 's'}:`);
  for (const violation of violations) console.error(`  ${violation}`);
  process.exitCode = 1;
} else {
  console.log(`Merchant copy scan passed: ${files.length} source files, ${PROHIBITED.length} prohibited-copy checks, registry present.`);
}
