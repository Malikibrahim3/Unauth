import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';

/**
 * Bounded, framework-aware dead-code candidate check.
 *
 * App Router files, tests, package-script entrypoints, configuration, and the
 * Chrome extension are roots. Static local imports are followed across TS/JS,
 * CSS, JSON, and extension files. A result is a candidate report, never an
 * automatic deletion instruction: dynamic imports, runtime file reads, route
 * ownership, and provider/CI references still require human proof.
 */
const root = resolve(process.cwd());
const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.json'];
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
const trackedSet = new Set(tracked);
const files = new Map(tracked.map((file) => [file, resolve(root, file)]));

const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const roots = new Set([
  'next.config.js',
  'proxy.ts',
  'instrumentation-client.ts',
  'instrumentation.ts',
  'jest.config.ts',
  'playwright.config.ts',
  'tests/playwright.config.ts',
  'eslint.config.mjs',
]);

function addIfTracked(file) {
  const normalized = file.replaceAll('\\', '/');
  if (trackedSet.has(normalized)) roots.add(normalized);
}

for (const script of Object.values(packageJson.scripts ?? {})) {
  for (const match of String(script).matchAll(/(?:^|\s)([\w./-]+\.(?:ts|tsx|js|jsx|mjs|cjs))(?:\s|$)/g)) addIfTracked(match[1]);
}

function collect(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (/^(page|route|layout|template|error|loading|not-found|global-error)\.(?:ts|tsx|js|jsx)$/.test(entry.name)) addIfTracked(relative(root, full));
  }
}
collect(resolve(root, 'app'));
for (const file of tracked) {
  if (/^tests\/.*\.(?:ts|tsx|js|jsx)$/.test(file)) roots.add(file);
  if (/^extensions\/chrome\/src\/.*\.(?:ts|tsx|js|jsx)$/.test(file)) roots.add(file);
}

function resolveImport(importer, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;
  const base = specifier.startsWith('@/')
    ? resolve(root, specifier.slice(2))
    : resolve(dirname(resolve(root, importer)), specifier);
  const candidates = [base, ...sourceExtensions.map((extension) => `${base}${extension}`), ...sourceExtensions.map((extension) => join(base, `index${extension}`))];
  return candidates.find((candidate) => trackedSet.has(relative(root, candidate)))
    ? relative(root, candidates.find((candidate) => trackedSet.has(relative(root, candidate))))
    : null;
}

const reachable = new Set();
const queue = [...roots].filter((file) => trackedSet.has(file));
while (queue.length) {
  const file = queue.shift();
  if (reachable.has(file)) continue;
  reachable.add(file);
  const absolute = files.get(file);
  if (!absolute || !existsSync(absolute) || statSync(absolute).size > 2_000_000) continue;
  const source = readFileSync(absolute, 'utf8');
  const specifiers = new Set();
  for (const match of source.matchAll(/(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g)) specifiers.add(match[1]);
  for (const match of source.matchAll(/(?:import|require)\(?(?:\s*)['"]([^'"]+)['"]/g)) specifiers.add(match[1]);
  for (const match of source.matchAll(/@import\s+(?:url\()?['"]?([^'";)]+)['"]?\)?/g)) specifiers.add(match[1]);
  for (const specifier of specifiers) {
    const resolved = resolveImport(file, specifier);
    if (resolved && !reachable.has(resolved)) queue.push(resolved);
  }
}

const candidateRoots = ['app', 'components', 'lib', 'styles', 'extensions/chrome/src'];
const candidates = tracked
  .filter((file) => candidateRoots.some((prefix) => file.startsWith(`${prefix}/`)))
  .filter((file) => sourceExtensions.includes(extname(file)))
  .filter((file) => !reachable.has(file))
  .sort();

const report = {
  roots: [...roots].sort(),
  reachable: reachable.size,
  candidates,
  checkedAt: 'deterministic-source-graph',
};
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes('--strict') && candidates.length) {
  console.error(`Dead-code candidate check found ${candidates.length} unproven path(s). Review before deleting; dynamic/runtime ownership may make them live.`);
  process.exit(1);
}
console.error(`Dead-code candidate check: ${candidates.length} candidate path(s); report-only by default.`);
