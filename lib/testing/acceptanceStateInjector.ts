import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import { headers } from 'next/headers';
import { scenarioLedger } from '@/lib/surfaces/manifest';

export const ACCEPTANCE_SCENARIO_HEADER = 'x-unauth-acceptance-scenario';
export const ACCEPTANCE_VARIANT_HEADER = 'x-unauth-acceptance-variant';
const ACCEPTANCE_ARTIFACT_ROOT = path.join(
  process.cwd(),
  'artifacts',
  'full-app-acceptance-2026-08-30',
);
export const ROOT_ERROR_MARKER = path.join(
  ACCEPTANCE_ARTIFACT_ROOT,
  '.root-global-error-active',
);
export const ROUTE_ERROR_MARKER = path.join(
  ACCEPTANCE_ARTIFACT_ROOT,
  '.route-error-boundaries-active',
);

const manifestScenarioIds = new Set(scenarioLedger.map((scenario) => scenario.id));

export function acceptanceScenarioMarkerPath(scenarioId: string): string {
  if (!manifestScenarioIds.has(scenarioId)) throw new Error('Unsupported local acceptance scenario');
  return path.join(ACCEPTANCE_ARTIFACT_ROOT, `.${scenarioId}-active`);
}

function isLoopbackUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return ['127.0.0.1', 'localhost', '::1'].includes(new URL(value).hostname);
  } catch {
    return false;
  }
}

export function isAcceptanceStateInjectionEnabled(): boolean {
  return process.env.RELEASE_E2E_LOCAL === '1'
    && process.env.VERCEL_ENV !== 'production'
    && isLoopbackUrl(process.env.NEXT_PUBLIC_APP_URL)
    && isLoopbackUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL);
}

export async function acceptanceScenarioFromHeaders(): Promise<string | null> {
  if (!isAcceptanceStateInjectionEnabled()) return null;
  const scenarioId = (await headers()).get(ACCEPTANCE_SCENARIO_HEADER)?.trim() ?? null;
  if (!scenarioId) return null;
  if (!manifestScenarioIds.has(scenarioId)) {
    throw new Error('Unsupported local acceptance scenario');
  }
  return scenarioId;
}

export async function acceptanceVariantFromHeaders<T extends string>(
  expectedScenarioId: string,
  allowedVariants: readonly T[],
): Promise<T | null> {
  if (await acceptanceScenarioFromHeaders() !== expectedScenarioId) return null;
  const variant = (await headers()).get(ACCEPTANCE_VARIANT_HEADER)?.trim() ?? null;
  return variant && allowedVariants.includes(variant as T) ? variant as T : null;
}

export async function delayForAcceptanceScenario(
  expectedScenarioId: string,
  delayMs = 3_000,
): Promise<void> {
  if (await acceptanceScenarioFromHeaders() !== expectedScenarioId) return;
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function throwForAcceptanceScenario(expectedScenarioId: string): Promise<void> {
  if (await acceptanceScenarioFromHeaders() !== expectedScenarioId) return;
  const marker = acceptanceScenarioMarkerPath(expectedScenarioId);
  if (!fs.existsSync(marker)) return;
  if (fs.readFileSync(marker, 'utf8').trim() !== expectedScenarioId) {
    throw new Error('Unsupported local route acceptance scenario');
  }
  // Keep the exact marker active for every request carrying this scenario
  // header. Next may retry a failed server-component render before committing
  // the segment error boundary; consuming the marker on the first attempt
  // makes that retry silently render the normal route. The browser harness
  // clears the header before recovery and removes this exact marker in finally.
  throw new Error(`Local acceptance activation: ${expectedScenarioId}`);
}

export function throwForRootAcceptanceScenario(): void {
  if (!isAcceptanceStateInjectionEnabled() || !fs.existsSync(ROOT_ERROR_MARKER)) return;
  const scenarioId = fs.readFileSync(ROOT_ERROR_MARKER, 'utf8').trim();
  if (scenarioId !== 'root-global-error' || !manifestScenarioIds.has(scenarioId)) {
    throw new Error('Unsupported local root acceptance scenario');
  }
  throw new Error('Local acceptance activation: root-global-error');
}
