import { test, expect } from '@playwright/test'
import { signIn, extractPageText } from '../utils/test-fixtures'
import { evaluateMerchantExperience, assertEvaluation } from '../utils/ai-evaluator'

test.describe('Investigation workflow', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('investigation status changes and logs activity', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForSelector('[data-testid="customer-row"]')
    await page.locator('[data-testid="customer-row"]').first().click()
    await page.waitForSelector('[data-testid="customer-profile"], [data-testid="customer-drawer"]', { timeout: 10000 })
    const statusSelect = page.locator('[data-testid="investigation-status"]')
    await expect(statusSelect).toBeVisible()
    await statusSelect.selectOption('under_review')
    await page.waitForResponse(res => res.url().includes('/api/customers') && res.status() === 200)
    const fullText = await extractPageText(page)
    expect(fullText.toLowerCase()).toContain('under review')
    const evaluation = await evaluateMerchantExperience({ pageDescription: 'Customer profile with updated investigation status', extractedText: fullText }, [
      'The investigation status is clearly visible and shows "Under review"',
      'The activity log shows the status change in plain English',
      'The timeline is chronological and readable',
      'A non-technical merchant would understand what has happened with this customer',
    ])
    assertEvaluation(evaluation, 'Investigation status and activity log', 70)
  })

  test('all five investigation statuses are available', async ({ page }) => {
    await page.goto('/customers')
    await page.locator('[data-testid="customer-row"]').first().click()
    await page.waitForSelector('[data-testid="investigation-status"]')
    const options = await page.locator('[data-testid="investigation-status"] option').allTextContents()
    expect(options.map(o => o.toLowerCase())).toContain('new')
    expect(options.map(o => o.toLowerCase())).toContain('under review')
    expect(options.map(o => o.toLowerCase())).toContain('contacted')
    expect(options.map(o => o.toLowerCase())).toContain('resolved')
    expect(options.map(o => o.toLowerCase())).toContain('cleared')
  })
})
