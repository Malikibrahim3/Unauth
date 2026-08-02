import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';
import {
  LIVING_PRECISION_ROUTES as DECISION_LEDGER_ROUTES,
} from './living-precision/manifest.mjs';

const root = process.cwd();
const failures = [];
const passes = [];

function pass(message) {
  passes.push(message);
  console.log('PASS ' + message);
}

function fail(message) {
  failures.push(message);
  console.error('FAIL ' + message);
}

function expect(condition, message) {
  if (condition) pass(message);
  else fail(message);
}

function routeFromPageFile(file) {
  const segments = file
    .replace(/^app\//, '')
    .replace(/(?:^|\/)page\.tsx$/, '')
    .split('/')
    .filter(
      (segment) =>
        segment && !(segment.startsWith('(') && segment.endsWith(')')),
    );
  return segments.length ? '/' + segments.join('/') : '/';
}

const expectedIds = Array.from(
  { length: 65 },
  (_, index) => 'R' + String(index + 1).padStart(2, '0'),
);
expect(DECISION_LEDGER_ROUTES.length === 65, 'route manifest has 65 entries');
expect(
  DECISION_LEDGER_ROUTES.every(
    (route, index) => route.id === expectedIds[index],
  ),
  'R01–R65 identifiers are complete and ordered',
);
expect(
  new Set(DECISION_LEDGER_ROUTES.map((route) => route.file)).size === 65,
  'route page modules are unique',
);

const actualPageFiles = globSync('app/**/page.tsx', {
  cwd: root,
  nodir: true,
}).sort();
const manifestPageFiles = DECISION_LEDGER_ROUTES.map((route) =>
  route.file,
).sort();
const missingFromManifest = actualPageFiles.filter(
  (file) => !manifestPageFiles.includes(file),
);
const missingFromDisk = manifestPageFiles.filter(
  (file) => !actualPageFiles.includes(file),
);
expect(
  missingFromManifest.length === 0 && missingFromDisk.length === 0,
  'route manifest matches every page module' +
    (missingFromManifest.length
      ? '; unowned: ' + missingFromManifest.join(', ')
      : '') +
    (missingFromDisk.length ? '; missing: ' + missingFromDisk.join(', ') : ''),
);
expect(
  DECISION_LEDGER_ROUTES.every(
    (entry) => routeFromPageFile(entry.file) === entry.route,
  ),
  'manifest route patterns match App Router paths',
);
expect(
  DECISION_LEDGER_ROUTES.some(
    (entry) =>
      entry.route === '/landing/prototypes/unauth-case-detail' &&
      entry.classification === 'development' &&
      entry.family === 'archived-research',
  ),
  'prototype lab is classified as archived development research',
);

const authorityNeedle =
  'IMPL_decision_ledger_instrument_grade_final_iteration.md';
const authorityFiles = [
  '.codex/rules/authenticated-product.md',
  '.cursor/rules/authenticated-design-system.mdc',
  'CLAUDE.md',
  'styles/authenticated/README.md',
];
for (const file of authorityFiles) {
  const content = readFileSync(path.join(root, file), 'utf8');
  expect(
    content.includes(authorityNeedle),
    file + ' points to the Instrument Grade authority for its remaining (non-.ua-app) surfaces',
  );
  expect(
    content.includes('IG-00') && content.includes('IG-16'),
    file + ' names the full IG-00–IG-16 programme',
  );
}

const implementation = readFileSync(
  path.join(root, 'docs', authorityNeedle),
  'utf8',
);
expect(
  implementation.includes('## 16. Definition of done') &&
    implementation.includes('Decision Ledger — Instrument Grade'),
  'implementation authority contains the direction and definition of done',
);
expect(
  implementation.includes('IMPL_authenticated_execution_ledger.md'),
  'Instrument Grade authority records its own .ua-app supersession',
);

// M9: .ua-app authority converged onto the authenticated execution ledger —
// docs/IMPL_authenticated_execution_ledger.md §1.5/§4/M9.
const uaAppAuthorityNeedle = 'IMPL_authenticated_execution_ledger.md';
for (const file of authorityFiles) {
  const content = readFileSync(path.join(root, file), 'utf8');
  expect(
    content.includes(uaAppAuthorityNeedle),
    file + ' points .ua-app surfaces at the authenticated execution ledger',
  );
  expect(
    content.includes('20px/600'),
    file + ' records the .ua-app type-ramp resolution (20px/600, not 28px/650)',
  );
}

const authenticatedLedger = readFileSync(
  path.join(root, 'docs', uaAppAuthorityNeedle),
  'utf8',
);
expect(
  authenticatedLedger.includes('## §8 Verification') &&
    authenticatedLedger.includes('verify-visual-adoption.mjs'),
  'authenticated execution ledger names its own verifier',
);

const packageJson = JSON.parse(
  readFileSync(path.join(root, 'package.json'), 'utf8'),
);
const requiredCommands = [
  'verify:decision-ledger',
  'test:decision-ledger:components',
  'test:decision-ledger:a11y',
  'capture:decision-ledger',
  'capture:decision-ledger:verify',
];
expect(
  requiredCommands.every(
    (command) => typeof packageJson.scripts?.[command] === 'string',
  ),
  'all final visual-system commands are exposed',
);
expect(
  !packageJson.scripts?.['verify:apple-quality'] &&
    !packageJson.scripts?.['verify:living-precision'],
  'retired verification commands are not exposed',
);

const activeFiles = globSync(
  '{app,components,lib,styles}/**/*.{ts,tsx,css,md}',
  { cwd: root, nodir: true },
);
const forbidden = [
  'data-ui-version="apple-quality-desktop"',
  'AUTH_UI_ROLLOUT_COOKIE',
  'resolveAuthUiRollout',
  'AuthUiCohortTelemetry',
];
for (const needle of forbidden) {
  const offenders = activeFiles.filter((file) =>
    readFileSync(path.join(root, file), 'utf8').includes(needle),
  );
  expect(
    offenders.length === 0,
    'active source has no ' + needle +
      (offenders.length ? ': ' + offenders.join(', ') : ''),
  );
}

expect(
  existsSync(path.join(root, 'extensions/unauth-checkout/src/index.jsx')) &&
    readFileSync(
      path.join(root, 'extensions/unauth-checkout/src/index.jsx'),
      'utf8',
    ).includes('return null'),
  'Shopify checkout remains an explicit zero-UI contract',
);

for (const command of [
  ['scripts/visual-rebuild/check-coverage-ledger.mjs'],
  ['scripts/check-authenticated-design.mjs'],
]) {
  const result = spawnSync(process.execPath, command, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  });
  expect(result.status === 0, command[0] + ' passes');
}

console.log(
  JSON.stringify(
    {
      status: failures.length ? 'blocked' : 'ready',
      passedChecks: passes.length,
      failedChecks: failures.length,
      failures,
    },
    null,
    2,
  ),
);

process.exitCode = failures.length ? 1 : 0;
