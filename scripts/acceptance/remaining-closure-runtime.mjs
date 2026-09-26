import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  ACCEPTANCE_ROOT,
  assertLoopbackUrl,
  fileSha256,
  fingerprint,
  isLoopbackHostname,
  localSupabaseEnvironment,
  stableJson,
} from './local-runtime.mjs';

/**
 * This root is intentionally separate from the immutable 30 August evidence.
 * It is ignored by Git and contains no credentials, session state, or raw key
 * material.  The parent root remains a historical input only.
 */
const requestedRoot = process.env.UNAUTH_REMAINING_CLOSURE_ROOT?.trim();
if (requestedRoot && !/^artifacts\/merchant-clarity-implementation\/2026-09-09-ui-forensics-01\/P12\/ui-forensics\/continuations\/[0-9TZ-]+\/remaining-fixture$/.test(requestedRoot)) throw new Error('Select a dated forensic fixture root under the audit continuation directory.');
export const REMAINING_CLOSURE_ROOT = requestedRoot || 'artifacts/full-app-acceptance-remaining-2026-08-31';
export const REMAINING_CLOSURE_FIXTURE = 'full-app-acceptance-remaining-2026-08-31';
export const REMAINING_CLOSURE_SCHEMA_VERSION = 1;

export const REMAINING_SCENARIO_IDS = Object.freeze([
  'pricing-plan-unavailable',
  'api-keys-empty',
  'audit-trail-empty',
  'billing-unavailable',
  'root-not-found',
  'invite-member-and-transfer-ownership-modals',
  'create-reveal-and-revoke-api-key-modals',
  'data-erasure-and-account-deletion-modals',
  'agreement-upload-and-review-overlays',
  'billing-plan-change-modal',
]);

const FIXTURE_KINDS = Object.freeze(['settings', 'privacy', 'workspaceDeletion']);
const BASELINE_HASH_TARGETS = Object.freeze([
  'lib/surfaces/manifest.ts',
  'lib/navigation/appRoutes.ts',
  'lib/navigation/aliases.js',
  'next.config.js',
  'scripts/acceptance/local-runtime.mjs',
  'scripts/acceptance/remaining-closure-runtime.mjs',
  'scripts/acceptance/prepare-remaining-closure.mjs',
  'scripts/acceptance/cleanup-remaining-closure.mjs',
  'package.json',
]);

function rootPath() {
  return path.resolve(process.cwd(), REMAINING_CLOSURE_ROOT);
}

function artifactPath(...segments) {
  const root = rootPath();
  const resolved = path.resolve(root, ...segments);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Refusing artifact path outside the remaining-closure root');
  }
  return resolved;
}

