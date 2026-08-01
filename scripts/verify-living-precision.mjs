import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';
import sharp from 'sharp';
import {
  LIVING_PRECISION_ROUTES,
  ROUTE_COUNTS,
} from './living-precision/manifest.mjs';
import { LIVING_PRECISION_ENVIRONMENT } from './living-precision/environment.mjs';
import { buildMarketingFixture } from './marketing-seed/fixture.mjs';
import { MARKETING_STORY } from './marketing-seed/manifest.mjs';

const root = process.cwd();
const failures = [];
const passes = [];

function pass(message) {
  passes.push(message);
  console.log(`PASS ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`FAIL ${message}`);
}

function expect(condition, message) {
  if (condition) pass(message);
  else fail(message);
}

function unique(values) {
  return new Set(values).size === values.length;
}

function routeFromPageFile(file) {
  const segments = file
    .replace(/^app\//, '')
    .replace(/(?:^|\/)page\.tsx$/, '')
    .split('/')
    .filter((segment) => segment && !(segment.startsWith('(') && segment.endsWith(')')));
  return segments.length ? `/${segments.join('/')}` : '/';
}

const expectedIds = Array.from({ length: 64 }, (_, index) => `R${String(index + 1).padStart(2, '0')}`);
expect(LIVING_PRECISION_ROUTES.length === 64, 'R01–R64 manifest has 64 entries');
expect(
  LIVING_PRECISION_ROUTES.every((route, index) => route.id === expectedIds[index]),
  'R01–R64 identifiers are complete and ordered',
);
expect(unique(LIVING_PRECISION_ROUTES.map((route) => route.id)), 'route identifiers are unique');
expect(unique(LIVING_PRECISION_ROUTES.map((route) => route.route)), 'route patterns are unique');
expect(unique(LIVING_PRECISION_ROUTES.map((route) => route.file)), 'route page modules are unique');
expect(
  ROUTE_COUNTS.production === 58 && ROUTE_COUNTS.development === 2 && ROUTE_COUNTS.redirect === 4,
  'route classes are 58 production, 2 development, and 4 redirects',
);

const actualPageFiles = globSync('app/**/page.tsx', {
  cwd: root,
  nodir: true,
}).sort();
const manifestPageFiles = LIVING_PRECISION_ROUTES.map((route) => route.file).sort();
const missingFromManifest = actualPageFiles.filter((file) => !manifestPageFiles.includes(file));
const missingFromDisk = manifestPageFiles.filter((file) => !actualPageFiles.includes(file));
expect(
  missingFromManifest.length === 0 && missingFromDisk.length === 0,
  `route inventory matches every page module${missingFromManifest.length ? `; unowned: ${missingFromManifest.join(', ')}` : ''}${missingFromDisk.length ? `; missing: ${missingFromDisk.join(', ')}` : ''}`,
);
expect(
  LIVING_PRECISION_ROUTES.every((entry) => routeFromPageFile(entry.file) === entry.route),
  'manifest route patterns match App Router paths',
);
expect(
  LIVING_PRECISION_ROUTES
    .filter((entry) => entry.classification !== 'redirect')
    .every((entry) => entry.capturePath && !entry.capturePath.includes('[')),
  'every renderable route resolves to a concrete capture path',
);

const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const requiredCommands = [
  'verify:living-precision',
  'test:living-precision:components',
  'test:living-precision:a11y',
  'capture:living-precision',
  'capture:living-precision:verify',
];
expect(
  requiredCommands.every((command) => typeof packageJson.scripts?.[command] === 'string'),
  'all five named Phase 28 commands are exposed',
);
const packagePlaywrightVersion = packageJson.devDependencies?.['@playwright/test']?.replace(/^[^\d]*/, '');
expect(
  packagePlaywrightVersion === LIVING_PRECISION_ENVIRONMENT.playwrightVersion,
  'Playwright package and recorded container image versions match',
);
const captureDockerfile = readFileSync(
  path.join(root, 'scripts/living-precision/Dockerfile'),
  'utf8',
);
expect(
  captureDockerfile.includes(
    `${LIVING_PRECISION_ENVIRONMENT.container.image}@${LIVING_PRECISION_ENVIRONMENT.container.manifestDigest}`,
  ),
  'release Dockerfile pins the recorded Playwright image by digest',
);

const fixture = buildMarketingFixture(LIVING_PRECISION_ENVIRONMENT.clock);
const fixtureIds = new Set(
  Object.values(fixture.tables).flatMap((rows) => rows.map((row) => row.id).filter(Boolean)),
);
expect(
  [
    MARKETING_STORY.capture.caseDecisionReady,
    MARKETING_STORY.capture.customer,
    MARKETING_STORY.capture.recovery,
    MARKETING_STORY.capture.loss,
    MARKETING_STORY.capture.rule,
    MARKETING_STORY.capture.flow,
    MARKETING_STORY.capture.flowRun,
    MARKETING_STORY.capture.connection,
    MARKETING_STORY.capture.workView,
    MARKETING_STORY.capture.order,
    MARKETING_STORY.capture.ticket,
    MARKETING_STORY.capture.shipment,
    MARKETING_STORY.capture.dispute,
    MARKETING_STORY.capture.refund,
    MARKETING_STORY.capture.return,
    MARKETING_STORY.capture.shipbobSelection,
  ].every((id) => fixtureIds.has(id)),
  'all dynamic capture paths resolve to deterministic populated records',
);
expect(
  fixture.tables.merchants.some((merchant) =>
    merchant.id === MARKETING_STORY.onboarding.merchant.id
    && merchant.settings?.setup_complete === false),
  'onboarding capture uses a deterministic incomplete workspace',
);
expect(
  fixture.tables.pending_provider_account_selections.some((selection) =>
    selection.id === MARKETING_STORY.capture.shipbobSelection
    && selection.accounts.length >= 2),
  'ShipBob capture uses a populated deterministic selection handoff',
);
expect(
  fixture.tables.workflow_definitions.every((flow) =>
    ['eq', 'neq', 'in', 'exists'].includes(flow.conditions[0]?.operator)
    && ['create_task', 'request_evidence', 'set_deadline', 'request_notification']
      .includes(flow.outputs[0]?.type)),
  'workflow fixtures use the production editor condition and action schema',
);
expect(
  (JSON.stringify(fixture).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])
    .every((email) => email.toLowerCase().endsWith('.invalid')),
  'fixture email identities use only the non-routable .invalid namespace',
);

const authorityFiles = [
  '.codex/rules/authenticated-product.md',
  '.cursor/rules/authenticated-design-system.mdc',
  'CLAUDE.md',
  'styles/authenticated/README.md',
];
for (const authorityFile of authorityFiles) {
  const content = readFileSync(path.join(root, authorityFile), 'utf8');
  expect(
    /Living Precision/i.test(content),
    `${authorityFile} names Living Precision as active authority`,
  );
}

const retiredFiles = [
  'public/hero-artifact.html',
  'public/hero-artifact-stack.html',
  'components/charts/authenticated/ChartPanel.tsx',
  'hooks/useReducedMotion.ts',
];
expect(
  retiredFiles.every((file) => !existsSync(path.join(root, file))),
  'retired fake artwork and superseded primitives are absent',
);

const designGuard = spawnSync(process.execPath, ['scripts/check-authenticated-design.mjs'], {
  cwd: root,
  stdio: 'inherit',
  shell: false,
});
expect(designGuard.status === 0, 'authenticated design and zero legacy ratchets pass');

const proofSlots = [
  ['public/product-proof/case-evidence.webp', 1520, 950],
  ['public/product-proof/case-recommendation.webp', 1240, 776],
];
for (const [file, width, height] of proofSlots) {
  if (!existsSync(path.join(root, file))) {
    fail(`${file} exists`);
    continue;
  }
  const metadata = await sharp(path.join(root, file)).metadata();
  expect(
    metadata.format === 'webp' && metadata.width === width && metadata.height === height,
    `${file} is an exact ${width}×${height} WebP slot`,
  );
}

console.log(JSON.stringify({
  status: failures.length ? 'blocked' : 'ready',
  passedChecks: passes.length,
  failedChecks: failures.length,
  failures,
}, null, 2));

process.exitCode = failures.length ? 1 : 0;
