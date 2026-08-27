import { expect, test, type Page } from "@playwright/test";

const CURRENT_ROUTES = [
  { path: "/overview", heading: "Operating position" },
  { path: "/work", heading: "Work" },
  { path: "/cases", heading: "Cases" },
  { path: "/financials/losses", heading: "Loss ledger" },
  { path: "/financials/recovery", heading: "Recovery board" },
  { path: "/customers", heading: "Customers" },
  { path: "/controls/rules", heading: "Rules" },
  { path: "/controls/flows", heading: "Flows" },
  { path: "/financials/reports", heading: "Reports" },
  { path: "/sources/connected", heading: "Sources" },
  { path: "/notifications", heading: "Notifications" },
  { path: "/settings/workspace/team", heading: "Team" },
] as const;

async function expectNoDocumentOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
}

test.describe("current merchant experience", () => {
  for (const route of CURRENT_ROUTES) {
    test(`${route.path} renders the current product surface`, async ({
      page,
    }) => {
      await page.goto(route.path);
      await expect(
        page.getByRole("heading", { level: 1, name: route.heading }),
      ).toBeVisible();
      await expect(page.getByText("Loading page", { exact: true })).toHaveCount(
        0,
      );
      await expectNoDocumentOverflow(page);
    });
  }

  test("reconciliation exceptions link to a complete case workspace", async ({
    page,
  }) => {
    await page.goto("/work?view=integration-exceptions");
    await expect(
      page.getByRole("heading", { level: 1, name: "Work" }),
    ).toBeVisible();
    const exceptionRows = page.getByRole("button", {
      name: /Reconciliation Exception/,
    });
    await expect(exceptionRows).not.toHaveCount(0, { timeout: 20_000 });
    await exceptionRows.first().click();
    await page.getByRole("link", { name: "Open full record" }).click();
    await expect(page).toHaveURL(/\/cases\//, { timeout: 30_000 });
    await expect(
      page.getByRole("region", { name: "Recommendation → decision → external result → money" }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("region", { name: "Evidence and readiness" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Evidence register" }),
    ).toBeVisible();
  });

  test("command search opens and returns current navigation results", async ({
    page,
  }) => {
    await page.goto("/overview");
    await page.getByRole("button", { name: "Search and navigate" }).click();
    const dialog = page.getByRole("dialog", { name: "Search and navigate" });
    await expect(dialog).toBeVisible();
    const input = page.getByLabel("Search records or navigate");
    await input.fill("recovery");
    await expect
      .poll(() => dialog.getByText("Recovery board", { exact: true }).count())
      .toBeGreaterThan(0);
    await input.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "Search and navigate" }),
    ).not.toBeVisible();
  });

  test("current CSV intake validates a canonical row without committing it", async ({
    page,
  }) => {
    await page.goto("/sources/imports?step=upload");
    await expect(
      page.getByRole("heading", { level: 1, name: "Imports" }),
    ).toBeVisible();
    await page.getByText("Paste CSV text instead", { exact: true }).click();
    await page
      .locator("textarea:visible")
      .fill("external_id,currency,total_minor\nE2E-VALIDATE-ONLY,GBP,8400");
    await page.getByRole("button", { name: "Continue to mapping" }).click();
    await expect(page.getByLabel("Map external_id")).toHaveValue("external_id");
    await expect(page.getByLabel("Map currency")).toHaveValue("currency");
    await expect(page.getByLabel("Map total_minor")).toHaveValue("total_minor");
    await page.getByRole("button", { name: "Validate rows", exact: true }).click();
    await expect(
      page.getByText("Every row passed validation.", { exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("button", { name: "Commit 1 valid rows" }),
    ).toBeEnabled();
  });

  test("integration catalogue exposes connection health, capability, and provenance", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto("/sources/browse");
    await expect(
      page.getByRole("heading", { level: 2, name: "Minimum evidence stack" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/\d+ providers?$/).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/\d+ in the canonical registry/).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Needs attention \d+/ }),
    ).toBeVisible();
    const connectorLink = page
      .locator('a[href^="/sources/"]')
      .filter({ hasText: "Details" })
      .first();
    await expect(connectorLink).toBeVisible();
    await connectorLink.click();
    await expect(page).toHaveURL(/\/sources\/[^/?]+(?:\?|$)/, {
      timeout: 60_000,
    });
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "What this source is allowed to do",
      }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByText("Records held", { exact: true }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByText(/Runtime verification pending/).first(),
    ).toBeVisible();
    const retainedRunHistory = page.getByRole("heading", {
      level: 2,
      name: "Sync and import history",
    });
    const explicitNoRunHistory = page.getByText(
      "No sync history is inferred from connection state.",
      { exact: true },
    );
    await expect(
      retainedRunHistory.or(explicitNoRunHistory).first(),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByRole("heading", { level: 2, name: "Configuration" }),
    ).toBeVisible();
    await expectNoDocumentOverflow(page);
  });

  test("reports expose operational metrics and underlying-record navigation", async ({
    page,
  }) => {
    await page.goto("/financials/reports");
    await expect(
      page.getByRole("heading", { level: 1, name: "Reports" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "How did requested value become final net loss?" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Is exposure outpacing recovery?" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Which causes make up confirmed loss?" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Open loss causes/ }),
    ).toBeVisible();
    await expect(page.locator("main canvas")).toHaveCount(0);
    await expect(page.locator("main .recharts-wrapper")).toHaveCount(0);
    await expect(page.getByRole("img", { name: /Cumulative maximum exposure and recovered cash/ })).toBeVisible();
    await expect(page.getByText("View chart data").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Open a report" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Metric definitions" })).toBeVisible();
    await expect(page.getByText("Case financials", { exact: true })).toHaveCount(0);
    await expect(page.getByText("How is financial value accumulating?", { exact: true })).toHaveCount(0);
  });
});
