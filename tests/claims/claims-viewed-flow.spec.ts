import { test, expect } from '@playwright/test';
import { signIn } from '../utils/test-fixtures';

test.describe('Claims viewed / unread flow', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('opening a claim decreases new/unread counts and keeps it in active queue', async ({ page }) => {
    await page.goto('/claims');
    await page.waitForLoadState('networkidle');

    const unreadKpi = page.getByText('New evidence found').locator('..');
    const activeKpi = page.getByText('Reviews needing evidence').locator('..');
    const unreadBeforeText = await unreadKpi.innerText();
    const activeBeforeText = await activeKpi.innerText();
    const unreadBefore = parseInt((unreadBeforeText.match(/\d+/) ?? ['0'])[0], 10);
    const activeBefore = parseInt((activeBeforeText.match(/\d+/) ?? ['0'])[0], 10);

    test.skip(unreadBefore === 0, 'No unread claims available to exercise viewed flow');

    await page.goto('/claims?viewed=unread&queue=active');
    const reviewLink = page.getByRole('link', { name: 'Review evidence' }).first();
    await expect(reviewLink).toBeVisible();
    const claimHref = await reviewLink.getAttribute('href');
    expect(claimHref).toBeTruthy();

    await reviewLink.click();
    await page.waitForURL(/\/customers\/[^/]+\/claims/);
    await page.waitForResponse((res) => res.url().includes('/view') && res.request().method() === 'POST', { timeout: 15000 }).catch(() => null);

    await page.goto('/claims');
    await page.waitForLoadState('networkidle');

    const unreadAfter = parseInt(((await unreadKpi.innerText()).match(/\d+/) ?? ['0'])[0], 10);
    const activeAfter = parseInt(((await activeKpi.innerText()).match(/\d+/) ?? ['0'])[0], 10);

    expect(unreadAfter).toBe(unreadBefore - 1);
    expect(activeAfter).toBe(activeBefore);

    await page.goto('/claims?viewed=unread&queue=active');
    if (claimHref) {
      await expect(page.locator(`a[href="${claimHref}"]`)).toHaveCount(0);
    }

    await page.goto('/claims?queue=active');
    if (claimHref) {
      await expect(page.locator(`a[href="${claimHref}"]`)).toHaveCount(1);
    }
  });
});
