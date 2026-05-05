import { test, expect } from '@playwright/test'
import { signIn, extractPageText } from '../utils/test-fixtures'

const MERCHANT_FACING_ROUTES = [
  '/dashboard', '/upload', '/history', '/customers', '/watchlist', '/inbox',
  '/chargebacks', '/lookup', '/help', '/help/how-it-works', '/help/csv-export',
  '/settings', '/settings/account', '/onboarding',
]

const BANNED_EXACT_WORDS = ['fraud score', 'fraud risk', 'flagged for fraud', 'fraud detection', 'fraud alert']
const BANNED_TECHNICAL_TERMS = ['entity resolution', 'signal weight', 'normalisation', 'heuristic', 'algorithm', 'hash', 'clustering threshold', 'k-anonymity']

test.describe('Content compliance — no fraud language', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  for (const route of MERCHANT_FACING_ROUTES) {
    test(`no banned language on ${route}`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const lowerText = (await extractPageText(page)).toLowerCase()

      expect(lowerText, `Found banned word "fraud" on ${route}`).not.toMatch(/\bfraud\b/)

      for (const phrase of BANNED_EXACT_WORDS) {
        expect(lowerText, `Found banned phrase "${phrase}" on ${route}`).not.toContain(phrase.toLowerCase())
      }

      for (const term of BANNED_TECHNICAL_TERMS) {
        expect(lowerText, `Found technical term "${term}" on ${route}`).not.toContain(term.toLowerCase())
      }

      if (lowerText.includes('match') || lowerText.includes('confidence')) {
        for (const term of ['fraud score', 'risk score', 'suspicion score']) {
          expect(lowerText, `Found non-canonical confidence term "${term}" on ${route}`).not.toContain(term)
        }
      }
    })
  }
})
