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

test("first-class detail workspaces pass production accessibility and responsive gates", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const detailRoutes: string[] = [];

  for (const item of LIST_DETAILS) {
    await page.goto(item.list, { waitUntil: "domcontentloaded" });
    const links = page.locator(`main a[href^="${item.pattern}"]`);
    await expect(
      links.first(),
      `${item.list} should expose a drillable record`,
    ).toBeVisible({ timeout: 20_000 });
    const href = await links.first().getAttribute("href");
    expect(href, `${item.list} should expose a drillable record`).toBeTruthy();
    detailRoutes.push(href!);
  }

  await page.goto("/customers", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "View", exact: true }).first().click();
  const fullProfile = page.getByRole("link", {
    name: "Open full customer profile",
  });
  await expect(fullProfile).toBeVisible({ timeout: 20_000 });
  const customerHref = await fullProfile.getAttribute("href");
  expect(customerHref).toBeTruthy();
  detailRoutes.push(customerHref!);

  await page.goto(
    detailRoutes.find((route) => route.startsWith("/customers/"))!,
  );
  const connectedRoutes = await page
    .locator(
      'main a[href^="/orders/"], main a[href^="/tickets/"], main a[href^="/shipments/"], main a[href^="/refunds/"], main a[href^="/returns/"], main a[href^="/disputes/"]',
    )
    .evaluateAll(
      (links) =>
        [
          ...new Set(
            links.map((link) => link.getAttribute("href")).filter(Boolean),
          ),
        ] as string[],
    );
  expect(
    connectedRoutes.length,
    "A customer profile should expose at least one connected operational object",
  ).toBeGreaterThan(0);

  for (const route of [...detailRoutes, ...connectedRoutes]) {
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
});
