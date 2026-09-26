import { expect, test, type Browser, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const suppliedReference = JSON.parse(readFileSync('artifacts/visual-authority/supplied-reference/reference-manifest.json', 'utf8')) as {
  records: Array<{ sourceId: string; acceptedContrastSignatures?: string[]; acceptedLinkContrastSignatures?: string[] }>;
};
// User-approved source-colour exception; never disable the contrast rule.
const acceptedSourceContrast = new Set(suppliedReference.records.flatMap((record) => record.acceptedContrastSignatures ?? []));
const acceptedSourceLinkContrast = new Set(suppliedReference.records.flatMap((record) => record.acceptedLinkContrastSignatures ?? []));

const CORE_ROUTES = [
  "/overview",
  "/work",
  "/cases",
  "/financials/losses",
  "/financials/recovery",
  "/financials/reconciliation",
  "/customers",
  "/controls/rules",
  "/controls/flows",
  "/sources/connected",
  "/financials/reports",
  "/notifications",
  "/settings/workspace/account",
  "/sources/imports",
  "/controls/flows/runs",
  "/controls/rules/recovery",
  "/settings/billing",
  "/settings/workspace/team",
  "/settings/product/platform",
  "/settings/legal/agreements",
  "/settings/developers/api-access",
  "/settings/product/notifications",
  "/settings/legal/data-privacy",
  "/settings/governance/audit-trail",
  "/sources/setup/shopify",
  "/sources/setup/gorgias",
  "/sources/setup/zendesk",
  "/sources/setup/freshdesk",
  "/sources/setup/chrome",
  "/help",
] as const;
const VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1280, height: 720 },
  { width: 1440, height: 600 },
  { width: 1440, height: 900 },
] as const;

const ENTRY_ROUTES = ['/landing', '/pricing', '/login', '/signup', '/reset', '/onboarding', '/demo?step=recommendation', '/overview'] as const;

