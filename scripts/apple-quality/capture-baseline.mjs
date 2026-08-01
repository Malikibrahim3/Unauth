import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.APPLE_QUALITY_BASE_URL ?? 'http://127.0.0.1:3000';
const authSecret = process.env.E2E_AUTH_SECRET;
const merchantId = process.env.E2E_MERCHANT_ID;
const outputDirectory = path.resolve(
  process.cwd(),
  process.env.APPLE_QUALITY_OUTPUT_ROOT
    ?? 'artifacts/apple-quality/baseline-2026-07-30',
);

if (!authSecret || !merchantId) {
  throw new Error('E2E_AUTH_SECRET and E2E_MERCHANT_ID are required');
}

const allViewports = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1024x900', width: 1024, height: 900 },
];
const requestedViewportNames = new Set(
  (process.env.APPLE_QUALITY_VIEWPORTS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const viewports = requestedViewportNames.size > 0
  ? allViewports.filter((viewport) => requestedViewportNames.has(viewport.name))
  : allViewports;
const requestedRouteNames = new Set(
  (process.env.APPLE_QUALITY_ROUTES ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const settleMs = Math.max(
  0,
  Number(process.env.APPLE_QUALITY_SETTLE_MS ?? 2_000) || 2_000,
);
const theme = process.env.APPLE_QUALITY_THEME === 'dark' ? 'dark' : 'light';
const allowDegraded = process.env.APPLE_QUALITY_ALLOW_DEGRADED === '1';

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch();
const manifest = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  outputDirectory,
  allowDegraded,
  captures: [],
};

try {
  const authContext = await browser.newContext();
  const authPage = await authContext.newPage();
  const authUrl = new URL('/api/test/e2e-auth', baseUrl);
  authUrl.searchParams.set('secret', authSecret);
  authUrl.searchParams.set('merchant_id', merchantId);
  authUrl.searchParams.set('redirect', '/legal/privacy?apple_quality_auth=ready');
  const authResponse = await authPage.goto(authUrl.toString(), {
    waitUntil: 'domcontentloaded',
    timeout: 180_000,
  });
  if (!authResponse?.ok() || !authPage.url().includes('apple_quality_auth=ready')) {
    throw new Error(`E2E authentication failed with HTTP ${authResponse?.status() ?? 'unknown'}`);
  }
  const storageState = await authContext.storageState();
  await authContext.close();

  let casePath = null;
  {
    const discovery = await browser.newContext({
      storageState,
      viewport: { width: 1440, height: 900 },
      colorScheme: theme,
      reducedMotion: 'reduce',
    });
    await discovery.addInitScript((selectedTheme) => {
      localStorage.setItem('unauth.theme', selectedTheme);
    }, theme);
    const page = await discovery.newPage();
    await page.goto(new URL('/claims?capture=1', baseUrl).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await page.waitForTimeout(2_000);
    casePath = await page.locator('a[href^="/claims/"]').first().getAttribute('href');
    await discovery.close();
  }

  const allRoutes = [
    { name: 'overview', path: '/dashboard?capture=1' },
    { name: 'work', path: '/work?capture=1' },
    { name: 'cases', path: '/claims?capture=1' },
    { name: 'losses', path: '/losses?capture=1' },
    { name: 'recoveries', path: '/recoveries?capture=1' },
    { name: 'customers', path: '/customers?capture=1' },
    { name: 'rules', path: '/rules?capture=1' },
    { name: 'flows', path: '/flows?capture=1' },
    { name: 'reports', path: '/reports?capture=1' },
    { name: 'integrations', path: '/integrations?capture=1' },
    { name: 'settings', path: '/settings/account?capture=1' },
    { name: 'notifications', path: '/notifications?capture=1' },
    { name: 'help', path: '/help?capture=1' },
    ...(casePath
      ? [{
          name: 'case-detail',
          path: (() => {
            const url = new URL(casePath, baseUrl);
            url.searchParams.set('capture', '1');
            return `${url.pathname}${url.search}`;
          })(),
        }]
      : []),
  ];
  const routes = requestedRouteNames.size > 0
    ? allRoutes.filter((route) => requestedRouteNames.has(route.name))
    : allRoutes;

  for (const viewport of viewports) {
    for (const route of routes) {
      const context = await browser.newContext({
        storageState,
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: theme,
        reducedMotion: 'reduce',
        locale: 'en-GB',
        timezoneId: 'Europe/London',
        serviceWorkers: 'block',
      });
      await context.addInitScript((selectedTheme) => {
        localStorage.setItem('unauth.theme', selectedTheme);
      }, theme);
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => pageErrors.push(error.message));

      const file = `${route.name}-${viewport.name}.png`;
      try {
        const response = await page.goto(new URL(route.path, baseUrl).toString(), {
          waitUntil: 'domcontentloaded',
          timeout: 180_000,
        });
        await page.locator('html[data-route-ready="true"]').waitFor({ timeout: 20_000 });
        // A route may first report `degraded` when a shared client resource
        // crosses the bounded UI deadline, then upgrade to `ready` once that
        // resource settles. Final visual evidence must never certify that
        // intermediate frame as release-ready.
        if (!allowDegraded) {
          await page.locator('html[data-route-state="ready"]').waitFor({ timeout: 120_000 });
        }
        await page.waitForTimeout(settleMs);

        await page.screenshot({
          path: path.join(outputDirectory, file),
          fullPage: false,
          caret: 'initial',
        });

        const diagnostics = await page.evaluate(() => {
          const sidebar = document.querySelector('aside.ua-app-sidebar');
          return {
            path: `${location.pathname}${location.search}${location.hash}`,
            title: document.title,
            routeReady: document.documentElement.getAttribute('data-route-ready'),
            routeState: document.documentElement.getAttribute('data-route-state'),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            viewportWidth: window.innerWidth,
            compactDesktop: window.matchMedia('(min-width: 768px) and (max-width: 1199px)').matches,
            sidebarCollapsed: sidebar?.getAttribute('data-collapsed') ?? null,
            sidebarWidth: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null,
            bodyText: document.body.innerText.slice(0, 240),
          };
        });
        manifest.captures.push({
          route: route.name,
          requestedPath: route.path,
          viewport: viewport.name,
          file,
          httpStatus: response?.status() ?? null,
          consoleErrors,
          pageErrors,
          diagnostics,
        });
      } catch (error) {
        manifest.captures.push({
          route: route.name,
          requestedPath: route.path,
          viewport: viewport.name,
          file: null,
          httpStatus: null,
          consoleErrors,
          pageErrors,
          diagnostics: {
            path: null,
            title: null,
            routeReady: null,
            routeState: 'capture-failed',
            overflow: 0,
            bodyText: null,
          },
          captureError: error instanceof Error ? error.message : String(error),
        });
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(
  path.join(outputDirectory, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

const failures = manifest.captures.filter(
  (capture) =>
    capture.httpStatus == null
    || capture.httpStatus >= 400
    || capture.pageErrors.length > 0
    || capture.diagnostics.overflow > 1,
);

console.log(
  `Captured ${manifest.captures.length} baseline views to ${outputDirectory}`,
);
if (failures.length > 0) {
  for (const failure of failures) {
    console.error(
      `FAIL ${failure.route} ${failure.viewport}: HTTP ${failure.httpStatus ?? 'unknown'}, `
      + `${failure.pageErrors.length} page errors, ${failure.diagnostics.overflow}px overflow`,
    );
  }
  process.exit(1);
}
