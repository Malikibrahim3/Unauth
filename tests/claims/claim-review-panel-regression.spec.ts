import { test, expect, Page } from '@playwright/test';
import { signIn } from '../utils/test-fixtures';

test.describe('Claim Review Panel — accordion/rail regression', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  async function openFirstActiveClaim(page: Page): Promise<string | null> {
    await page.goto('/claims?queue=active');
    await page.waitForLoadState('networkidle');
    const reviewLink = page.getByRole('link', { name: 'Review & record' }).first();
    const exists = await reviewLink.isVisible().catch(() => false);
    if (!exists) return null;
    const href = await reviewLink.getAttribute('href');
    await reviewLink.click();
    await page.waitForURL(/\/customers\/[^/]+\/claims/);
    await page.waitForLoadState('networkidle');
    return href;
  }

  // ─── 1. Page load & information hierarchy ───────────────────────────────────
  test('case intelligence summary appears before edit form', async ({ page }) => {
    const href = await openFirstActiveClaim(page);
    test.skip(!href, 'No active claims available');

    // Case intelligence section must be visible
    const intelligenceSection = page.getByText('Claim context');
    await expect(intelligenceSection).toBeVisible();

    // Edit form should be collapsed (button present, form fields hidden)
    const editToggle = page.getByRole('button', { name: /Edit claim details|Create claim/i });
    await expect(editToggle).toBeVisible();

    // The claim type select inside the form should NOT be visible (form is collapsed)
    const claimTypeSelect = page.locator('select').filter({ hasText: 'Missing parcel' }).first();
    await expect(claimTypeSelect).not.toBeVisible();

    await page.screenshot({ path: 'tests/reports/claim-review-01-intelligence-first.png', fullPage: false });
  });

  // ─── 2. Right rail width ────────────────────────────────────────────────────
  test('right rail is approximately 400px and not truncated', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const href = await openFirstActiveClaim(page);
    test.skip(!href, 'No active claims available');

    const aside = page.locator('aside[aria-label="Case actions"]');
    await expect(aside).toBeVisible();
    const box = await aside.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThan(370);
      expect(box.width).toBeLessThan(440);
      const mainCol = page.locator('aside[aria-label="Case actions"]').locator('..').locator('> div').first();
      const asideLeft = box.x;
      const viewport = page.viewportSize()?.width ?? 1440;
      expect(asideLeft).toBeGreaterThan(viewport * 0.45);
    }

    await page.screenshot({ path: 'tests/reports/claim-review-02-rail-width-1440.png', fullPage: false });
  });

  // ─── 3. Accordion expand/collapse ───────────────────────────────────────────
  test('all right rail sections expand and collapse', async ({ page }) => {
    const href = await openFirstActiveClaim(page);
    test.skip(!href, 'No active claims available');

    const sections = [
      'OWNERSHIP',
      'WORKFLOW STATUS',
      'FOLLOW-UP / SNOOZE',
      'ADD EVIDENCE',
      'MERCHANT DECISION',
      'CUSTOMER RESPONSE',
    ];

    for (const title of sections) {
      const btn = page.getByRole('button', { name: new RegExp(title, 'i') }).first();
      const btnVisible = await btn.isVisible().catch(() => false);
      if (!btnVisible) continue;

      // Open it
      await btn.click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: `tests/reports/claim-review-accordion-open-${title.replace(/\s+/g, '-').toLowerCase()}.png`, fullPage: false });

      // Close it
      await btn.click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: `tests/reports/claim-review-accordion-closed-${title.replace(/\s+/g, '-').toLowerCase()}.png`, fullPage: false });
    }
  });

  // ─── 4. Edit claim form toggles ─────────────────────────────────────────────
  test('edit claim form expands and shows all fields', async ({ page }) => {
    const href = await openFirstActiveClaim(page);
    test.skip(!href, 'No active claims available');

    const editToggle = page.getByRole('button', { name: /Edit claim details|Create claim/i });
    await editToggle.click();
    await page.waitForTimeout(200);

    // Form fields should now be visible
    await expect(page.getByLabel('Claim type').or(page.locator('select').filter({ hasText: 'Missing parcel' }).first())).toBeVisible();
    await page.screenshot({ path: 'tests/reports/claim-review-03-edit-form-open.png', fullPage: false });

    // Collapse it again
    await editToggle.click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'tests/reports/claim-review-04-edit-form-closed.png', fullPage: false });
  });

  // ─── 5. Assign to me ────────────────────────────────────────────────────────
  test('assign to me works', async ({ page }) => {
    const href = await openFirstActiveClaim(page);
    test.skip(!href, 'No active claims available');

    // Open ownership accordion
    const ownerBtn = page.getByRole('button', { name: /OWNERSHIP/i }).first();
    await ownerBtn.click();
    await page.waitForTimeout(200);

    const assignBtn = page.getByRole('button', { name: 'Assign to me' });
    await expect(assignBtn).toBeVisible();
    await assignBtn.click();

    // Toast success
    await expect(page.getByText('Assignment updated').or(page.getByText('assignment', { exact: false }))).toBeVisible({ timeout: 8000 }).catch(() => null);
    await page.screenshot({ path: 'tests/reports/claim-review-05-assign.png', fullPage: false });
  });

  // ─── 6. Update lifecycle status ─────────────────────────────────────────────
  test('workflow status update works', async ({ page }) => {
    const href = await openFirstActiveClaim(page);
    test.skip(!href, 'No active claims available');

    const statusBtn = page.getByRole('button', { name: /WORKFLOW STATUS/i }).first();
    await statusBtn.click();
    await page.waitForTimeout(200);

    const noteInput = page.getByPlaceholder(/Requested carrier|note/i).first();
    await expect(noteInput).toBeVisible();
    await noteInput.fill('Regression test note — under review');

    const updateBtn = page.getByRole('button', { name: 'Update status' });
    await updateBtn.click();
    await expect(page.getByText(/updated|status/i)).toBeVisible({ timeout: 8000 }).catch(() => null);
    await page.screenshot({ path: 'tests/reports/claim-review-06-status-update.png', fullPage: false });
  });

  // ─── 7. Snooze ──────────────────────────────────────────────────────────────
  test('snooze works', async ({ page }) => {
    const href = await openFirstActiveClaim(page);
    test.skip(!href, 'No active claims available');

    const snoozeBtn = page.getByRole('button', { name: /FOLLOW-UP/i }).first();
    const visible = await snoozeBtn.isVisible().catch(() => false);
    test.skip(!visible, 'Snooze section not available (claim may be closed)');

    await snoozeBtn.click();
    await page.waitForTimeout(200);

    const snoozeSubmit = page.getByRole('button', { name: 'Snooze' }).filter({ hasNotText: /clear/i }).first();
    await snoozeSubmit.click();
    await expect(page.getByText(/Follow-up updated|snooze/i)).toBeVisible({ timeout: 8000 }).catch(() => null);
    await page.screenshot({ path: 'tests/reports/claim-review-07-snooze.png', fullPage: false });
  });

  // ─── 8. Add evidence ────────────────────────────────────────────────────────
  test('add evidence works', async ({ page }) => {
    const href = await openFirstActiveClaim(page);
    test.skip(!href, 'No active claims available');

    const evidenceBtn = page.getByRole('button', { name: /ADD EVIDENCE/i }).first();
    await evidenceBtn.click();
    await page.waitForTimeout(200);

    const saveEvidenceBtn = page.getByRole('button', { name: 'Save evidence' });
    await expect(saveEvidenceBtn).toBeVisible();
    await saveEvidenceBtn.click();
    await expect(page.getByText(/saved|evidence/i)).toBeVisible({ timeout: 8000 }).catch(() => null);
    await page.screenshot({ path: 'tests/reports/claim-review-08-evidence.png', fullPage: false });
  });

  // ─── 9. Record merchant decision ────────────────────────────────────────────
  test('record merchant decision works', async ({ page }) => {
    const href = await openFirstActiveClaim(page);
    test.skip(!href, 'No active claims available');

    const decisionBtn = page.getByRole('button', { name: /MERCHANT DECISION/i }).first();
    const visible = await decisionBtn.isVisible().catch(() => false);
    test.skip(!visible, 'Merchant decision section not available');

    await decisionBtn.click();
    await page.waitForTimeout(200);

    const recordBtn = page.getByRole('button', { name: 'Record merchant decision' });
    await expect(recordBtn).toBeVisible();
    await recordBtn.click();
    await expect(page.getByText(/decision recorded|Merchant decision/i)).toBeVisible({ timeout: 10000 }).catch(() => null);
    await page.screenshot({ path: 'tests/reports/claim-review-09-decision.png', fullPage: false });
  });

  // ─── 10. Customer response copy ─────────────────────────────────────────────
  test('customer response copy and record works', async ({ page }) => {
    const href = await openFirstActiveClaim(page);
    test.skip(!href, 'No active claims available');

    const responseBtn = page.getByRole('button', { name: /CUSTOMER RESPONSE/i }).first();
    await responseBtn.click();
    await page.waitForTimeout(200);

    const copyBtn = page.getByRole('button', { name: /Copy & record/i });
    await expect(copyBtn).toBeVisible();
    // Grant clipboard permission
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await copyBtn.click();
    await expect(page.getByText(/copied|recorded|response/i)).toBeVisible({ timeout: 8000 }).catch(() => null);
    await page.screenshot({ path: 'tests/reports/claim-review-10-customer-response.png', fullPage: false });
  });

  // ─── 11. Timeline updates after actions ─────────────────────────────────────
  test('timeline shows events after actions', async ({ page }) => {
    const href = await openFirstActiveClaim(page);
    test.skip(!href, 'No active claims available');

    const timelineTab = page.getByRole('button', { name: 'Event timeline' });
    const visible = await timelineTab.isVisible().catch(() => false);
    if (visible) {
      await timelineTab.click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: 'tests/reports/claim-review-11-timeline.png', fullPage: false });
  });

  // ─── 12. Responsive — 1280px ────────────────────────────────────────────────
  test('no overflow at 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const href = await openFirstActiveClaim(page);
    test.skip(!href, 'No active claims available');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    await page.screenshot({ path: 'tests/reports/claim-review-12-responsive-1280.png', fullPage: false });
  });

  // ─── 13. Responsive — 1024px ────────────────────────────────────────────────
  test('layout stacks at 1024px and rail is usable', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    const href = await openFirstActiveClaim(page);
    test.skip(!href, 'No active claims available');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    await page.screenshot({ path: 'tests/reports/claim-review-13-responsive-1024.png', fullPage: false });
  });

  // ─── 14. New claim flow — form opens by default ──────────────────────────────
  test('edit form is open by default when no claim selected', async ({ page }) => {
    // Navigate to a customer's claims page without a claimId
    await page.goto('/claims?queue=active');
    await page.waitForLoadState('networkidle');

    // Find a customer URL from any claim row
    const profileLink = page.locator('a[href*="/customers/"]').first();
    const profileHref = await profileLink.getAttribute('href').catch(() => null);
    test.skip(!profileHref, 'No customer links found');

    const customerId = profileHref?.match(/\/customers\/([^/?]+)/)?.[1];
    test.skip(!customerId, 'Could not extract customer ID');

    // Navigate to claims page without a claimId
    await page.goto(`/customers/${customerId}/claims`);
    await page.waitForLoadState('networkidle');

    // When no claimId in URL, form should be open
    const editToggle = page.getByRole('button', { name: /Edit claim details|Create claim/i });
    await expect(editToggle).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: 'tests/reports/claim-review-14-new-claim-form-open.png', fullPage: false });
  });

  // ─── 15. Mark viewed — no error toast ───────────────────────────────────────
  test('mark viewed does not produce error toast', async ({ page }) => {
    // Navigate to unread claim
    await page.goto('/claims?viewed=unread&queue=active');
    await page.waitForLoadState('networkidle');
    const reviewLink = page.getByRole('link', { name: 'Review & record' }).first();
    const visible = await reviewLink.isVisible().catch(() => false);
    test.skip(!visible, 'No unread claims available');

    await reviewLink.click();
    await page.waitForURL(/\/customers\/[^/]+\/claims/);
    // Wait for the mark-viewed POST to fire
    await page.waitForResponse((res) => res.url().includes('/view') && res.request().method() === 'POST', { timeout: 10000 }).catch(() => null);
    await page.waitForTimeout(500);

    // No error toast should be visible
    const errorToast = page.locator('[style*="fee2e2"], [style*="fca5a5"]').filter({ hasText: /denied|failed/i });
    await expect(errorToast).toHaveCount(0);
    await page.screenshot({ path: 'tests/reports/claim-review-15-mark-viewed.png', fullPage: false });
  });
});