async function expectPortableBoundary(browser: Browser, userAgent: string, viewport: { width: number; height: number }) {
  const context = await browser.newContext({ userAgent, viewport });
  const page = await context.newPage();
  for (const route of ENTRY_ROUTES) {
    await page.goto(route, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { level: 1, name: 'Open Unauth on a desktop' })).toBeVisible();
    await expect(page.locator('[data-desktop-required="unsupported-portable"]')).toBeVisible();
    await expect(page.locator('[data-desktop-product]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Copy desktop link' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Email the link' })).toHaveAttribute('href', /mailto:/);
  }
  await context.close();
}

async function waitForStableMain(page: Page) {
  await expect(page.locator("main").first()).toBeVisible();
  await expect(page.locator("main h1").first()).toBeVisible({ timeout: 75_000 });
  await expect(
    page.getByText("Something went wrong", { exact: true }),
  ).toHaveCount(0);
}

async function gotoReadySurface(page: Page, route: string) {
  await page.goto(route, {
    waitUntil: "commit",
    timeout: 60_000,
  });
  await waitForStableMain(page);
}

test.describe("release accessibility and responsive gates", () => {
  for (const route of CORE_ROUTES) {
    test(`${route} has no serious or critical axe violations`, async ({
      page,
    }) => {
      test.setTimeout(150_000);
      await gotoReadySurface(page, route);
      if (route === '/settings/workspace/team') {
        const inviteButton = page.locator('button[aria-label="Invite member"]');
        await expect(inviteButton).toBeEnabled({ timeout: 30_000 });
        await expect.poll(async () => inviteButton.evaluate((element) => {
          const style = getComputedStyle(element);
          return `${style.color}|${style.backgroundColor}|${style.opacity}`;
        })).toBe('rgb(255, 255, 255)|rgb(28, 27, 25)|1');
      }
      await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
      const violations = await page.evaluate(async () => {
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
                  nodes: Array<{
                    target?: unknown;
                    html?: string;
                    failureSummary?: string;
                    any?: Array<{ id: string; data?: { fgColor?: string; bgColor?: string; fontSize?: string; fontWeight?: string } }>;
                  }>;
                }>;
              }>;
            };
          }
        ).axe;
        const result = await axe.run("main", {
          resultTypes: ["violations"],
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
        });
        return result.violations
          .filter(
            (violation) =>
              violation.impact === "serious" || violation.impact === "critical",
          )
          .map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            nodes: violation.nodes.map((node) => ({
              target: node.target,
              html: node.html,
              failureSummary: node.failureSummary,
              linkContrastSignature: violation.id === 'link-in-text-block' && Array.isArray(node.target) && typeof node.target[0] === 'string' ? (() => {
                const link = document.querySelector(node.target[0]);
                if (!link?.parentElement) return null;
                const style = getComputedStyle(link);
                return JSON.stringify([style.color, getComputedStyle(link.parentElement).color, style.fontSize, style.fontWeight, style.textDecorationLine]);
              })() : null,
              contrastSignatures: (node.any ?? []).filter((check) => check.id === 'color-contrast' && check.data).map((check) => JSON.stringify([check.data!.fgColor, check.data!.bgColor, check.data!.fontSize, check.data!.fontWeight])),
            })),
          }));
      });
      const unexpected = violations.map((violation) => ({ ...violation, nodes: violation.nodes.filter((node) => {
        if (violation.id === 'link-in-text-block') return !node.linkContrastSignature || !acceptedSourceLinkContrast.has(node.linkContrastSignature);
        return violation.id !== 'color-contrast' || node.contrastSignatures.length === 0 || node.contrastSignatures.some((signature) => !acceptedSourceContrast.has(signature));
      }) })).filter((violation) => violation.nodes.length > 0);
      expect(
        unexpected,
        `${route} has serious or critical accessibility failures`,
      ).toEqual([]);
    });

    test(`${route} reflows without document clipping at release widths`, async ({
      page,
    }) => {
      test.setTimeout(150_000);
      await gotoReadySurface(page, route);
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport);
        if (viewport.width < 1024) {
          await expect(page.locator('[data-narrow-desktop="true"]')).toBeVisible();
          await expect(
            page.locator('[data-narrow-desktop="true"] > [role="status"]'),
          ).toContainText('Narrow desktop window');
          await expect(page.locator("[data-desktop-product]")).toBeVisible();
        } else {
          await expect(page.locator("[data-desktop-required]")).toBeHidden();
          await expect(page.locator("[data-desktop-product]")).toBeVisible();
          await expect(page.locator("main")).toBeVisible();
        }
        const layout = await page.evaluate(() => {
          const main = document.querySelector("main");
          const narrowShell = document.querySelector<HTMLElement>('[data-narrow-desktop="true"]');
          const isHorizontalScrollOwner = (element: HTMLElement) => {
            const overflowX = getComputedStyle(element).overflowX;
            return (overflowX === "auto" || overflowX === "scroll") && element.scrollWidth > element.clientWidth;
          };
          const uncontainedOffenders = [...(main?.querySelectorAll("*") ?? [])]
            .filter((element) => {
              const html = element as HTMLElement;
              const rect = html.getBoundingClientRect();
              if (
                rect.width === 0 ||
                rect.height === 0 ||
                rect.right <= window.innerWidth + 1
              )
                return false;
              let parent = html.parentElement;
              while (parent && parent !== document.body) {
                if (isHorizontalScrollOwner(parent))
                  return false;
                parent = parent.parentElement;
              }
              return true;
            })
            .slice(0, 10)
            .map((element) => ({
              tag: element.tagName,
              className: (element as HTMLElement).className,
              right: Math.round(element.getBoundingClientRect().right),
            }));
          return {
            documentOverflow:
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
            uncontainedOffenders,
            narrowShell: narrowShell
              ? {
                  clientWidth: narrowShell.clientWidth,
                  scrollWidth: narrowShell.scrollWidth,
                  overflowX: getComputedStyle(narrowShell).overflowX,
                }
              : null,
          };
        });
        if (viewport.width < 1024) {
          expect(layout.narrowShell, `${route} is missing its narrow-desktop scroll owner`).toMatchObject({
            overflowX: expect.stringMatching(/^(auto|scroll)$/),
          });
          expect(layout.narrowShell!.scrollWidth, `${route} does not expose the full desktop canvas at ${viewport.width}px`).toBeGreaterThan(layout.narrowShell!.clientWidth);
        }
        expect(
          layout.documentOverflow,
          `${route} clips the document at ${viewport.width}px`,
        ).toBeLessThanOrEqual(1);
        expect(
          layout.uncontainedOffenders,
          `${route} has uncontained clipped content at ${viewport.width}px`,
        ).toEqual([]);
      }
    });
  }

  test("command palette and dialogs preserve keyboard escape behavior", async ({
    page,
  }) => {
    await page.goto("/overview");
    await page.getByRole("button", { name: "Search and navigate" }).click();
    await expect(
      page.getByRole("dialog", { name: "Search and navigate" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "Search and navigate" }),
    ).toHaveCount(0);
  });

  test('blocks phone and tablet workflows in portrait and landscape across entry boundaries', async ({ browser }) => {
    test.setTimeout(180_000);
    await expectPortableBoundary(browser, 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', { width: 390, height: 844 });
    await expectPortableBoundary(browser, 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', { width: 1180, height: 820 });
  });
});