function now() {
  return new Date().toISOString();
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function git(...args) {
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${(result.stderr || result.stdout || 'unknown error').trim()}`);
  }
  return result.stdout.trimEnd();
}

function dataWithoutSecrets(value, key = '') {
  const blocked = /(?:^|_)(?:password|secret|access_token|refresh_token|session|service_role|anon_key|api_key)(?:$|_)/i;
  if (blocked.test(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => dataWithoutSecrets(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, dataWithoutSecrets(entryValue, entryKey)]));
  }
  return value;
}

export function writeRemainingClosureJson(relativePath, value) {
  const target = artifactPath(relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const safeValue = dataWithoutSecrets(value);
  fs.writeFileSync(target, `${JSON.stringify(safeValue, null, 2)}\n`, { mode: 0o600 });
  return target;
}

export function readRemainingClosureJson(relativePath, { required = true } = {}) {
  const target = artifactPath(relativePath);
  if (!fs.existsSync(target)) {
    if (!required) return null;
    throw new Error(`Missing remaining-closure receipt ${relativePath}`);
  }
  return JSON.parse(fs.readFileSync(target, 'utf8'));
}

export function assertRemainingClosureAcknowledgement() {
  if (process.env.RELEASE_E2E_LOCAL !== '1') {
    throw new Error('Set RELEASE_E2E_LOCAL=1 to acknowledge local-only remaining-closure fixtures');
  }
  const vercelEnvironment = String(process.env.VERCEL_ENV ?? '').trim().toLowerCase();
  if (vercelEnvironment === 'preview' || vercelEnvironment === 'production') {
    throw new Error(`Refusing remaining-closure mutation in VERCEL_ENV=${vercelEnvironment}`);
  }
}

/**
 * Script-level environment verification.  The browser/API guard performs the
 * stricter requirement for both configured loopback origins before every
 * acceptance-only route branch.  Preparation may derive its local Supabase
 * endpoint from the CLI, but never contacts a remote endpoint.
 */
export function assertRemainingClosureScriptEnvironment() {
  assertRemainingClosureAcknowledgement();
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredAppUrl) assertLoopbackUrl(configuredAppUrl, 'NEXT_PUBLIC_APP_URL');
  const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (configuredSupabaseUrl) assertLoopbackUrl(configuredSupabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL');
  const local = localSupabaseEnvironment();
  const supabaseUrl = assertLoopbackUrl(local.apiUrl, 'Local Supabase URL');
  return {
    appUrl: configuredAppUrl ?? null,
    supabaseUrl: supabaseUrl.toString().replace(/\/$/, ''),
    serviceRole: local.serviceRole,
    localValues: local.values,
  };
}

export function isLoopbackUrl(value) {
  try {
    const parsed = new URL(value);
    return isLoopbackHostname(parsed.hostname);
  } catch {
    return false;
  }
}

export function captureRemainingClosureBaseline() {
  const status = git('status', '--short');
  const statusLines = status ? status.split(/\r?\n/) : [];
  const fileHashes = Object.fromEntries(BASELINE_HASH_TARGETS.map((target) => {
    const absolute = path.resolve(process.cwd(), target);
    return [target, fs.existsSync(absolute) ? fileSha256(absolute) : null];
  }));
  const baseline = {
    schemaVersion: REMAINING_CLOSURE_SCHEMA_VERSION,
    fixture: REMAINING_CLOSURE_FIXTURE,
    capturedAt: now(),
    parentEvidenceRoot: ACCEPTANCE_ROOT,
    repository: {
      commit: git('rev-parse', 'HEAD'),
      branch: git('branch', '--show-current') || '(detached)',
      statusLines,
      statusFingerprint: fingerprint(statusLines),
      preExistingUntrackedPaths: statusLines
        .filter((line) => line.startsWith('?? '))
        .map((line) => line.slice(3)),
    },
    phaseOwnedFileHashes: fileHashes,
    authorityHashes: {
      manifest: fileHashes['lib/surfaces/manifest.ts'],
      navigation: fingerprint({
        appRoutes: fileHashes['lib/navigation/appRoutes.ts'],
        aliases: fileHashes['lib/navigation/aliases.js'],
        nextConfig: fileHashes['next.config.js'],
      }),
    },
    environment: {
      releaseE2eLocal: process.env.RELEASE_E2E_LOCAL === '1',
      configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL && isLoopbackUrl(process.env.NEXT_PUBLIC_APP_URL)
        ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
        : null,
      configuredSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL && isLoopbackUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
        ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
        : null,
      vercelEnv: process.env.VERCEL_ENV ?? null,
    },
  };
  return baseline;
}

function fixtureEmail(kind, runId, label) {
  return `${REMAINING_CLOSURE_FIXTURE}.${kind}.${label}.${runId}@example.invalid`.toLowerCase();
}

function fixtureMarker(kind, runId) {
  return {
    fixture: REMAINING_CLOSURE_FIXTURE,
    kind,
    runId,
    localOnly: true,
  };
}

export function createRemainingFixturePlan() {
  const runId = randomUUID();
  const runLabel = runId.slice(0, 8);
  const plan = {
    schemaVersion: REMAINING_CLOSURE_SCHEMA_VERSION,
    fixture: REMAINING_CLOSURE_FIXTURE,
    runId,
    createdAt: now(),
    state: 'planned',
    allowedScenarioIds: REMAINING_SCENARIO_IDS,
    fixtures: {
      settings: {
        kind: 'settings',
        merchantId: randomUUID(),
        marker: fixtureMarker('settings', runId),
        name: `Remaining closure Settings ${runLabel}`,
        owner: { email: fixtureEmail('settings', runId, 'owner') },
        secondMember: { email: fixtureEmail('settings', runId, 'member') },
        subscription: { planId: 'scale', status: 'active', currentPlanOnly: true },
      },
      privacy: {
        kind: 'privacy',
        merchantId: randomUUID(),
        marker: fixtureMarker('privacy', runId),
        name: `Remaining closure Privacy ${runLabel}`,
        owner: { email: fixtureEmail('privacy', runId, 'owner') },
        subjectId: randomUUID(),
        sourceCustomerId: randomUUID(),
        sourceOrderId: randomUUID(),
        caseId: randomUUID(),
        financialEntryId: randomUUID(),
        domainEventId: randomUUID(),
      },
      workspaceDeletion: {
        kind: 'workspaceDeletion',
        merchantId: randomUUID(),
        marker: fixtureMarker('workspaceDeletion', runId),
        name: `Remaining closure Workspace deletion ${runLabel}`,
        owner: { email: fixtureEmail('workspaceDeletion', runId, 'owner') },
      },
    },
    cleanup: {
      strategy: 'exact-id-and-marker-only',
      storageObjectRegistry: 'mutation-state.json',
      authUsers: 'exact fixture emails and matching user_metadata marker only',
    },
  };
  assertRemainingFixturePlan(plan);
  return plan;
}

export function assertRemainingFixturePlan(plan) {
  if (!plan || typeof plan !== 'object') throw new Error('Fixture plan is invalid');
  if (plan.schemaVersion !== REMAINING_CLOSURE_SCHEMA_VERSION || plan.fixture !== REMAINING_CLOSURE_FIXTURE) {
    throw new Error('Fixture plan schema or marker does not match the remaining closure');
  }
  if (typeof plan.runId !== 'string' || !/^[0-9a-f-]{36}$/i.test(plan.runId)) {
    throw new Error('Fixture plan run ID is invalid');
  }
  for (const kind of FIXTURE_KINDS) {
    const fixture = plan.fixtures?.[kind];
    if (!fixture || fixture.kind !== kind || typeof fixture.merchantId !== 'string') {
      throw new Error(`Fixture plan omits ${kind}`);
    }
    const marker = fixture.marker;
    if (!marker || marker.fixture !== REMAINING_CLOSURE_FIXTURE || marker.kind !== kind || marker.runId !== plan.runId || marker.localOnly !== true) {
      throw new Error(`Fixture marker for ${kind} does not match the plan`);
    }
  }
  return plan;
}

export function loadRemainingFixturePlan({ required = true } = {}) {
  const plan = readRemainingClosureJson('fixture-plan.json', { required });
  return plan ? assertRemainingFixturePlan(plan) : null;
}

export function fixtureForScenario(plan, scenarioId) {
  if (!REMAINING_SCENARIO_IDS.includes(scenarioId)) {
    throw new Error(`Scenario ${scenarioId} is not owned by remaining closure`);
  }
  if (['api-keys-empty', 'audit-trail-empty', 'invite-member-and-transfer-ownership-modals', 'create-reveal-and-revoke-api-key-modals', 'agreement-upload-and-review-overlays', 'billing-plan-change-modal'].includes(scenarioId)) {
    return plan.fixtures.settings;
  }
  if (['billing-unavailable', 'data-erasure-and-account-deletion-modals'].includes(scenarioId)) {
    return plan.fixtures.privacy;
  }
  return null;
}

export function fingerprintRows(rows) {
  return sha256(stableJson(rows));
}

export function receiptFingerprint(receipt) {
  return sha256(stableJson(dataWithoutSecrets(receipt)));
}
