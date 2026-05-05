import { test, expect } from '@playwright/test'
import { signIn, getFirstCustomerId, generateEvidencePackage } from '../utils/test-fixtures'

test.describe('Evidence generation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('merchant can generate an evidence package', async ({ page }) => {
    const customerId = await getFirstCustomerId(page)
    const packageId = await generateEvidencePackage(page, customerId)
    expect(packageId).toBeTruthy()
    await expect(page.getByText(/UNAUTH-/)).toBeVisible()
  })
})
