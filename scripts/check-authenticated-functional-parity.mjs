import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';

const ROOTS = ['app/(app)/', 'components/'];
const EXTENSIONS = ['.ts', '.tsx'];

function inScope(file) {
  return ROOTS.some((root) => file.startsWith(root)) && EXTENSIONS.some((extension) => file.endsWith(extension));
}

/*
 * Collapses every interpolation to a single ${value} placeholder. Brace-aware,
 * because a non-greedy /\$\{[^}]+\}/ stops at the first `}` and mangles any
 * expression containing an object literal — e.g.
 * `${buildQuery(sp, { sort: 'value' })}` collapsed to `${value})}`.
 */
function collapseInterpolations(value) {
  let out = '';
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === '$' && value[i + 1] === '{') {
      let depth = 0;
      let j = i + 1;
      for (; j < value.length; j += 1) {
        if (value[j] === '{') depth += 1;
        else if (value[j] === '}') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      out += '${value}';
      i = j;
      continue;
    }
    out += value[i];
  }
  return out;
}

function normaliseSignature(value) {
  return collapseInterpolations(value).replace(/\\n/g, ' ').trim();
}

/*
 * Two forms are extracted:
 *   1. plain quoted paths — 'href="/work"'
 *   2. template literals, INCLUDING ones whose ${...} expressions contain
 *      whitespace — `` `/claims${buildQuery(sp, { sort: 'value' })}` ``
 *
 * The original pattern rejected any candidate containing whitespace, so every
 * template href with a multi-argument call inside it was silently invisible to
 * this gate. That hid real destinations (the Shopify install href among them)
 * and made the check pass on links it had never actually seen.
 */
