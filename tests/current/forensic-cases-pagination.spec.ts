import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 720 }, { width: 1280, height: 600 }]) {
  test(`Cases page boundaries and later-row preview at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/cases');
    const rows = page.locator('[data-case-id]');
    await expect(rows).toHaveCount(25);
    const firstPage = await rows.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-case-id')));
    const footer = page.getByText(/^25 of [\d,]+ in this queue$/);
    await expect(footer).toBeVisible();
    const total = Number((await footer.innerText()).match(/of ([\d,]+)/)![1].replaceAll(',', ''));
    expect(total).toBeGreaterThan(25);
    const table = page.getByRole('table', { name: 'Cases', exact: true });
    await table.hover();
    await page.mouse.wheel(0, 3000);
    await expect(rows.last()).toBeInViewport();
    const closedWidth = (await table.boundingBox())!.width;
    await rows.last().focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('link', { name: 'Open case review' })).toHaveAttribute('href', `/cases/${firstPage[24]}`);
    await page.getByRole('button', { name: 'Close case preview' }).click();
    await expect(page.getByRole('button', { name: 'Close case preview' })).toHaveCount(0);
    expect(Math.abs((await table.boundingBox())!.width - closedWidth)).toBeLessThan(1);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    const nextCount = Math.min(25, total - 25);
    await expect(rows).toHaveCount(nextCount);
    const secondPage = await rows.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-case-id')));
    const allIds = [...firstPage, ...secondPage];
    expect(new Set(allIds).size).toBe(25 + nextCount);
    await expect(page.getByText(`${nextCount} of ${total.toLocaleString('en-GB')} in this queue`)).toBeVisible();
    await page.reload();
    await expect(rows).toHaveCount(nextCount);
    await expect(page.getByRole('button', { name: 'Close case preview' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await expect(rows).toHaveCount(25);
    expect(await rows.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-case-id')))).toEqual(firstPage);
    // Retained audit fixtures may grow the queue. Verify every further page
    // without assuming the original 40-record fixture total remains fixed.
    if (total > 50) {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page).toHaveURL(/page=2/);
      for (let number = 3; number <= Math.ceil(total / 25); number += 1) {
        await page.getByRole('button', { name: 'Next', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`page=${number}(?:&|$)`));
        await expect(rows).toHaveCount(Math.min(25, total - (number - 1) * 25));
        allIds.push(...await rows.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-case-id'))));
      }
    }
    expect(new Set(allIds).size).toBe(total);
  });
}
