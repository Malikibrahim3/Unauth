import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const suppliedReference = JSON.parse(readFileSync('artifacts/visual-authority/supplied-reference/reference-manifest.json', 'utf8')) as {
  records: Array<{ acceptedContrastSignatures?: string[]; acceptedLinkContrastSignatures?: string[] }>;
};
// The source-colour exception is explicit and bounded; all other serious findings remain failures.
const acceptedSourceContrast = new Set(suppliedReference.records.flatMap((record) => record.acceptedContrastSignatures ?? []));
const acceptedSourceLinkContrast = new Set(suppliedReference.records.flatMap((record) => record.acceptedLinkContrastSignatures ?? []));

const LIST_DETAILS = [
  { list: "/cases", pattern: "/cases/" },
  { list: "/financials/losses", pattern: "/financials/losses/" },
  { list: "/financials/recovery", pattern: "/financials/recovery/" },
  { list: "/controls/rules", pattern: "/controls/rules/" },
  { list: "/controls/flows", pattern: "/controls/flows/" },
  { list: "/sources/connected", pattern: "/sources/" },
] as const;

async function seriousAxeViolations(page: Page) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  return page.evaluate(async ({ acceptedContrastSignatures, acceptedLinkContrastSignatures }) => {
    const acceptedContrast = new Set(acceptedContrastSignatures);
    const acceptedLinkContrast = new Set(acceptedLinkContrastSignatures);
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
                any?: Array<{ id: string; data?: { fgColor?: string; bgColor?: string; fontSize?: string; fontWeight?: string } }>;
              }>;
            }>;
          }>;
        };
      }
    ).axe;
    const result = await axe.run("main", {
      resultTypes: ["violations"],
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    });
    return result.violations
      .filter(
        (violation) =>
          violation.impact === "serious" || violation.impact === "critical",
      )
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes
          .filter((node) => {
            if (violation.id === 'link-in-text-block') {
              if (!Array.isArray(node.target) || typeof node.target[0] !== 'string') return true;
              const link = document.querySelector(node.target[0]);
              if (!link?.parentElement) return true;
              const style = getComputedStyle(link);
              const signature = JSON.stringify([style.color, getComputedStyle(link.parentElement).color, style.fontSize, style.fontWeight, style.textDecorationLine]);
              return !acceptedLinkContrast.has(signature);
            }
            if (violation.id !== 'color-contrast') return true;
            const signatures = (node.any ?? [])
              .filter((check) => check.id === 'color-contrast' && check.data)
              .map((check) => JSON.stringify([check.data!.fgColor, check.data!.bgColor, check.data!.fontSize, check.data!.fontWeight]));
            return signatures.length === 0 || signatures.some((signature) => !acceptedContrast.has(signature));
          })
          .slice(0, 5)
          .map((node) => ({ target: node.target, html: node.html })),
      }))
      .filter((violation) => violation.nodes.length > 0);
  }, {
    acceptedContrastSignatures: [...acceptedSourceContrast],
    acceptedLinkContrastSignatures: [...acceptedSourceLinkContrast],
  });
}

