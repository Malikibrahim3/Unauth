import { expect, test, type Page } from "@playwright/test";

const LIST_DETAILS = [
  { list: "/claims", pattern: "/claims/" },
  { list: "/losses", pattern: "/losses/" },
  { list: "/recoveries", pattern: "/recoveries/" },
  { list: "/rules", pattern: "/rules/" },
  { list: "/flows", pattern: "/flows/" },
  { list: "/integrations", pattern: "/integrations/" },
] as const;

async function seriousAxeViolations(page: Page) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
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
          .slice(0, 5)
          .map((node) => ({ target: node.target, html: node.html })),
      }));
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
    const links = page.locator(`main a[href^="${item.pattern}"]`);
    await expect(
      links.first(),
      `${item.list} should expose a drillable record`,
    ).toBeVisible({ timeout: 20_000 });
    const href = await links.first().getAttribute("href");
    expect(href, `${item.list} should expose a drillable record`).toBeTruthy();
    await assertDetailSurface(page, href!);
  });
}

test("customer and connected-object workspaces pass accessibility and responsive gates", async ({
  page,
}) => {
  test.setTimeout(6 * 60_000);
  await blockAutomaticPrefetch(page);
  await page.goto("/customers", { waitUntil: "domcontentloaded" });
  const customerId = await page
    .getByTestId("customer-row")
    .first()
    .getAttribute("data-row-key");
  expect(customerId, "The customer directory should expose a record key").toBeTruthy();
  const customerHref = `/customers/${customerId}?return=${encodeURIComponent("/customers")}`;

  await page.goto(customerHref, { waitUntil: "domcontentloaded" });
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
  for (const route of connectedRoutes) await assertDetailSurface(page, route);
});
