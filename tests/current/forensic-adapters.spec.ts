import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('artifacts/full-app-acceptance-2026-08-30');
const routes = JSON.parse(readFileSync(path.join(root, 'physical/routes.json'), 'utf8')).dynamicPaths;
const customer = routes['/customers/[id]'];
const casePath = new URL(routes['/cases/[caseId]'], 'http://localhost').pathname;
const entries = [
  { id: 'controls-index-adapter', from: '/controls?search=forensic-no-match&state=draft&sort=updated', to: '/controls/rules', surface: 'payout-rules-registry' },
  { id: 'financials-index-adapter', from: '/financials?currency=GBP&range=30d&page=1', to: '/financials/losses', surface: 'loss-ledger' },
  { id: 'sources-index-adapter', from: '/sources?status=connected&category=commerce&q=Shopify', to: '/sources/connected', surface: 'connected-sources' },
  { id: 'customer-claims-adapter', from: `${customer}/claims?claimId=${casePath.split('/').at(-1)}&tab=events`, to: casePath, surface: 'case-review-workbench' },
];
const evidence = new Map<string, Array<Record<string, any>>>();
for (const entry of entries) for (const width of [1440, 1024]) {
  test(`${entry.id} · ${width}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/cases');
    await expect(page.locator('[data-surface-id="cases-registry"]')).toBeVisible();
    await page.goto(entry.from);
    expect(new URL(page.url()).pathname).toBe(entry.to);
    const received = new URL(page.url());
    for (const [key, value] of new URL(entry.from, 'http://localhost').searchParams) {
      if (key !== 'claimId') expect(received.searchParams.get(key)).toBe(value);
    }
    if (entry.id === 'customer-claims-adapter') {
      expect(received.searchParams.has('claimId')).toBe(false);
      expect(received.searchParams.get('return')).toBe(`${customer}?tab=cases`);
    }
    await expect(page.locator(`[data-surface-id="${entry.surface}"]`).first()).toBeVisible();
    await page.reload();
    expect(new URL(page.url()).pathname).toBe(entry.to);
    await expect(page.locator(`[data-surface-id="${entry.surface}"]`).first()).toBeVisible();
    const directory = path.join(root, 'scenarios', entry.id);
    mkdirSync(directory, { recursive: true });
    const screenshot = path.join(directory, `forensic-${width}.png`);
    await page.screenshot({ path: screenshot });
    if (entry.id === 'customer-claims-adapter') {
      await page.goto(`${customer}/claims?claimId=not-a-uuid&tab=notes`);
      expect(new URL(page.url()).pathname).toBe(customer);
      expect(new URL(page.url()).searchParams.get('tab')).toBe('cases');
      await expect(page.locator('[data-surface-id="customer-profile"]')).toBeVisible();
    } else {
      await page.goBack();
      await expect(page).toHaveURL(/\/cases$/);
      await expect(page.locator('[data-surface-id="cases-registry"]')).toBeVisible();
    }
    expect(errors).toEqual([]);
    evidence.set(entry.id, [...(evidence.get(entry.id) ?? []), { id: String(width), viewport: `${width}x720`, finalUrl: received.pathname + received.search, screenshot: path.relative(root, screenshot), queryPreserved: true, reload: true, pageErrors: errors }]);
  });
}
test.afterAll(() => {
  for (const entry of entries) {
    const variants = evidence.get(entry.id);
    if (!variants?.length) continue;
    writeFileSync(path.join(root, 'scenarios', entry.id, 'receipt.json'), JSON.stringify({
      scenarioId: entry.id, schemaVersion: 2, evidenceSource: 'playwright-runtime', declaredKind: 'adapter',
      verdict: variants.length === 2 ? 'passed' : 'partial', variants,
      supportingEvidence: variants.map(v => v.screenshot),
      note: 'Authenticated canonical destination, query preservation and reload at two desktop widths. Index adapters also exercise Back; customer adapter exercises valid case return context and invalid claim fallback. No business writes.',
    }, null, 2) + '\n');
  }
});
