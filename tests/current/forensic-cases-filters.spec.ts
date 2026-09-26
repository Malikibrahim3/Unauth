import { expect, test } from '@playwright/test';

for (const width of [1440, 1024]) {
  test(`Cases filters preserve scope and modal lifecycle · ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/cases?sort=value');
    const trigger = page.getByRole('button', { name: /^(Filters|Type: all)/ });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Filter cases' });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/sort=value/);
    await expect.poll(() => dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Shift+Tab');
    await expect.poll(() => dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Tab');
    await expect.poll(() => dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const violations = await page.evaluate(async () => (await (window as any).axe.run('[role="dialog"]')).violations);
    expect(violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('filter-drawer.png') });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await dialog.locator('..').click({ position: { x: 4, y: 4 } });
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await page.getByRole('button', { name: 'Owner: anyone' }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('link', { name: 'Unassigned', exact: true }).click();
    await expect(page).toHaveURL(/owner=unassigned/);
    expect(new URL(page.url()).searchParams.get('sort')).toBe('value');
    expect(new URL(page.url()).searchParams.get('page')).toBe('1');
    await expect(page.getByRole('button', { name: 'Owner: unassigned' })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Owner: unassigned' }).click();
    await expect(dialog.getByRole('link', { name: 'Unassigned', exact: true })).toHaveAttribute('aria-current', 'true');
    await dialog.getByRole('link', { name: 'Clear all filters' }).click();
    await expect(page).toHaveURL(/\/cases$/);
    await expect(page.getByRole('button', { name: 'Owner: anyone' })).toBeVisible();
    await expect(dialog).toBeHidden();
    await page.screenshot({ path: testInfo.outputPath('filters-cleared.png') });
  });

  test(`Cases queue labels and active state survive navigation and reload · ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/cases');
    const nav = page.getByRole('navigation', { name: 'Case work states' });
    await expect(nav.getByRole('link', { name: 'Needs action', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link')).toHaveCount(3);
    await nav.getByRole('link', { name: 'Needs evidence', exact: true }).click();
    await expect(page).toHaveURL(/queue=needs_evidence/);
    await expect(nav.getByRole('link', { name: 'Needs evidence', exact: true })).toHaveAttribute('aria-current', 'page');
    await page.reload();
    await expect(nav.locator('[aria-current="page"]')).toHaveText('Needs evidence');
    await nav.getByRole('link', { name: 'Ready for decision', exact: true }).click();
    await expect(page).toHaveURL(/queue=ready_for_decision/);
    await expect(nav.locator('[aria-current="page"]')).toHaveText('Ready for decision');
    await page.screenshot({ path: testInfo.outputPath('queue-selected.png') });
    await page.goBack();
    await expect(nav.locator('[aria-current="page"]')).toHaveText('Needs evidence');
    await nav.getByRole('link', { name: 'Needs action', exact: true }).click();
    await expect(nav.locator('[aria-current="page"]')).toHaveText('Needs action');
    await page.getByText('Daily case counts', { exact: true }).click();
    const table = page.getByRole('region', { name: 'Daily case count table' });
    await expect(table).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Date (UTC)' })).toBeVisible();
    expect(await table.getByRole('row').count()).toBeGreaterThan(1);
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    expect(await page.evaluate(async () => (await (window as any).axe.run('details')).violations)).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('daily-counts-expanded.png') });
  });
}

 test('Empty filtered Cases uses full width and keeps its return action reachable in a short window', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 400 });
    await page.goto('/cases?search=forensic-no-match-953fecc1');
    const empty = page.locator('[data-state-id="cases-empty-filter-states"]');
    await expect(empty).toBeVisible();
    const chart = page.getByText('Daily case counts', { exact: true });
    await expect(chart).toBeVisible();
    const layout = await empty.evaluate(node => {
      const body = node.parentElement!.parentElement!;
      return { rightPadding: parseFloat(getComputedStyle(body).paddingRight), overflow: getComputedStyle(body).overflowY };
    });
    expect(layout.rightPadding).toBeLessThan(50);
    expect(layout.overflow).toBe('auto');
    await page.getByRole('link', { name: 'View recorded outcomes' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('link', { name: 'View recorded outcomes' })).toBeInViewport();
    await page.getByRole('link', { name: 'View recorded outcomes' }).click();
    await expect(page).toHaveURL(/queue=history/);
 });
