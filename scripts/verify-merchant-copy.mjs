import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

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

// P12-C02 reviewed exceptions: exact text in exact source bytes only. Any edit
// invalidates the exception and requires a new reachable-consumer review.
// Evidence: artifacts/merchant-clarity-implementation/2026-09-07-autonomous-closure/P12/copy-dispositions.json
export const COPY_EXCEPTIONS = [
  {
    "file": "components/dashboard/ExactDashboardOverview.tsx",
    "sha256": "880274190535d3d41a88882d4664f1b5e631c050ca65cce3c5906c21e35c842f",
    "texts": [
      "minor units · GBP"
    ],
    "reason": "Reference lookup key only; output is Amounts and selected currency."
  },
  {
    "file": "components/imports/ImportsVisualClient.tsx",
    "sha256": "b484745cf509287be16f7f26dc922c319dd70494bc639220392f5e943cbc0d6f",
    "texts": [
      "Gross amount (minor units)",
      "Amount (minor units)",
      "Amounts use integer minor units"
    ],
    "reason": "CSV total_minor/amount_minor schema instructions, not major-unit form inputs."
  },
  {
    "file": "components/visual-authority/generated/Command-Palette-Clean.tsx",
    "sha256": "2d0710625d28070409edd99bf46a441276a14b110b5088cf4d0abaa435837556",
    "texts": [
      "Open the customer’s claim history"
    ],
    "reason": "bindPaletteNode replaces every result cell using live API results."
  },
  {
    "file": "components/visual-authority/generated/Customer-Detail-Clean.tsx",
    "sha256": "732719a57670355f5e2e8c061b4efab3d0904e24ea949f36a49a749cfed303e2",
    "texts": [
      "CLAIM HISTORY"
    ],
    "reason": "Reference body not mounted; route renders CustomerProfilePageView."
  },
  {
    "file": "components/visual-authority/generated/Evidence-Package-Clean.tsx",
    "sha256": "e05e2e9663195661e80eeb41515150b18f1e81594d21f7432159cba8bab3c309",
    "texts": [
      "Prior claim history on this account",
      "Prior claim history is held, and deliberately left out"
    ],
    "reason": "Reference body not mounted; route renders EvidencePackageForm."
  },
  {
    "file": "components/visual-authority/generated/Overview-Clean.tsx",
    "sha256": "1f5e9d8f8db96f5d4f6b62bf32cc4322a580617d09494c111c91a1e6eb26b72b",
    "texts": [
      "minor units · GBP"
    ],
    "reason": "Reference label replaced by ExactDashboardOverview runtime binding."
  },
  {
    "file": "components/visual-authority/generated/Source-Repair-Clean.tsx",
    "sha256": "dad4bd76c83db241e1ff3d8a46bd3459be965c761ce2c8bd455d5e57aeb53a68",
    "texts": [
      "Dry-run the last 72 hours first"
    ],
    "reason": "Reference overlay discarded by sourceParts; only command-palette extras can mount."
  }
];

export function scanSource(file, rawSource) {
  const hash = createHash('sha256').update(rawSource).digest('hex');
  const exception = COPY_EXCEPTIONS.find((entry) => entry.file === file && entry.sha256 === hash);
  let source = stripComments(rawSource);
  if (exception) {
    for (const text of exception.texts) source = source.replaceAll(text, ' '.repeat(text.length));
  }
  const violations = [];
  source.split('\n').forEach((line, index) => {
    for (const [name, pattern] of PROHIBITED) {
      for (const match of line.matchAll(new RegExp(pattern.source, 'gi'))) {
        const start = Math.max(0, match.index - 80);
        const end = Math.min(line.length, match.index + match[0].length + 120);
        const excerpt = `${start ? '…' : ''}${line.slice(start, end).trim()}${end < line.length ? '…' : ''}`;
        violations.push(`${file}:${index + 1} ${name}: ${excerpt}`);
      }
    }
  });
  return violations;
}

function main() {
const files = [...new Set(TARGETS.flatMap(filesUnder))].sort();
const violations = files.flatMap((file) => scanSource(relative(ROOT, file), readFileSync(file, 'utf8')));
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

}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
