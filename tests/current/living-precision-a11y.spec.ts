import { expect, test } from '@playwright/test';

test.describe('Living Precision release accessibility contract', () => {
  test('installs capture mode and its shared clock before a route becomes capture-ready', async ({
    page,
  }) => {
    await page.goto('/dashboard?capture=1', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    const root = page.locator('html');
    await expect(root).toHaveAttribute('data-capture-mode', 'true');
    await expect(root).toHaveAttribute('data-capture-clock', 'frozen');
    await expect(root).toHaveAttribute('data-route-state', 'ready', {
      timeout: 60_000,
    });
    await expect(root).toHaveAttribute('data-capture-ready', 'true', {
      timeout: 60_000,
    });
    expect(
      await page.evaluate(() =>
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.playState !== 'finished'
              && animation.playState !== 'idle',
          ).length,
      ),
    ).toBe(0);
  });

  test('preserves redirect context and keeps the final destination keyboard-reachable', async ({
    page,
  }) => {
    await page.goto('/exceptions?source=release-proof#queue', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(
      /\/work\?(?=[^#]*view=integration-exceptions)(?=[^#]*source=release-proof)[^#]*#queue$/,
    );
    expect(new URL(page.url()).pathname).toBe('/work');
    expect(new URL(page.url()).searchParams.get('view')).toBe(
      'integration-exceptions',
    );
    expect(new URL(page.url()).searchParams.get('source')).toBe('release-proof');
    expect(new URL(page.url()).hash).toBe('#queue');

    await expect(page.locator('.ua-app')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus-visible')).toHaveCount(1);
  });

  test('keeps the representative settings family usable in forced colours at 1024px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.goto('/settings/account', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('main h1')).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth
          - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    expect(
      await page.evaluate(() =>
        window.matchMedia('(forced-colors: active)').matches
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
    ).toBe(true);
  });
});
