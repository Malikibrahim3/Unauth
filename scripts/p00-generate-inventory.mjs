import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const root = resolve(process.cwd());
const p00 = join(root, 'docs/unauth/implementation/p00');
const sha = (value) => createHash('sha256').update(value).digest('hex');
const read = (path) => readFileSync(path);
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const slash = (path) => path.split(sep).join('/');

function walk(directory, accept, output = []) {
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    if (['.git', 'node_modules', '.next', '.next-living-precision-dev'].includes(name)) continue;
    const stats = statSync(path);
    if (stats.isDirectory()) walk(path, accept, output);
    else if (accept(path)) output.push(path);
  }
  return output;
}

function routePath(file, prefix) {
  const rel = slash(relative(join(root, prefix), file));
  const pieces = rel.split('/').slice(0, -1).filter((part) => !/^\(.+\)$/.test(part));
  return '/' + pieces.map((part) => part.replace(/^\[\.\.\.(.+)\]$/, ':$1*').replace(/^\[(.+)\]$/, ':$1')).join('/');
}

const appFiles = walk(join(root, 'app'), (path) => /\/(page|route|loading|error|not-found|layout|global-error)\.tsx?$/.test(path));
const pages = appFiles.filter((path) => /\/page\.tsx$/.test(path));
const handlers = appFiles.filter((path) => /\/route\.ts$/.test(path));
const boundaryByRoute = new Map();
for (const file of appFiles.filter((path) => /\/(loading|error|not-found)\.tsx$/.test(path))) {
  const route = routePath(file, 'app');
  const kind = file.match(/\/(loading|error|not-found)\.tsx$/)[1];
  boundaryByRoute.set(route, [...(boundaryByRoute.get(route) ?? []), kind].sort());
}
const routeRows = pages.map((file) => {
  const route = routePath(file, 'app');
  return { kind: 'page', route, source: slash(relative(root, file)), states_present: boundaryByRoute.get(route) ?? [] };
});
for (const file of handlers) routeRows.push({ kind: 'api', route: routePath(file, 'app'), source: slash(relative(root, file)), methods: [...read(file).toString().matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/g)].map((m) => m[1]) });
routeRows.sort((a, b) => a.route.localeCompare(b.route) || a.kind.localeCompare(b.kind));
writeFileSync(join(p00, 'routes.json'), JSON.stringify({ generated_at: '2026-08-03T00:00:00+01:00', generator: 'scripts/p00-generate-inventory.mjs', pages: routeRows.filter((row) => row.kind === 'page').length, api_handlers: routeRows.filter((row) => row.kind === 'api').length, rows: routeRows }, null, 2) + '\n');

const phasePrefixes = [
  'docs/unauth/implementation/spec-lock.yaml',
  'docs/unauth/implementation/p00/',
  'docs/unauth/implementation/adrs/',
  'docs/unauth/implementation/evidence/P00/',
  'docs/unauth/implementation/certificates/P00.yaml',
  'lib/p00/', 'tests/p00/', 'scripts/p00-generate-inventory.mjs',
];
const statusRows = git('status', '--porcelain=v1', '--untracked-files=all').split('\n').filter(Boolean).filter((row) => !phasePrefixes.some((prefix) => row.slice(3).startsWith(prefix)));
const baseRows = statusRows.map((row) => {
  const path = row.slice(3);
  const absolute = join(root, path);
  return { status: row.slice(0, 2), path, sha256: existsSync(absolute) && statSync(absolute).isFile() ? sha(read(absolute)) : 'NON_FILE_OR_DELETED' };
});
const observed = {
  evidence_class: 'OBSERVED_BASE',
  base_revision: git('rev-parse', 'HEAD').trim(),
  tracked_index_sha256: sha(git('ls-files', '-s')),
  pre_existing_dirty_rows: baseRows,
  pre_existing_dirty_manifest_sha256: sha(JSON.stringify(baseRows)),
  note: 'Rows exclude only artifacts created by this P00 rerun; the controlling v1.1 specification remains part of the observed base.',
};
writeFileSync(join(p00, 'observed-base-manifest.json'), JSON.stringify(observed, null, 2) + '\n');
