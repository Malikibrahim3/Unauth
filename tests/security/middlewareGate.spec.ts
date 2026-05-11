import { expect, test, type APIResponse } from '@playwright/test'
import { signIn } from '../utils/test-fixtures'

const REDIRECT_STATUSES = [307, 308]

const PROTECTED_ROUTES = [
  '/dashboard',
  '/customers',
  '/customers/not-a-real-customer',
  '/upload',
  '/audit/not-a-real-run',
  '/inbox',
  '/watchlist',
  '/saved',
  '/settings',
  '/chargebacks',
  '/help',
  '/onboarding',
  '/eval',
  '/network-metrics',
]

const PUBLIC_ROUTES = [
  '/login',
  '/demo',
  '/legal/privacy',
  '/legal/data-handling',
  '/api/demo/runs',
]

const STATIC_ASSET_ROUTES = [
  '/favicon.ico',
  '/_next/static/security-smoke.js',
  '/_next/image?url=%2Fmissing-security-smoke.png&w=64&q=75',
  '/missing-security-smoke.png',
]

function redirectTarget(response: APIResponse): URL {
  const location = response.headers().location
  expect(location).toBeTruthy()
  return new URL(location!, 'http://localhost:3000')
}

async function expectNoLoginRedirect(response: APIResponse, route: string) {
  if (!REDIRECT_STATUSES.includes(response.status())) return

  const location = response.headers().location
  if (!location) return

  expect(
    new URL(location, 'http://localhost:3000').pathname,
    `${route} should not be redirected to /login`
  ).not.toBe('/login')
}

test.describe('middleware auth gate', () => {
  test('logged out protected routes redirect to /login', async ({ request }) => {
    for (const route of PROTECTED_ROUTES) {
      const response = await request.get(route, { maxRedirects: 0 })

      expect(
        REDIRECT_STATUSES,
        `${route} should redirect before rendering`
      ).toContain(response.status())
      expect(redirectTarget(response).pathname, `${route} redirect target`).toBe('/login')
    }
  })

  test('logged out public and API routes are not sent to /login by middleware', async ({ request }) => {
    for (const route of PUBLIC_ROUTES) {
      const response = await request.get(route, { maxRedirects: 0 })

      await expectNoLoginRedirect(response, route)
    }
  })

  test('auth callback reaches the callback route instead of the login gate', async ({ request }) => {
    const response = await request.get('/callback', { maxRedirects: 0 })

    expect(REDIRECT_STATUSES).toContain(response.status())

    const target = redirectTarget(response)
    expect(target.pathname).toBe('/login')
    expect(target.searchParams.get('error')).toBe('auth_failed')
  })

  test('static assets are not redirected to /login', async ({ request }) => {
    for (const route of STATIC_ASSET_ROUTES) {
      const response = await request.get(route, { maxRedirects: 0 })

      await expectNoLoginRedirect(response, route)
    }
  })

  test('logged in users are redirected from /login to /dashboard', async ({ page }) => {
    await signIn(page)

    const response = await page.request.get('/login', { maxRedirects: 0 })

    expect(REDIRECT_STATUSES).toContain(response.status())
    expect(redirectTarget(response).pathname).toBe('/dashboard')
  })

  test('non-internal users are redirected away from internal routes', async ({ page }) => {
    await signIn(page)

    for (const route of ['/eval', '/network-metrics']) {
      const response = await page.request.get(route, { maxRedirects: 0 })

      expect(REDIRECT_STATUSES, `${route} should redirect`).toContain(response.status())
      expect(redirectTarget(response).pathname, `${route} redirect target`).toBe('/dashboard')
    }
  })
})
