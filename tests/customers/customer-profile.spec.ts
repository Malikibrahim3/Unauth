import { test } from '@playwright/test'
import { signIn, getFirstCustomerId, openCustomerProfile } from '../utils/test-fixtures'
import { evaluateMerchantExperience, assertEvaluation } from '../utils/ai-evaluator'

test.describe('Customer profile', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('profile explains customer activity clearly', async ({ page }) => {
    const customerId = await getFirstCustomerId(page)
    const text = await openCustomerProfile(page, customerId)
    const evaluation = await evaluateMerchantExperience({ pageDescription: 'Customer profile detail page', extractedText: text }, [
      'The page explains why this customer needs review',
      'The order history is understandable',
      'Any linked customer information is factual and plain English',
      'The merchant can see what action to take next',
    ])
    assertEvaluation(evaluation, 'Customer profile detail', 75)
  })
})
