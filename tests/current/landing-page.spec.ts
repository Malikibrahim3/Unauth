import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SECTION_ORDER = ['gate', 'evidence', 'features', 'recovery', 'outcome', 'integrations', 'close-loop'] as const;

const ARTIFACTS = [
  { id: 'hero-gate-overview', type: 'Real product screen', width: '2400', height: '1350', mobileWidth: '1200', mobileHeight: '900', mustShow: ['One £128 request with evidence 4 of 5', 'External action: None'], avoid: 'No generic mockup' },
  { id: 'gate-evidence-to-decision', type: 'Custom diagram', width: '1920', height: '1200', mobileWidth: '1200', mobileHeight: '1200', mustShow: ['Support, Commerce, Fulfilment, and Carrier inputs', 'Missing proof causing Needs review'], avoid: 'No risk gauge' },
  { id: 'workspace-around-the-gate', type: 'Custom diagram', width: '1920', height: '1200', mobileWidth: '1200', mobileHeight: '1200', mustShow: ['Connect evidence → Operate case → Control gate', 'Control gate → Recover loss → Reconcile money'], avoid: 'No bento cards' },
  { id: 'recovery-follow-through', type: 'Custom diagram', width: '1920', height: '1200', mobileWidth: '1200', mobileHeight: '1200', mustShow: ['Carrier, warehouse/3PL, and supplier responsibility candidates', 'External submission, provider position, and deadline'], avoid: 'Do not present review-only signals as fault evidence' },
  { id: 'financial-case-to-ledger', type: 'Custom diagram', width: '1920', height: '1200', mobileWidth: '1200', mobileHeight: '1200', mustShow: ['Recommendation → Merchant decision → External action', 'Unknown values shown as unavailable, never zero'], avoid: 'No collapsed money stages' },
] as const;

const rgb = {
  canvas: 'rgb(255, 255, 255)',
  surface1: 'rgb(250, 250, 251)',
  text: 'rgb(17, 19, 24)',
  secondary: 'rgb(69, 75, 85)',
  muted: 'rgb(107, 114, 128)',
  inverse: 'rgb(24, 26, 31)',
} as const;

