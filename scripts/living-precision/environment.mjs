/**
 * Phase 28's recorded release-capture environment.
 *
 * Keep the Playwright package and image tag in exact lockstep. The image
 * digest is the multi-architecture manifest digest published by MCR for the
 * pinned tag; the capture manifest also records Chromium's runtime version.
 */
export const LIVING_PRECISION_ENVIRONMENT = Object.freeze({
  schemaVersion: 1,
  clock: '2026-07-26T12:00:00.000Z',
  locale: 'en-GB',
  timezoneId: 'Europe/London',
  colorScheme: 'light',
  viewport: Object.freeze({ width: 1440, height: 900 }),
  edgeViewport: Object.freeze({ width: 1024, height: 900 }),
  flagshipViewports: Object.freeze([
    Object.freeze({ width: 1440, height: 900 }),
    Object.freeze({ width: 1280, height: 800 }),
    Object.freeze({ width: 1024, height: 900 }),
  ]),
  deviceScaleFactor: 2,
  browser: 'chromium',
  playwrightVersion: '1.59.1',
  container: Object.freeze({
    image: 'mcr.microsoft.com/playwright:v1.59.1-noble',
    manifestDigest: 'sha256:b0ab6f3cb99aa7803adbc14d9027ec1785fc6e433b97e134e0f8fe61683b6b53',
  }),
  pixelDiff: Object.freeze({
    channelThreshold: 0.2,
    maximumChangedPixelRatio: 0.001,
  }),
});

export const RELEASE_CAPTURE_ENV_KEYS = Object.freeze({
  baseUrl: 'LIVING_PRECISION_BASE_URL',
  developmentBaseUrl: 'LIVING_PRECISION_DEVELOPMENT_BASE_URL',
  authSecret: 'E2E_AUTH_SECRET',
  containerDigest: 'LIVING_PRECISION_CONTAINER_DIGEST',
  outputRoot: 'LIVING_PRECISION_OUTPUT_ROOT',
  approvedScorecards: 'LIVING_PRECISION_APPROVED_SCORECARDS',
  appCommit: 'LIVING_PRECISION_APP_COMMIT',
});
