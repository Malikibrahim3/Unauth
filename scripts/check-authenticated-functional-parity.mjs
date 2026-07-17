import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';

const ROOTS = ['app/(app)/', 'components/'];
const EXTENSIONS = ['.ts', '.tsx'];

function inScope(file) {
  return ROOTS.some((root) => file.startsWith(root)) && EXTENSIONS.some((extension) => file.endsWith(extension));
}

function normaliseSignature(value) {
  return value
    .replace(/\$\{[^}]+\}/g, '${value}')
    .replace(/\\n/g, ' ')
    .trim();
}

function extractNavigation(source) {
  const signatures = new Set();
  const expression = /["'`]((?:\/|https?:\/\/|mailto:)[^"'`\s]*)["'`]/g;
  let match;
  while ((match = expression.exec(source))) signatures.add(normaliseSignature(match[1]));
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
]);

const missingNavigation = [...baselineNavigation].filter(
  (signature) => !currentNavigation.has(signature) && !documentedReplacements.has(signature),
);

const baselineInteractions = interactionCounts(baselineSource);
const currentInteractions = interactionCounts(currentSource);
const missingInteractions = Object.entries(baselineInteractions)
  .filter(([token, count]) => currentInteractions[token] < count)
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