function relativeLuminance(color: string) {
  const channels = color.match(/\d+/g)?.slice(0, 3).map(Number) ?? [];
  return channels.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

test.describe('neutral gate-led landing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/landing', { waitUntil: 'domcontentloaded' });
  });

  test('preserves story order, anchors, landmarks and destinations', async ({ page }) => {
    await expect(page).toHaveTitle(/The evidence gate before every refund or reship/);
    await expect(page.locator('main > section').evaluateAll((sections) => sections.map(({ id }) => id))).resolves.toEqual(SECTION_ORDER);
    await expect(page.locator('#decision')).toHaveCount(1);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);

    await expect(page.getByRole('link', { name: 'Unauth home' }).first()).toHaveAttribute('href', '/landing');
    await expect(page.locator('header img[src*="unauth-r1-wordmark-graphite.svg"]')).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'See the gate in action' }).first()).toHaveAttribute('href', '/demo?step=recommendation');
    await expect(page.getByRole('link', { name: 'View the demo' }).first()).toHaveAttribute('href', '/demo');
    await expect(page.locator('a[href="/login"]').first()).toHaveAttribute('href', '/login');
    await expect(page.getByRole('link', { name: 'Create workspace' }).last()).toHaveAttribute('href', '/signup');
  });

  test('renders current hero proof and truthful diagram fallbacks without broken images', async ({ page }) => {
    const slots = page.locator('[data-artifact-slot]');
    await expect(slots).toHaveCount(ARTIFACTS.length);
    await expect(slots.evaluateAll((items) => items.map((item) => item.getAttribute('data-artifact-slot')))).resolves.toEqual(ARTIFACTS.map(({ id }) => id));

    for (const artifact of ARTIFACTS) {
      const slot = page.locator(`[data-artifact-slot="${artifact.id}"]`);
      await expect(slot).toHaveAttribute('data-desktop-width', artifact.width);
      await expect(slot).toHaveAttribute('data-desktop-height', artifact.height);
      await expect(slot).toHaveAttribute('data-mobile-width', artifact.mobileWidth);
      await expect(slot).toHaveAttribute('data-mobile-height', artifact.mobileHeight);
      if (artifact.id === 'hero-gate-overview') {
        await expect(slot).toHaveAttribute('data-artifact-state', 'ready');
        const image = slot.getByRole('img');
        await expect(image).toHaveAttribute('src', '/product-proof/hero-case-gate-hold-signal-3420x1920.png');
        await expect(image).toHaveJSProperty('complete', true);
        await expect(image).not.toHaveJSProperty('naturalWidth', 0);
      } else {
        await expect(slot).toHaveAttribute('data-artifact-state', 'truthful-fallback');
        await expect(slot.getByRole('img')).toHaveAttribute('aria-label', /Unauth/);
        await expect(slot.getByRole('img')).toHaveAttribute('data-artifact-visual-type', artifact.type);
        await expect(slot.getByText('Product boundary')).toBeVisible();
        await expect(slot.getByText('Fictional case · explanatory view')).toBeVisible();
        for (const requirement of artifact.mustShow) await expect(slot.getByText(requirement, { exact: true })).toBeVisible();
        await expect(slot.getByText(new RegExp(artifact.avoid))).toBeVisible();
        await expect(slot.locator('img')).toHaveCount(0);
      }
    }
    await expect(page.getByText('ARTWORK PLACEHOLDER — NOT FINAL')).toHaveCount(0);
  });

  test('uses the exact neutral palette and maintains the inverse action', async ({ page }) => {
    const colors = await page.locator('[data-landing-page]').evaluate((root) => {
      const rootStyles = getComputedStyle(root);
      const artifact = root.querySelector<HTMLElement>('[data-artifact-slot] [role="img"]');
      const intro = root.querySelector<HTMLElement>('section h2 + div p');
      const inverse = root.querySelector<HTMLElement>('a[href="/demo"]');
      return {
        canvas: rootStyles.backgroundColor,
        text: rootStyles.color,
        surface1: artifact ? getComputedStyle(artifact.parentElement!).backgroundColor : '',
        secondary: intro ? getComputedStyle(intro).color : '',
        muted: getComputedStyle(root.querySelector<HTMLElement>('[aria-label="Demonstration provenance"]')!).color,
        border: rootStyles.getPropertyValue('--neutral-border').trim(),
        inverse: inverse ? getComputedStyle(inverse).backgroundColor : '',
        inverseText: inverse ? getComputedStyle(inverse).color : '',
        tokenText: rootStyles.getPropertyValue('--neutral-text').trim(),
        tokens: {
          surface2: rootStyles.getPropertyValue('--neutral-surface-2').trim(),
          raised: rootStyles.getPropertyValue('--neutral-surface-raised').trim(),
          borderStrong: rootStyles.getPropertyValue('--neutral-border-strong').trim(),
          faint: rootStyles.getPropertyValue('--neutral-text-faint').trim(),
        },
      };
    });

    expect(colors).toEqual({
      canvas: rgb.canvas,
      text: rgb.text,
      surface1: rgb.surface1,
      secondary: rgb.secondary,
      muted: rgb.muted,
      border: '#E6E8EC',
      inverse: rgb.inverse,
      inverseText: 'rgb(255, 255, 255)',
      tokenText: '#111318',
      tokens: {
        surface2: '#F5F6F8',
        raised: '#FFFFFF',
        borderStrong: '#CDD1D8',
        faint: '#9AA1AB',
      },
    });

    expect(contrastRatio(colors.text, colors.canvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.secondary, colors.canvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.muted, colors.canvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.inverseText, colors.inverse)).toBeGreaterThanOrEqual(4.5);

    const renderedGradients = await page.locator('[data-landing-page]').evaluate((root) => {
      return [root, ...Array.from(root.querySelectorAll('*'))]
        .map((element) => getComputedStyle(element).backgroundImage)
        .filter((value) => value !== 'none');
    });
    expect(renderedGradients).toEqual([]);
  });

  test('has one h1, ordered chapter headings and no horizontal overflow', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 2 }).allTextContents()).resolves.toEqual([
      'Inside the gate',
      'Workspace around the gate',
      'The decision is not the end',
      'From decision to financial outcome',
      'One case model across your post-purchase stack.',
      'Put the gate in front of your next refund or reship.',
      'Product',
      'Privacy',
      'Company',
    ]);

    const viewport = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(viewport.scrollWidth).toBe(viewport.clientWidth);
  });

  test('mobile menu supports keyboard traversal, Escape and focus return', async ({ page }) => {
    if ((page.viewportSize()?.width ?? 0) > 900) test.skip();

    const toggle = page.getByRole('button', { name: 'Open navigation menu' });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('data-hydrated', 'true');
    await toggle.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Navigation menu' })).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    await expect(page.getByRole('link', { name: 'The gate', exact: true }).last()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'What it sees', exact: true }).last()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Navigation menu' })).toHaveCount(0);
    await expect(toggle).toBeFocused();
  });

  test('disables meaningful motion when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const motion = await page.locator('h1').evaluate((heading) => {
      const styles = getComputedStyle(heading.parentElement!);
      return { animationDuration: styles.animationDuration, transitionDuration: styles.transitionDuration };
    });
    expect(Number.parseFloat(motion.animationDuration)).toBeLessThanOrEqual(0.01);
    expect(Number.parseFloat(motion.transitionDuration)).toBeLessThanOrEqual(0.01);
  });

  test('captures reproducible landing evidence when requested', async ({ page }, testInfo) => {
    test.skip(process.env.CAPTURE_LANDING_EVIDENCE !== '1');
    test.skip(testInfo.project.name === 'tablet');

    const viewport = page.viewportSize();
    if (!viewport) throw new Error('Landing evidence requires a fixed viewport.');

    const outputDirectory = path.resolve(process.cwd(), 'artifacts/landing-neutral');
    await mkdir(outputDirectory, { recursive: true });
    const filename = `landing-neutral-${testInfo.project.name}-${viewport.width}x${viewport.height}.png`;
    const screenshotPath = path.join(outputDirectory, filename);
    await expect(page.locator('[data-landing-page]')).toBeVisible();
    const screenshot = await page.screenshot({ path: screenshotPath, fullPage: true, animations: 'disabled' });

    const pageState = await page.locator('[data-landing-page]').evaluate((root) => ({
      url: window.location.href,
      sectionIds: Array.from(root.querySelectorAll<HTMLElement>('main > section')).map(({ id }) => id),
      placeholders: Array.from(root.querySelectorAll<HTMLElement>('[data-artifact-slot]')).map((slot) => ({
        id: slot.dataset.artifactSlot,
        status: slot.dataset.artifactState,
      })),
      overflow: document.documentElement.scrollWidth === document.documentElement.clientWidth ? 'none' : 'horizontal',
    }));

    const manifestPath = path.join(outputDirectory, 'manifest.json');
    const existing = await readFile(manifestPath, 'utf8').then((value) => JSON.parse(value)).catch(() => ({ captures: {} }));
    existing.url = '/landing';
    existing.generatedAt = new Date().toISOString();
    existing.captures[testInfo.project.name] = {
      viewport,
      file: filename,
      imageSignature: `sha256:${createHash('sha256').update(screenshot).digest('hex')}`,
      ...pageState,
    };
    await writeFile(manifestPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf8');
  });
});
