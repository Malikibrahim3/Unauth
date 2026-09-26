import { expect, test, type TestInfo } from '@playwright/test';
import { scenarioLedger } from '@/lib/surfaces/manifest';
import { captureScenario, runtimeObserver, writeScenarioReceipt } from './remainingClosureHelpers';

const scenario = scenarioLedger.find((entry) => entry.id === 'pricing-plan-unavailable');
if (!scenario) throw new Error('Manifest scenario pricing-plan-unavailable is missing.');
const variants = [
  { id: 'mobile-light', width: 390, height: 844 },
  { id: 'desktop-light', width: 1440, height: 900 },
] as const;
const evidence: Array<Record<string, unknown>> = [];

function assertLocalPublicRuntime(baseURL: string) {
  const parsed = new URL(baseURL);
  if (process.env.RELEASE_E2E_LOCAL !== '1' || !['127.0.0.1', 'localhost', '::1', '[::1]'].includes(parsed.hostname)) {
    throw new Error('Pricing unavailable acceptance evidence is local-only and requires a loopback release runtime.');
  }
}

test.describe('FAR-1 pricing unavailable plan state', () => {
  for (const variant of variants) {
    test(`pricing-plan-unavailable · ${variant.id}`, async ({ page }, info: TestInfo) => {
      const baseURL = String(info.project.use.baseURL);
      assertLocalPublicRuntime(baseURL);
      await page.setViewportSize({ width: variant.width, height: variant.height });
      const runtime = runtimeObserver(page, baseURL);
      const mutations: string[] = [];
      page.on('request', (request) => {
        if (request.url().startsWith(new URL(baseURL).origin) && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
          mutations.push(`${request.method()} ${new URL(request.url()).pathname}`);
        }
      });

      const invalidPlan = 'not-in-the-current-catalogue';
      await page.goto(`/pricing?plan=${invalidPlan}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-state-id="pricing-plan-unavailable"]')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('No plan selection, subscription change, redirect, or saved intent occurred.')).toBeVisible();
      expect(new URL(page.url()).searchParams.get('plan')).toBe(invalidPlan);
      await expect(page.locator('article')).toHaveCount(4);
      const screenshot = await captureScenario(page, 'pricing-plan-unavailable', `${variant.id}.png`);

      await page.goto('/pricing?plan=scale', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-state-id="pricing-plan-unavailable"]')).toHaveCount(0);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-state-id="pricing-plan-unavailable"]')).toHaveCount(0);
      // Public surfaces are light-only and no longer carry an authenticated
      // theme attribute or a legacy data-theme contract.
      await expect(page.locator('html')).not.toHaveAttribute('data-auth-theme');
      await expect(page.locator('html')).not.toHaveAttribute('data-theme');

      expect(mutations).toEqual([]);
      expect(runtime.consoleErrors).toEqual([]);
      expect(runtime.pageErrors).toEqual([]);
      expect(runtime.failedRequests).toEqual([]);
      evidence.push({
        viewport: `${variant.width}x${variant.height}`,
        theme: 'light',
        screenshot,
        invalidQueryPreserved: true,
        validAndAbsentQueriesHaveNoUnavailableState: true,
        mutationRequests: mutations,
        ...runtime,
      });
    });
  }

  test.afterAll(() => {
    const failures = evidence.flatMap((entry) => [
      ...((entry.consoleErrors as string[] | undefined) ?? []),
      ...((entry.pageErrors as string[] | undefined) ?? []),
      ...((entry.failedRequests as string[] | undefined) ?? []),
      ...((entry.mutationRequests as string[] | undefined) ?? []),
    ]);
    writeScenarioReceipt('pricing-plan-unavailable', {
      schemaVersion: 1,
      evidenceSource: 'playwright-runtime',
      scenarioId: scenario.id,
      owningSurface: scenario.owner,
      declaredKind: scenario.kind,
      localOnly: true,
      variants: evidence,
      noMutation: failures.length === 0,
      verdict: evidence.length === variants.length && failures.length === 0 ? 'passed' : 'partial',
      cleanup: 'No fixture, auth, billing, or provider mutation was made by this public state proof.',
    });
  });
});
