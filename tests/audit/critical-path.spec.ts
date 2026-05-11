import { test, expect } from '@playwright/test'
import {
  extractPageText,
  generateEvidencePackage,
  getFirstCustomerId,
  signIn,
  uploadCSV,
  waitForProcessing,
} from '../utils/test-fixtures'
import { evaluateMerchantExperience, assertEvaluation } from '../utils/ai-evaluator'
import path from 'path'

test.describe('Critical path — merchant first use', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('dashboard loads and shows meaningful content', async ({ page }) => {
    await page.goto('/dashboard')
    const text = await extractPageText(page)
    const evaluation = await evaluateMerchantExperience({ pageDescription: 'Main dashboard', extractedText: text }, [
      'The page clearly communicates what the product does if there are no audits yet',
      'There is a clear call to action for uploading a CSV',
      'No technical jargon is visible',
      'The page would make sense to a non-technical ecommerce merchant',
    ])
    assertEvaluation(evaluation, 'Dashboard initial state', 75)
  })

  test('CSV upload flow completes end to end', async ({ page }) => {
    await page.goto('/upload')
    await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, '../utils/csv-fixtures/standard.csv'))
    await page.waitForSelector('[data-testid="column-mapping"], text=Column mapping', { timeout: 15000 })

    const mappingText = await extractPageText(page)
    const mappingEval = await evaluateMerchantExperience({ pageDescription: 'CSV column mapping screen', extractedText: mappingText }, [
      'Each field has a plain English label explaining what it is',
      'Required fields are clearly distinguished from optional fields',
      'The merchant understands what to do without reading documentation',
      'There is no technical jargon in field names or descriptions',
    ])
    assertEvaluation(mappingEval, 'Column mapping UI', 70)

    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")')
    if (await continueBtn.isVisible({ timeout: 1000 })) await continueBtn.click()

    const labelInput = page.locator('[data-testid="upload-label"]')
    if (await labelInput.isVisible({ timeout: 2000 })) await labelInput.fill('Playwright test upload')

    await page.getByRole('button', { name: /upload|analyse|analyze|process/i }).click()
    await waitForProcessing(page, 180000)
    expect(page.url()).toContain('/audit/')

    const resultsText = await extractPageText(page)
    expect(resultsText.toLowerCase()).not.toContain('error')
    expect(resultsText.toLowerCase()).not.toContain('something went wrong')
  })

  test('audit results page is meaningful and clear', async ({ page }) => {
    await page.goto('/history')
    await page.getByRole('link').first().click()
    await page.waitForURL('**/audit/**')

    const resultsText = await extractPageText(page)
    const evaluation = await evaluateMerchantExperience({ pageDescription: 'Audit results page after processing', extractedText: resultsText }, [
      'The page immediately communicates how many customers were flagged',
      'Risk/confidence levels are explained in plain English',
      'The merchant knows what to do next without being told explicitly',
      'Confidence grade labels use only: Definite, Probable, Possible, Weak',
      'No technical terms like signal, entity, hash, or algorithm are visible',
      'The estimated exposure figure is clearly labelled and explained',
    ])
    assertEvaluation(evaluation, 'Audit results page', 75)
  })

  test('customer profile opens and shows coherent intelligence', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForSelector('[data-testid="customers-table"], [data-testid="customer-row"]', { timeout: 10000 })
    await page.locator('[data-testid="customer-row"]').first().click()
    await page.waitForSelector('[data-testid="customer-drawer"], [data-testid="customer-profile"]', { timeout: 10000 })

    const profileText = await extractPageText(page)
    const evaluation = await evaluateMerchantExperience({ pageDescription: 'Customer intelligence profile', extractedText: profileText }, [
      'The identity match information is explained in plain English',
      'The behavioral context uses factual language only — no inference about intent',
      'The merchant can immediately understand what this customer has done',
      'The activity log or order history is visible and chronological',
      'The investigation status is visible and changeable',
      'There is a clear option to generate a chargeback evidence package',
      'Confidence grade uses only: Definite, Probable, Possible, or Weak',
    ])
    assertEvaluation(evaluation, 'Customer profile', 75)
  })

  test('upload to customers to evidence generation completes', async ({ page }) => {
    const runId = await uploadCSV(page, 'rich', {
      label: `Critical evidence flow ${Date.now()}`,
    })
    expect(runId).toBeTruthy()

    const customerId = await getFirstCustomerId(page)
    await page.goto(`/customers/${customerId}`)
    await expect(page.getByRole('link', { name: /generate evidence/i }).first()).toBeVisible()

    const packageId = await generateEvidencePackage(page, customerId)
    expect(packageId).toBeTruthy()
    await expect(page.getByText(/UNAUTH-/)).toBeVisible()
  })

  test('critical path works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/dashboard')
    const dashText = await extractPageText(page)
    const evaluation = await evaluateMerchantExperience({ pageDescription: 'Dashboard on mobile (iPhone 13 viewport)', extractedText: dashText }, [
      'Navigation is accessible on a small screen',
      'The primary call to action is visible without scrolling or is clearly reachable',
      'No content is cut off or unreadable',
      'The page is usable without a keyboard',
    ])
    assertEvaluation(evaluation, 'Mobile dashboard', 70)
  })
})
