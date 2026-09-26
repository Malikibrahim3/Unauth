import { expect, test, type TestInfo } from '@playwright/test';
import { scenarioLedger } from '@/lib/surfaces/manifest';
import { captureScenario, runtimeObserver, writeScenarioReceipt } from './remainingClosureHelpers';

const scenario = scenarioLedger.find((entry) => entry.id === 'root-not-found');
if (!scenario) throw new Error('Manifest scenario root-not-found is missing.');
const variants = [
  { id: 'mobile-light', width: 390, height: 844 },
  { id: 'desktop-light', width: 1440, height: 900 },
] as const;
const evidence: Array<Record<string, unknown>> = [];

function assertLocalRuntime(baseURL: string) {
  const hostname = new URL(baseURL).hostname;
  if (process.env.RELEASE_E2E_LOCAL !== '1' || !['127.0.0.1', 'localhost', '::1', '[::1]'].includes(hostname)) {
    throw new Error('Root not-found acceptance proof is local-only and requires a loopback release runtime.');
  }
}

test.describe('FAR-1 independent root not-found', () => {
  for (const variant of variants) {
    test(`root-not-found · ${variant.id}`, async ({ page }, info: TestInfo) => {
      const baseURL = String(info.project.use.baseURL);
      assertLocalRuntime(baseURL);
      await page.setViewportSize({ width: variant.width, height: variant.height });
      const runtime = runtimeObserver(page, baseURL);
      const mutations: string[] = [];
      page.on('request', (request) => {
        if (request.url().startsWith(new URL(baseURL).origin) && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
          mutations.push(`${request.method()} ${new URL(request.url()).pathname}`);
        }
      });

      const unknownPath = `/missing-root-${variant.id}-f31d98`;
      await page.goto(unknownPath, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-surface-id="root-not-found"]')).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('[data-state-id="root-not-found"]')).toBeVisible();
      await expect(page.locator('[data-unauth-ui="supplied-package"]')).toBeVisible();
      const screenshot = await captureScenario(page, 'root-not-found', `${variant.id}.png`);
      const signInLinks = page.getByRole('link', { name: 'Sign in' });
      await expect(signInLinks).toHaveCount(2);
      await expect(signInLinks.first()).toHaveAttribute('href', '/login');
      await expect(signInLinks.nth(1)).toHaveAttribute('href', '/login');

      // Chromium reports the intentionally missing document as a console 404;
      // that response is the state under test, not an application asset error.
      const expectedNotFoundConsole = 'Failed to load resource: the server responded with a status of 404 (Not Found)';
      for (let index = runtime.consoleErrors.length - 1; index >= 0; index -= 1) {
        if (runtime.consoleErrors[index] === expectedNotFoundConsole) runtime.consoleErrors.splice(index, 1);
      }

      await page.getByRole('link', { name: 'Home' }).click();
      await expect(page).toHaveURL(/\/landing$/);

      expect(mutations).toEqual([]);
      expect(runtime.consoleErrors).toEqual([]);
      expect(runtime.pageErrors).toEqual([]);
      expect(runtime.failedRequests).toEqual([]);
      evidence.push({
        viewport: `${variant.width}x${variant.height}`,
        theme: 'permanent-light-entry',
        screenshot,
        unknownPath,
        safeReturns: ['landing', 'login'],
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
    writeScenarioReceipt('root-not-found', {
      schemaVersion: 1,
      evidenceSource: 'playwright-runtime',
      scenarioId: scenario.id,
      owningSurface: scenario.owner,
      declaredKind: scenario.kind,
      localOnly: true,
      variants: evidence,
      verdict: evidence.length === variants.length && failures.length === 0 ? 'passed' : 'partial',
      cleanup: 'No fixture, provider, account, or workspace mutation was made by this public recovery proof.',
    });
  });
});
