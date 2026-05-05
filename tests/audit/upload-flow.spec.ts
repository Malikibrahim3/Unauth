import { test, expect } from '@playwright/test'
import { signIn, extractPageText, uploadCSV } from '../utils/test-fixtures'
import { evaluateMerchantExperience, assertEvaluation } from '../utils/ai-evaluator'

test.describe('Upload flow', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('minimal CSV shows data quality warning', async ({ page }) => {
    await page.goto('/upload')
    await page.locator('input[type="file"]').setInputFiles(`${__dirname}/../utils/csv-fixtures/minimal.csv`)
    await page.waitForSelector('[data-testid="column-mapping"], text=Column mapping')
    const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next")')
    if (await continueButton.isVisible({ timeout: 1000 })) await continueButton.click()
    const text = await extractPageText(page)
    const evaluation = await evaluateMerchantExperience({ pageDescription: 'Data quality warning banner', extractedText: text }, [
      'The merchant understands their data is limited without technical explanation',
      'There is specific guidance on what fields to add',
      'The merchant can still proceed without being blocked',
      'The language is helpful and not alarming',
      'No technical terms like "entity", "signal", or "hash" appear',
    ])
    assertEvaluation(evaluation, 'Data quality warning', 70)
  })

  test('upload context fields save correctly', async ({ page }) => {
    const label = 'Audit context test'
    await uploadCSV(page, 'minimal', { label, dateRangeStart: '2026-01-01', dateRangeEnd: '2026-01-31', uploadType: 'historical' })
    await page.goto('/history')
    await expect(page.getByText(label)).toBeVisible()
  })

  test('investigation upload type shows correct messaging', async ({ page }) => {
    await page.goto('/upload')
    await page.locator('input[type="file"]').setInputFiles(`${__dirname}/../utils/csv-fixtures/investigation.csv`)
    await page.waitForSelector('[data-testid="column-mapping"], text=Column mapping')
    const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next")')
    if (await continueButton.isVisible({ timeout: 1000 })) await continueButton.click()
    const typeSelector = page.locator('[data-testid="upload-type-investigation"]')
    if (await typeSelector.isVisible({ timeout: 2000 })) await typeSelector.click()
    const noteText = await extractPageText(page)
    const evaluation = await evaluateMerchantExperience({ pageDescription: 'Investigation upload type note', extractedText: noteText }, [
      'The merchant understands this upload type is for a specific customer',
      'The description is in plain English',
      'The merchant knows what will happen to the results',
    ])
    assertEvaluation(evaluation, 'Investigation upload note', 70)
  })
})
