import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { scenarioLedger } from '@/lib/surfaces/manifest';
import { hashId } from '@/lib/ui/displayRef';

const acceptanceRoot = path.join(process.cwd(), 'artifacts', 'full-app-acceptance-2026-08-30');
const scenario = scenarioLedger.find((candidate) => candidate.id === 'file-claim');
const caseId = '5e4c2657-e84c-40b8-9d97-ace8de53d8d2';
const expectedCaseReference = `CASE-${hashId(caseId).replace('#', '')} · Royal Mail`;

if (!scenario) throw new Error('The file-claim acceptance scenario is not registered.');

test('file-claim · canonical route · desktop-light', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'failed';
    if (failure !== 'net::ERR_ABORTED') failedRequests.push(`${request.method()} ${new URL(request.url()).pathname}: ${failure}`);
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/financials/recovery/new?case=${caseId}`, { waitUntil: 'domcontentloaded' });
  const surface = page.locator('[data-screen-label="File a claim"]');
  await expect(surface).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/financials/recovery/new\\?case=${caseId}$`));
  await expect(surface.getByText(`File a claim · ${expectedCaseReference}`, { exact: true })).toBeVisible();

  const directory = path.join(acceptanceRoot, 'scenarios', scenario.id);
  fs.mkdirSync(directory, { recursive: true });
  const screenshot = path.join(directory, 'desktop-light.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  fs.writeFileSync(path.join(directory, 'receipt.json'), `${JSON.stringify({
    schemaVersion: 2,
    evidenceSource: 'playwright-runtime',
    scenarioId: scenario.id,
    owningSurface: scenario.owner,
    declaredKind: scenario.kind,
    activation: scenario.activationRecipe,
    viewport: ['1440x900 authenticated'],
    theme: ['light-only'],
    roleProfile: { role: 'owner', persona: null, delegatedPermissions: [] },
    finalUrl: new URL(page.url()).pathname,
    consoleErrors,
    pageErrors,
    failedRequests,
    expectedDiagnostics: [],
    screenshotOrTrace: path.relative(acceptanceRoot, screenshot),
    supportingEvidence: [path.relative(acceptanceRoot, screenshot), 'artifacts/visual-authority/implementation/File-Claim-Clean.png'],
    mutationReceipt: null,
    cleanup: 'Read-only canonical-route verification; no state changed.',
    verdict: 'passed',
    note: 'The canonical file-claim route rendered the supplied page against the guarded local case fixture with no runtime errors.',
  }, null, 2)}\n`);
});
