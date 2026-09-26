import { chromium, devices } from 'playwright';
import { strict as assert } from 'node:assert';
import { writeFileSync } from 'node:fs';
const root = 'artifacts/merchant-clarity-implementation/2026-09-07-p10/P10/browser';
const base = 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
const results = []; const requests = []; const errors = [];
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await context.route('**/*', route => {
  const u = new URL(route.request().url());
  requests.push({ origin: u.origin, path: u.pathname, method: route.request().method() });
  if (u.origin !== base && !['data:', 'blob:'].includes(u.protocol)) return route.abort();
  return route.continue();
});
const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(60000);
async function go(query) { await page.goto(`${base}/demo?${query}`); await page.getByRole('button', { name: 'Reset this case', exact: true }).waitFor(); }
async function choose(label, rationale) {
  await page.getByRole('button', { name: `Review ${label.toLowerCase()}`, exact: true }).click();
  await page.getByRole('dialog').waitFor();
  if (rationale) {
    assert(await page.getByRole('button', { name: 'Confirm simulated decision' }).isDisabled());
    await page.getByLabel('Goodwill rationale (required)').fill(rationale);
  }
  await page.getByRole('button', { name: 'Confirm simulated decision' }).click();
  await page.locator('[data-demo-step="outcome"]').waitFor();
}
try {
  await go('case=legitimate&step=outcome');
  assert(page.url().includes('step=decide')); assert(await page.getByRole('status').filter({ hasText: 'No decision' }).count());
  await page.getByRole('button', { name: 'Review refund', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.locator('[role="dialog"]').waitFor({state:'detached'});
  await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Review refund');
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  await page.getByRole('button', { name: 'Review refund', exact: true }).click();
  await page.locator('[data-overlay-open="true"] [role="dialog"]').waitFor();
  await page.waitForFunction(() => !!document.activeElement?.closest('[role=dialog]'));
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Review refund');
  results.push('unmade Outcome, cancellation, Escape and focus restoration');
  const branches = [['legitimate','Refund'], ['legitimate','Replace'], ['legitimate','Request review'], ['duplicate','No additional payout'], ['duplicate','Escalate'], ['duplicate','Goodwill exception'], ['recoverable','Request review'], ['recoverable','Refund and prepare recovery']];
  for (const [id, label] of branches) {
    await go(`case=${id}&step=inspect`); await page.getByRole('button', { name: 'Reset this case', exact: true }).click();
    await page.getByRole('button', { name: 'Compare choices', exact: true }).click();
    await choose(label, label === 'Goodwill exception' ? 'Reviewed duplicate concession; authorised illustrative goodwill.' : null);
    assert(await page.getByRole('heading', { name: `Simulated decision: ${label}`, exact: true }).count());
    if (label === 'Refund' || label === 'Goodwill exception') {
      await page.getByRole('button', { name: 'Simulate refund observed', exact: true }).click();
      assert(await page.getByRole('button', { name: 'Simulate refund observed', exact: true }).isDisabled());
      if (label === 'Goodwill exception') assert((await page.locator('dl').innerText()).includes('256.00'));
    } else if (label === 'Replace') await page.getByRole('button', { name: 'Simulate replacement dispatched' }).click();
    else if (label === 'Refund and prepare recovery') {
      await page.getByRole('button', { name: 'Simulate recovery submitted', exact: true }).click();
      await page.reload(); await page.getByRole('button', { name: 'Simulate recovery provider approved', exact: true }).click();
      assert((await page.locator('dl').innerText()).includes('Provider approved'));
      assert.equal(await page.locator('dd').filter({ hasText: '£0.00' }).count(), 4);
      await page.getByRole('button', { name: 'Simulate recovery received', exact: true }).click();
      await page.getByRole('button', { name: 'Simulate recovery matched', exact: true }).click();
      await page.getByRole('button', { name: 'Simulate recovery reconciled', exact: true }).click();
      assert.equal(await page.getByText('Sample walkthrough complete', { exact: true }).count(), 0);
      await page.getByRole('button', { name: 'Simulate refund observed', exact: true }).click();
      assert((await page.locator('dl').innerText()).includes('£98.00'));
    } else if (label === 'Escalate' || label === 'Request review') assert.equal(await page.getByText('Sample walkthrough complete', { exact: true }).count(), 0);
    await page.screenshot({ path: `${root}/${id}-${label.toLowerCase().replaceAll(' ','-')}.png`, fullPage: true });
    results.push(`branch: ${id}/${label}`);
  }
  await page.getByRole('button', { name: 'Legitimate claim', exact: true }).click();
  await page.getByRole('button', { name: '3. Outcome', exact: true }).click();
  assert(await page.getByRole('heading', { name: 'Simulated decision: Request review' }).count());
  await page.goBack(); await page.locator('[data-demo-step="inspect"]').waitFor(); assert(page.url().includes('step=inspect'));
  await page.goForward(); await page.locator('[data-demo-step="outcome"]').waitFor(); assert(page.url().includes('step=outcome'));
  await page.getByRole('button', { name: 'Reset this case', exact: true }).click();
  await go('case=recoverable&step=outcome'); assert((await page.locator('dl').innerText()).includes('£98.00'));
  results.push('cross-case isolation, Back/Forward and per-case reset');
  await go('case=invalid&step=outcome'); assert(page.url().includes('case=legitimate&step=inspect'));
  for (const [old, expected] of [['context','inspect'], ['sources','inspect'], ['incoming','inspect'], ['evidence','inspect'], ['recommendation','decide'], ['decision','decide'], ['recovery','decide']]) { await go(`step=${old}`); assert(page.url().includes(`step=${expected}`)); }
  await page.evaluate(() => localStorage.setItem('unauth:demo:merchant-cases-v2:legitimate', JSON.stringify({version:'old',caseId:'legitimate',progress:{decision:'refund',refundObserved:true}})));
  await go('case=legitimate&step=outcome'); assert(page.url().includes('step=decide'));
  results.push('invalid/legacy URLs and old version invalidation');
  for (const width of [1024,1280,1440]) {
    await page.setViewportSize({width,height:width === 1024 ? 600:720});
    await page.goto(`${base}/landing`); await page.getByRole('heading', { level:1 }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
    await page.screenshot({path:`${root}/landing-${width}.png`,fullPage:true});
    await go('case=legitimate&step=decide');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
    await page.screenshot({path:`${root}/demo-${width}.png`,fullPage:true});
  }
  results.push('1024/600, 1280/720, 1440/720 layout checks');
  for (const device of ['iPhone 13','iPad Pro 11']) {
    const portable = await browser.newContext({...devices[device]}); const p = await portable.newPage();
    await p.goto(`${base}/demo?case=duplicate&step=outcome`); await p.getByRole('heading',{name:'Open Unauth on a desktop'}).waitFor();
    assert.equal(await p.locator('[data-demo-case]').count(),0);
    await p.screenshot({path:`${root}/${device.replaceAll(' ','-')}.png`,fullPage:true}); await portable.close();
  }
  results.push('phone/tablet notice without demo mount');
  assert.equal(requests.filter(r => r.origin !== base || r.method !== 'GET' || r.path.startsWith('/api/')).length, 0);
  assert.deepEqual(errors, []);
  results.push('no external network, API requests or non-GET requests during demo; no browser errors');
} finally {
  writeFileSync(`${root}/receipt.json`,JSON.stringify({results,requests,errors},null,2));
  await browser.close();
}
console.log(JSON.stringify(results,null,2));