async function assertResponsive(page: Page, route: string) {
  for (const viewport of [
    { width: 320, height: 800 },
    { width: 768, height: 900 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(
      overflow,
      `${route} clips at ${viewport.width}px`,
    ).toBeLessThanOrEqual(1);
  }
}

async function blockAutomaticPrefetch(page: Page) {
  await page.route(/(?:\?|&)_rsc=/, async (route) => {
    if (await route.request().headerValue("next-router-prefetch") === "1") {
      await route.abort();
      return;
    }
    await route.continue();
  });
}

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

async function assertDetailSurface(page: Page, route: string) {
  await test.step(route, async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main").first()).toBeVisible();
    await expect(page.locator("main h1").first()).toBeVisible();
    const pathname = new URL(route, "http://local.invalid").pathname;
    const surfaceId = pathname.endsWith("/evidence/new")
      ? "build-evidence-package"
      : pathname.startsWith("/customers/")
        ? "customer-profile"
        : null;
    if (surfaceId) {
      await expect(page.locator(`[data-surface-id="${surfaceId}"]`)).toBeVisible({ timeout: 75_000 });
    }
    await expect(
      page.getByText("Something went wrong", { exact: true }),
    ).toHaveCount(0);
    expect(
      await seriousAxeViolations(page),
      `${route} accessibility failures`,
    ).toEqual([]);
    await assertResponsive(page, route);
  });
}

for (const item of LIST_DETAILS) {
  test(`${item.list} exposes an accessible, responsive detail workspace`, async ({
    page,
  }) => {
    test.setTimeout(4 * 60_000);
    await blockAutomaticPrefetch(page);
    await page.goto(item.list, { waitUntil: "domcontentloaded" });
    let detailLink = page.locator(`main a[href^="${item.pattern}"]`).first();
    if (item.list === "/cases") {
      const firstCaseRow = page.locator('main [data-case-id]').first();
      await expect(firstCaseRow).toBeVisible({ timeout: 20_000 });
      await expect(firstCaseRow).toHaveAttribute('role', 'row');
      await expect(firstCaseRow).toHaveAttribute('tabindex', '0');
      await firstCaseRow.click();
      detailLink = page.getByRole('link', { name: 'Open case review', exact: true });
    }
    await expect(
      detailLink,
      `${item.list} should expose a drillable record`,
    ).toBeVisible({ timeout: 20_000 });
    const href = await detailLink.getAttribute("href");
    expect(href, `${item.list} should expose a drillable record`).toBeTruthy();
    await assertDetailSurface(page, href!);
  });
}

test("flow-run history exposes diagnosis or its truthful zero state", async ({ page }) => {
  test.setTimeout(4 * 60_000);
  await page.goto("/controls/flows/runs", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "Flow runs", exact: true }).first()).toBeVisible();
  const runLinks = page.locator('main a[href^="/controls/flows/runs/"]');
  if (await runLinks.count()) {
    const href = await runLinks.first().getAttribute("href");
    expect(href).toBeTruthy();
    await assertDetailSurface(page, href!);
  } else {
    await expect(page.getByRole("heading", { name: "No historical flow runs" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open flow drafts" })).toBeVisible();
    await assertResponsive(page, "/controls/flows/runs");
    expect(await seriousAxeViolations(page)).toEqual([]);
  }
});

test("customer and connected-object workspaces pass accessibility and responsive gates", async ({
  page,
}) => {
  test.setTimeout(6 * 60_000);
  await blockAutomaticPrefetch(page);
  const customerDirectoryHref = "/customers?sort=orders";
  await page.goto(customerDirectoryHref, { waitUntil: "domcontentloaded" });
  const customerHrefFromDirectory = await page
    .getByRole("region", { name: "Customer registry" })
    .getByRole("link", { name: /^Open .+$/ })
    .first()
    .getAttribute("href");
  expect(customerHrefFromDirectory, "The customer directory should expose a drillable customer").toMatch(/^\/customers\//);
  const customerId = customerHrefFromDirectory!.split("/")[2];
  const customerHref = `/customers/${customerId}?return=${encodeURIComponent(customerDirectoryHref)}`;
  const customerEvidenceHref = `/customers/${customerId}/evidence/new`;

  await page.goto(customerHref, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main h1").first()).toBeVisible({ timeout: 75_000 });
  await expect(page.locator('[data-surface-id="customer-profile"]')).toBeVisible({ timeout: 75_000 });
  const connectedRoutes = await page
    .locator(
      'main a[href^="/orders/"], main a[href^="/tickets/"], main a[href^="/shipments/"], main a[href^="/refunds/"], main a[href^="/returns/"], main a[href^="/disputes/"]',
    )
    .evaluateAll((links) => {
      const firstByType = new Map<string, string>();
      for (const link of links) {
        const href = link.getAttribute("href");
        const type = href?.split("/")[1];
        if (href && type && !firstByType.has(type)) firstByType.set(type, href);
      }
      return [...firstByType.values()];
    });
  expect(
    connectedRoutes.length,
    "A customer profile should expose at least one connected operational object",
  ).toBeGreaterThan(0);

  await assertDetailSurface(page, customerHref);
  await assertDetailSurface(page, customerEvidenceHref);
  for (const route of connectedRoutes) await assertDetailSurface(page, route);
});