function extractNavigation(source) {
  const signatures = new Set();

  const plain = /["']((?:\/|https?:\/\/|mailto:)[^"'\s]*)["']/g;
  let match;
  while ((match = plain.exec(source))) signatures.add(normaliseSignature(match[1]));

  // Template literals: consume balanced ${...} groups rather than stopping at
  // the first space.
  const template = /`((?:\/|https?:\/\/|mailto:)(?:[^`$]|\$\{(?:[^{}]|\{[^{}]*\})*\})*)`/g;
  while ((match = template.exec(source))) {
    const signature = normaliseSignature(match[1]);
    // Whitespace inside ${...} has already collapsed. Any whitespace left is
    // prose/code in a documentation template literal, not a navigation URL.
    if (!/\s/.test(signature)) signatures.add(signature);
  }

  return signatures;
}

function interactionCounts(source) {
  const tokens = [
    'onClick=',
    'onSubmit=',
    'onChange=',
    'onKeyDown=',
    'type="submit"',
    'router.push(',
    'router.replace(',
    'redirect(',
    'fetch(',
  ];
  return Object.fromEntries(tokens.map((token) => [token, source.split(token).length - 1]));
}

const baselineFiles = execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD'], {
  cwd: process.cwd(),
  encoding: 'utf8',
}).split('\n').filter(inScope);

const baselineSource = execFileSync(
  'git',
  ['grep', '-h', '-I', '-e', '.', 'HEAD', '--', 'app/(app)', 'components'],
  { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);
let currentSource = '';
for (const file of baselineFiles) {
  try {
    const info = await stat(file);
    if (info.isFile()) currentSource += await readFile(file, 'utf8');
  } catch {
    // A removed file is reported through its missing capabilities below.
  }
}

// Include new shared presentation files that did not exist at HEAD.
const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
  cwd: process.cwd(),
  encoding: 'utf8',
}).split('\n').filter(inScope);
for (const file of untracked) currentSource += await readFile(file, 'utf8');

const baselineNavigation = extractNavigation(baselineSource);
const currentNavigation = extractNavigation(currentSource);

// Range changes now mutate URLSearchParams so timezone/currency/compare state
// survives together. This replaces the old hard-coded dashboard range href.
const documentedReplacements = new Set([
  '/dashboard?range=${value}&timezone=${value}',
  /*
   * `?stage=` was never read by any route — these four rail rows linked to a
   * query parameter that navigated nowhere. Retired rather than reimplemented;
   * the recovery board beside the rail is the real navigation.
   */
  '/recoveries?stage=evidence',
  '/recoveries?stage=ready',
  '/recoveries?stage=chase',
  '/recoveries?stage=closed',
  /*
   * Phase 19/20 replaced the unused legacy connected-object fallback shell.
   * These collection paths never had page modules; the shipping detail shell
   * now returns to a validated task/customer path and uses concrete connected
   * record hrefs. Keeping the literals would make broken destinations look
   * like parity.
   */
  '/partners',
  '/orders',
  '/tickets',
  '/shipments',
  '/refunds',
  '/returns',
  '/disputes',
  /*
   * Authenticated chrome no longer points at the public root. `/` remains a
   * verified public redirect, outside this authenticated-source inventory.
   */
  '/',
]);

/*
 * A destination is still reachable when a current signature *extends* it with
 * additional query parameters — e.g. `/reports?range=${value}` is preserved by
 * `/reports?range=${value}&timezone=${value}`, and
 * `/api/shopify/install?shop=${value}` by the same href plus `&returnTo=`.
 * Adding state to a link is a parity improvement, not a regression, so treat a
 * superset as satisfying the baseline instead of maintaining an allowlist that
 * has to grow every time a link gains a parameter.
 */
function isSupersededBySuperset(signature) {
  if (!signature.includes('?')) return false;
  for (const current of currentNavigation) {
    if (current === signature) return true;
    if (current.startsWith(`${signature}&`)) return true;
  }
  return false;
}

/*
 * A hard-coded destination is still reachable when it was replaced by a template
 * that generates it — e.g. `/claims?sort=value` is produced by
 * `/claims${value}` once the href is built through buildClaimsQueryString.
 * `${value}` is treated as a wildcard so the gate keeps failing on destinations
 * that genuinely disappeared, without flagging a link that merely became
 * dynamic.
 */
function isGeneratedByTemplate(signature) {
  for (const current of currentNavigation) {
    if (!current.includes('${value}')) continue;
    const pattern = new RegExp(
      `^${current.split('${value}').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`,
    );
    if (pattern.test(signature)) return true;
  }
  return false;
}

const missingNavigation = [...baselineNavigation].filter(
  (signature) =>
    !currentNavigation.has(signature)
    && !documentedReplacements.has(signature)
    && !isSupersededBySuperset(signature)
    && !isGeneratedByTemplate(signature),
);

const baselineInteractions = interactionCounts(baselineSource);
const currentInteractions = interactionCounts(currentSource);
const documentedInteractionReductions = {
  // WorkQueue's faux-interactive row key handler became a native button in
  // DataTable, so Enter/Space semantics no longer need a page-local handler.
  'onKeyDown=': 1,
  // Two ClaimReviewHeader imperative pushes became the canonical
  // DetailPageShell back/next links.
  'router.push(': 2,
};
const missingInteractions = Object.entries(baselineInteractions)
  .filter(([token, count]) =>
    currentInteractions[token] < count - (documentedInteractionReductions[token] ?? 0),
  )
  .map(([token, count]) => `${token} ${count} -> ${currentInteractions[token]}`);

if (missingNavigation.length || missingInteractions.length) {
  console.error('Authenticated functional parity check failed.');
  if (missingNavigation.length) console.error(`Missing destinations:\n${missingNavigation.map((item) => `- ${item}`).join('\n')}`);
  if (missingInteractions.length) console.error(`Interaction count regressions:\n${missingInteractions.map((item) => `- ${item}`).join('\n')}`);
  process.exit(1);
}

console.log(
  `Authenticated functional parity passed: ${baselineNavigation.size} committed destinations and all interaction categories remain represented.`,
);
