import { expect, test, type TestInfo } from '@playwright/test';
import { scenarioLedger } from '@/lib/surfaces/manifest';
import {
  SCENARIO_HEADER,
  authenticateFixture,
  captureScenario,
  requireRemainingClosurePlan,
  runtimeObserver,
  setLightOnlyAppearance,
  writeScenarioReceipt,
  type RemainingFixturePlan,
} from './remainingClosureHelpers';

const scenario = scenarioLedger.find((entry) => entry.id === 'billing-plan-change-modal');
if (!scenario) throw new Error('Manifest scenario billing-plan-change-modal is missing.');
let plan: RemainingFixturePlan;
let evidence: Record<string, unknown> | null = null;

test.beforeAll(() => {
  plan = requireRemainingClosurePlan();
});

test.describe.serial('FAR-4 provider-free billing plan-change modal', () => {
  test('schedules a local-only lower-plan downgrade without provider confirmation', async ({ page, context }, info: TestInfo) => {
    const baseURL = String(info.project.use.baseURL);
    await page.setViewportSize({ width: 1440, height: 900 });
    await setLightOnlyAppearance(context, baseURL, 'light');
    await authenticateFixture(page, baseURL, plan.fixtures.settings, '/settings/billing');
    await context.setExtraHTTPHeaders({ [SCENARIO_HEADER]: 'billing-plan-change-modal' });
    const runtime = runtimeObserver(page, baseURL);
    const externalMutationRequests: string[] = [];
    page.on('request', (request) => {
      if (!request.url().startsWith(new URL(baseURL).origin) && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        externalMutationRequests.push(`${request.method()} ${new URL(request.url()).origin}`);
      }
    });

    await page.goto('/settings/billing', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('region', { name: 'Enterprise plan' }).getByRole('heading', { name: 'Enterprise' })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Choose Growth' }).click();
    const modal = page.locator('[data-overlay-id="billing-plan-change-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Audit consequence')).toBeVisible();
    await expect(modal.getByText('A downgrade is scheduled for renewal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(page.getByRole('button', { name: 'Choose Growth' })).toBeFocused();

    await page.getByRole('button', { name: 'Choose Growth' }).click();
    const actionResponse = page.waitForResponse((response) => response.url().endsWith('/api/billing/actions') && response.request().method() === 'POST');
    await modal.getByRole('button', { name: 'Schedule plan change' }).click();
    const response = await actionResponse;
    const responseBody = await response.json() as {
      providerProvenance?: string;
      localAcceptance?: boolean;
      subscriptionIntent?: { id?: string; status?: string };
    };
    expect(response.status()).toBe(200);
    expect(responseBody).toMatchObject({
      providerProvenance: 'local-acceptance-provider-free',
      localAcceptance: true,
      subscriptionIntent: { status: 'pending' },
    });
    await expect(page.getByText('Scheduled locally for acceptance verification; no provider confirmation or email was sent.')).toBeVisible();

    const idempotencyKey = response.request().headers()['idempotency-key'];
    expect(idempotencyKey).toBeTruthy();
    const replay = await page.evaluate(async (key) => {
      const response = await fetch('/api/billing/actions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': key,
        },
        body: JSON.stringify({ action: 'downgrade', planId: 'growth' }),
      });
      return { status: response.status, body: await response.json() as { providerProvenance?: string; subscriptionIntent?: { id?: string; status?: string } } };
    }, idempotencyKey);
    expect(replay.status).toBe(200);
    expect(replay.body).toMatchObject({
      providerProvenance: 'local-acceptance-provider-free',
      subscriptionIntent: { id: responseBody.subscriptionIntent?.id, status: 'pending' },
    });

    const billingReadback = await page.evaluate(async () => {
      const response = await fetch('/api/billing');
      return { status: response.status, body: await response.json() as {
        planId?: string; downgradeToPlanId?: string; subscriptionIntent?: { status?: string; planId?: string } | null;
      } };
    });
    expect(billingReadback).toMatchObject({
      status: 200,
      body: {
        planId: 'scale',
        downgradeToPlanId: 'growth',
        subscriptionIntent: { planId: 'growth', status: 'pending' },
      },
    });
    expect(externalMutationRequests).toEqual([]);
    expect(runtime.consoleErrors).toEqual([]);
    expect(runtime.pageErrors).toEqual([]);
    expect(runtime.failedRequests).toEqual([]);
    const screenshot = await captureScenario(page, 'billing-plan-change-modal', 'desktop-light-scheduled.png');
    evidence = {
      viewport: '1440x900',
      theme: 'light',
      screenshot,
      currentSubscription: billingReadback.body.planId,
      scheduledDowngrade: billingReadback.body.downgradeToPlanId,
      subscriptionIntent: billingReadback.body.subscriptionIntent,
      replay: { status: replay.status, providerProvenance: replay.body.providerProvenance, sameIntent: replay.body.subscriptionIntent?.id === responseBody.subscriptionIntent?.id },
      externalMutationRequests,
      ...runtime,
    };
  });

  test.afterAll(() => {
    const failures = evidence
      ? [
          ...((evidence.consoleErrors as string[] | undefined) ?? []),
          ...((evidence.pageErrors as string[] | undefined) ?? []),
          ...((evidence.failedRequests as string[] | undefined) ?? []),
          ...((evidence.externalMutationRequests as string[] | undefined) ?? []),
        ]
      : ['No browser evidence captured'];
    writeScenarioReceipt('billing-plan-change-modal', {
      schemaVersion: 1,
      evidenceSource: 'playwright-runtime',
      scenarioId: scenario.id,
      owningSurface: scenario.owner,
      declaredKind: scenario.kind,
      fixture: plan?.fixture ?? null,
      runId: plan?.runId ?? null,
      localOnly: true,
      providerProvenance: 'local-acceptance-provider-free',
      mutation: evidence,
      guardNegativeCoverage: 'Covered by tests/api/billingProviderFreeAcceptance.test.ts and tests/lib/remainingClosureGuard.test.ts.',
      verdict: failures.length === 0 ? 'passed' : 'partial',
      cleanup: 'The exact marked Settings fixture and any pending intent are removed by the remaining-closure cleanup script; no provider charge, email, or remote environment was used.',
    });
  });
});
