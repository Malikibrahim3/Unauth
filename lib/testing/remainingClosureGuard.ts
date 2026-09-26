import fs from 'node:fs';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A deliberately narrow, server-route-only guard for the remaining FAA
 * closure. It is not a feature flag: every condition must match before a
 * route may expose an acceptance-only deterministic response or mutation.
 */
export const REMAINING_CLOSURE_SCENARIO_HEADER = 'x-unauth-acceptance-scenario';
export const REMAINING_CLOSURE_FIXTURE = 'full-app-acceptance-remaining-2026-08-31';
export const REMAINING_CLOSURE_ROOT = 'artifacts/full-app-acceptance-remaining-2026-08-31';

type Environment = Record<string, string | undefined>;

type FixtureMarker = {
  fixture: string;
  kind: string;
  runId: string;
  localOnly: boolean;
};

type FixturePlan = {
  fixture: string;
  runId: string;
  allowedScenarioIds: string[];
  fixtures: Record<string, { merchantId: string; marker: FixtureMarker }>;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function isLoopbackAcceptanceUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(new URL(value).hostname);
  } catch {
    return false;
  }
}

/** Exposed for negative-path unit tests; routes use the current process env. */
export function remainingClosureEnvironmentIsSafe(environment: Environment = process.env): boolean {
  const vercelEnvironment = environment.VERCEL_ENV?.trim().toLowerCase();
  return environment.RELEASE_E2E_LOCAL === '1'
    && vercelEnvironment !== 'preview'
    && vercelEnvironment !== 'production'
    && isLoopbackAcceptanceUrl(environment.NEXT_PUBLIC_APP_URL)
    && isLoopbackAcceptanceUrl(environment.NEXT_PUBLIC_SUPABASE_URL);
}

function readFixturePlan(): FixturePlan | null {
  const fixturePath = path.join(process.cwd(), REMAINING_CLOSURE_ROOT, 'fixture-plan.json');
  try {
    const candidate = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as unknown;
    const plan = record(candidate);
    const fixtures = record(plan?.fixtures);
    const allowedScenarioIds = Array.isArray(plan?.allowedScenarioIds)
      ? plan.allowedScenarioIds.filter((value): value is string => typeof value === 'string')
      : null;
    if (!plan || plan.fixture !== REMAINING_CLOSURE_FIXTURE || typeof plan.runId !== 'string' || !allowedScenarioIds || !fixtures) {
      return null;
    }

    const parsedFixtures: FixturePlan['fixtures'] = {};
    for (const [kind, rawFixture] of Object.entries(fixtures)) {
      const fixture = record(rawFixture);
      const marker = record(fixture?.marker);
      if (!fixture || typeof fixture.merchantId !== 'string' || !marker
        || marker.fixture !== REMAINING_CLOSURE_FIXTURE
        || marker.kind !== kind
        || marker.runId !== plan.runId
        || marker.localOnly !== true) {
        return null;
      }
      parsedFixtures[kind] = {
        merchantId: fixture.merchantId,
        marker: {
          fixture: marker.fixture,
          kind: marker.kind,
          runId: marker.runId,
          localOnly: true,
        },
      };
    }

    return {
      fixture: REMAINING_CLOSURE_FIXTURE,
      runId: plan.runId,
      allowedScenarioIds,
      fixtures: parsedFixtures,
    };
  } catch {
    return null;
  }
}

function markerMatches(settings: unknown, marker: FixtureMarker): boolean {
  const settingRecord = record(settings);
  const candidate = record(settingRecord?.acceptance_remaining_closure);
  return candidate?.fixture === marker.fixture
    && candidate.kind === marker.kind
    && candidate.runId === marker.runId
    && candidate.localOnly === true;
}

/**
 * Verifies the header, local runtime, current artifact plan, and the exact
 * purpose-created merchant marker. Errors and missing state are always a
 * normal false result, so callers fail closed into their ordinary contract.
 */
export async function isRemainingClosureFixtureRequest({
  request,
  service,
  merchantId,
  scenarioId,
  fixtureKind,
}: {
  request: Request;
  service: SupabaseClient;
  merchantId: string;
  scenarioId: string;
  fixtureKind: string;
}): Promise<boolean> {
  if (!remainingClosureEnvironmentIsSafe()) return false;
  if (request.headers.get(REMAINING_CLOSURE_SCENARIO_HEADER)?.trim() !== scenarioId) return false;

  const plan = readFixturePlan();
  if (!plan || !plan.allowedScenarioIds.includes(scenarioId)) return false;
  const fixture = plan.fixtures[fixtureKind];
  if (!fixture || fixture.merchantId !== merchantId) return false;

  try {
    const { data, error } = await service
      .from('merchants')
      .select('id,settings')
      .eq('id', merchantId)
      .maybeSingle();
    return !error && Boolean(data) && markerMatches(data?.settings, fixture.marker);
  } catch {
    return false;
  }
}
