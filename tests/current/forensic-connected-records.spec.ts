import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { objectDisplayRef } from '@/lib/ui/displayRef';
import { formatCurrencyNullable } from '@/lib/utils/format';
import type { ObjectSummary } from '@/lib/relationships/objectSummary';

const root = path.resolve('artifacts/full-app-acceptance-2026-08-30');
const routes = JSON.parse(readFileSync(path.join(root, 'physical/routes.json'), 'utf8')).dynamicPaths;
const hex = createHash('sha256').update('demo-v2:ticket:carrier-proof').digest('hex').slice(0, 32).split('');
hex[12] = '4'; hex[16] = (8 + (parseInt(hex[16], 16) % 4)).toString(16);
const h = hex.join('');
const ticket = `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
const records = [
  { type: 'order', route: routes['/orders/[id]'], scenario: 'order-detail' },
  { type: 'refund', route: '/refunds/d1300000-0000-4000-8000-000000000002', scenario: 'refund-detail' },
  { type: 'return', route: '/returns/d1300000-0000-4000-8000-000000000003', scenario: 'return-detail' },
  { type: 'shipment', route: '/shipments/d1300000-0000-4000-8000-00000000000c', scenario: 'shipment-detail' },
  { type: 'ticket', route: `/tickets/${ticket}`, scenario: 'support-ticket-detail' },
  { type: 'dispute', route: '/disputes/d1300000-0000-4000-8000-000000000005', scenario: 'dispute-detail' },
];
const evidence = new Map<string, object[]>();

for (const record of records) for (const width of [1440, 1024]) {
  test(`${record.scenario} · ${width}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 600 });
    const failures: string[] = [];
    page.on('pageerror', error => failures.push(error.message));
    const id = record.route.split('/').at(-1)!;
    const response = await page.request.get(`/api/objects/${record.type}/${id}`);
    expect(response.status()).toBe(200);
    const { object } = await response.json() as { object: ObjectSummary };
    expect(object.id).toBe(id);
    expect(object.type).toBe(record.type);
    const returnTo = '/cases?sort=value';
    await page.goto(`${record.route}?return=${encodeURIComponent(returnTo)}`);
    const surface = page.locator(`[data-surface-id="${record.scenario}"]`);
    await expect(surface).toBeVisible();
    if (record.type === 'order' && !object.items.length && object.sectionCoverage?.items) {
      const explanation = surface.getByText(object.sectionCoverage.items.explanation, { exact: false }).first();
      await explanation.scrollIntoViewIfNeeded();
      await expect(explanation).toBeInViewport();
      expect(await explanation.evaluate(node => {
        const box = node.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return hit === node || node.contains(hit);
      }), 'The line-item availability explanation must not be painted underneath the next card').toBe(true);
    }
    const title = objectDisplayRef(object.type, object.reference, object.id);
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    if (object.amount != null && object.currency) {
      const amount = formatCurrencyNullable(object.amount, object.currency);
      expect(amount).not.toBeNull();
      await expect(page.getByText(amount!, { exact: true }).first()).toBeVisible();
    }
    const links = [...object.connected, ...object.payoutCases, ...(object.customer ? [object.customer] : [])];
    for (const linked of links) {
      const link = surface.locator(`a[href=${JSON.stringify(linked.href)}]`).first();
      await expect(link).toHaveCount(1);
      await expect(link).toContainText(objectDisplayRef(linked.type, linked.reference, linked.id));
    }
    const back = page.getByRole('link', { name: 'Back to cases', exact: true });
    await expect(back).toHaveAttribute('href', returnTo);
    await back.scrollIntoViewIfNeeded();
    await expect(back).toBeInViewport();
    const clipping = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(clipping).toBeLessThanOrEqual(1);
    await page.reload();
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    await expect(back).toHaveAttribute('href', returnTo);
    const customer = object.customer;
    if (customer) {
      await surface.locator(`a[href=${JSON.stringify(customer.href)}]`).first().click();
      await expect(page).toHaveURL(new RegExp(customer.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      await expect(page.locator('[data-surface-id="customer-profile"]')).toBeVisible();
      await page.goBack();
      await expect(surface).toBeVisible();
    }
    const directory = path.join(root, 'scenarios', record.scenario);
    mkdirSync(directory, { recursive: true });
    const screenshot = path.join(directory, `forensic-${width}.png`);
    await page.screenshot({ path: screenshot });
    await back.click();
    await expect(page).toHaveURL(/\/cases\?sort=value$/);
    await expect(page.locator('[data-surface-id="cases-registry"]')).toBeVisible();
    expect(failures).toEqual([]);
    const entry = { id: String(width), viewport: `${width}x600`, screenshots: [path.relative(root, screenshot)], finalUrl: record.route, sourceObjectId: id, connectedLinksChecked: links.length, customerRoundTrip: Boolean(customer), reload: true, returnQueryPreserved: true, horizontalClipping: clipping, pageErrors: failures };
    evidence.set(record.scenario, [...(evidence.get(record.scenario) ?? []), entry]);
    await info.attach('connected-record-observation', { body: JSON.stringify(entry), contentType: 'application/json' });
  });
}

test.afterAll(() => {
  for (const record of records) {
    const variants = evidence.get(record.scenario) as Array<{ screenshots: string[] }> | undefined;
    if (!variants?.length) continue;
    writeFileSync(path.join(root, 'scenarios', record.scenario, 'receipt.json'), JSON.stringify({
      schemaVersion: 2, evidenceSource: 'playwright-runtime', scenarioId: record.scenario,
      owningSurface: record.route, declaredKind: 'route', verdict: variants.length === 2 ? 'passed' : 'partial',
      variants, supportingEvidence: variants.flatMap(v => v.screenshots),
      note: 'Authenticated recorded identity and connected-link binding, customer round trip where linked, reload, contextual return query, and horizontal bounds at two short desktop widths. This does not establish every keyboard, native accessibility or visual-parity requirement.',
      cleanup: 'Read-only browser/API interactions; no business records, emails or provider actions changed.',
    }, null, 2) + '\n');
  }
});
