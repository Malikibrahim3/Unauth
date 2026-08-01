import { expect, test, type Page } from '@playwright/test';

async function gotoAuthenticatedSurface(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'commit', timeout: 60_000 });
  await expect(page.locator('.ua-app')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('main h1').first()).toBeVisible({ timeout: 60_000 });
}

async function seriousAxeViolations(page: Page) {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  return page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            context: string,
            options: unknown,
          ) => Promise<{
            violations: Array<{
              id: string;
              impact: string | null;
              nodes: Array<{ target?: unknown; html?: string }>;
            }>;
          }>;
        };
      }
    ).axe;
    const result = await axe.run('main', {
      resultTypes: ['violations'],
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
      },
    });
    return result.violations
      .filter(
        (violation) =>
          violation.impact === 'serious' || violation.impact === 'critical',
      )
      .map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          html: node.html,
        })),
      }));
  });
}

test.describe('Phase 27 shared shell and accessibility modes', () => {
  test('shows source health once, keeps counters quiet, and expands collapsed navigation on keyboard focus', async ({
    page,
  }) => {
    await gotoAuthenticatedSurface(page, '/dashboard');

    const sourceHealth = page.locator(
      'aside a[aria-label*="source" i][href="/integrations"]',
    );
    await expect(sourceHealth).toHaveCount(1);

    const countBadge = page.locator(
      'aside a[href="/claims"] span[aria-label*="Cases requiring review"]',
    );
    await expect(countBadge).toBeVisible();
    const countColour = await countBadge.evaluate((element) => {
      const style = getComputedStyle(element);
      const resolveColour = (token: string) => {
        const probe = document.createElement('span');
        probe.style.color = `var(${token})`;
        element.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      };
      return {
        background: style.backgroundColor,
        expectedBackground: resolveColour('--ua-surface-muted'),
        foreground: style.color,
        expectedForeground: resolveColour('--ua-text-secondary'),
        primaryAction: resolveColour('--ua-action-primary'),
      };
    });
    expect(countColour.background).toBe(countColour.expectedBackground);
    expect(countColour.foreground).toBe(countColour.expectedForeground);
    expect(countColour.background).not.toBe(countColour.primaryAction);

    const aside = page.locator('aside.ua-app-sidebar');
    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await page.mouse.move(1000, 500);
    await expect(aside).toHaveAttribute('data-collapsed', 'true');
    await page.locator('aside nav a[href="/dashboard"]').focus();
    await expect(aside).toHaveAttribute('data-collapsed', 'false');
    await page.getByRole('button', { name: 'Search (⌘K)' }).focus();
    await expect(aside).toHaveAttribute('data-collapsed', 'true');
  });

  test('keeps relational dark-mode contrast across analytical, operational, and settings families', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('unauth.theme', 'dark');
    });

    for (const route of ['/dashboard', '/claims', '/settings/account']) {
      await test.step(route, async () => {
        await gotoAuthenticatedSurface(page, route);
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        const roles = await page.locator('.ua-app').evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            canvas: style.getPropertyValue('--ua-canvas').trim(),
            surface: style.getPropertyValue('--ua-surface-primary').trim(),
            primary: style.getPropertyValue('--ua-text-primary').trim(),
            secondary: style.getPropertyValue('--ua-text-secondary').trim(),
            accent: style.getPropertyValue('--ua-accent-500').trim(),
            success: style.getPropertyValue('--ua-success').trim(),
          };
        });
        expect(new Set(Object.values(roles))).toHaveProperty('size', 6);
        expect(await seriousAxeViolations(page)).toEqual([]);
      });
    }
  });

  test('keeps forced-colour semantics and chart alternatives accessible', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await gotoAuthenticatedSurface(page, '/dashboard');

    expect(
      await page.evaluate(() =>
        window.matchMedia('(forced-colors: active)').matches,
      ),
    ).toBe(true);
    await expect(page.locator('[aria-current="page"]')).toBeVisible();
    await expect(page.locator('[data-auth-chart]').first()).toBeVisible();
    expect(await seriousAxeViolations(page)).toEqual([]);
  });

  test('stops product motion for reduced-motion and deterministic capture modes', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoAuthenticatedSurface(page, '/dashboard');

    expect(
      await page.evaluate(() =>
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(() =>
        document
          .getAnimations()
          .filter((animation) => animation.playState !== 'finished').length,
      ),
    ).toBe(0);

    await page.locator('html').evaluate((element) => {
      element.setAttribute('data-capture-mode', 'true');
    });
    expect(
      await page.evaluate(() =>
        document
          .getAnimations()
          .filter((animation) => animation.playState !== 'finished').length,
      ),
    ).toBe(0);
  });

  test('keeps the primary claims workflow usable at a 1024px effective zoom viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await gotoAuthenticatedSurface(page, '/claims');

    await expect(page.locator('.ua-desktop-required')).toBeHidden();
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('main form[role="search"]')).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
  });
});
