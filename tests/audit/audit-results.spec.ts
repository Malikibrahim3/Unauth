import { test } from '@playwright/test'
import { signIn, extractPageText } from '../utils/test-fixtures'
import { evaluateMerchantExperience, assertEvaluation } from '../utils/ai-evaluator'

test.describe('Audit results', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('latest audit results are merchant-readable', async ({ page }) => {
    await page.goto('/history')
    await page.getByRole('link').first().click()
    await page.waitForURL('**/audit/**')
    const text = await extractPageText(page)
    const evaluation = await evaluateMerchantExperience({ pageDescription: 'Latest audit results page', extractedText: text }, [
      'The summary is easy to understand',
      'Recommended next steps are clear',
      'Amounts and counts are labelled plainly',
      'Confidence grade labels use only Definite, Probable, Possible, or Weak',
    ])
    assertEvaluation(evaluation, 'Latest audit results', 75)
  })
})
