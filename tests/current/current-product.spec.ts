import { expect, test, type Page } from "@playwright/test";

const CURRENT_ROUTES = [
  { path: "/dashboard", heading: "Overview" },
  { path: "/work", heading: "Work" },
  { path: "/exceptions", heading: "Work" },
  { path: "/claims", heading: "Cases" },
  { path: "/losses", heading: "Losses" },
  { path: "/recoveries", heading: "Recovery board" },
  { path: "/customers", heading: "Customers" },
  { path: "/rules", heading: "Rules" },
  { path: "/flows", heading: "Flows" },
  { path: "/reports", heading: "Reports" },
  { path: "/integrations", heading: "Integrations" },
  { path: "/notifications", heading: "Notifications" },
  { path: "/settings/team", heading: "Team" },
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
    await expect(
      page.getByRole("link", { name: "Integration exceptions" }),
    ).toHaveAttribute("aria-current", "page");
    const caseActions = page.getByRole("button", { name: /^Open Case / });
    await expect(caseActions).not.toHaveCount(0, { timeout: 20_000 });
    await caseActions.nth(0).click();
    await expect(page).toHaveURL(/\/claims\//, { timeout: 30_000 });
    await expect(
      page.getByText("Evidence on file", { exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText("Manage evidence and lifecycle", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Case comments" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Activity" }),
    ).toBeVisible();
  });

  test("command search opens and returns current navigation results", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Search (⌘K)" }).click();
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible();
    const input = page.getByLabel(
      "Search customers, cases, and evidence",
    );
    await input.fill("recovery");
    await expect
      .poll(() => dialog.getByText("Recovery", { exact: true }).count())
      .toBeGreaterThan(0);
    await input.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "Command palette" }),
    ).not.toBeVisible();
  });

  test("current CSV intake validates a canonical row without committing it", async ({
    page,
  }) => {
    await page.goto("/integrations/imports");
    await expect(
      page.getByRole("heading", { level: 1, name: "Import records" }),
    ).toBeVisible();
    await page.getByText("Paste CSV text instead", { exact: true }).click();
    await page
      .locator("textarea:visible")
      .fill("external_id,currency,total_minor\nE2E-VALIDATE-ONLY,GBP,8400");
    await expect(page.getByLabel("Map external_id")).toHaveValue("external_id");
    await expect(page.getByLabel("Map currency")).toHaveValue("currency");
    await expect(page.getByLabel("Map total_minor")).toHaveValue("total_minor");
    await page.getByRole("button", { name: "Validate", exact: true }).click();
    await expect(
      page.getByText("Every row passed validation.", { exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("button", { name: "Import 1 valid row" }),
    ).toBeEnabled();
  });

  test("integration catalogue exposes connection health, capability, and provenance", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto("/integrations");
    await expect(
      page.getByText(/\d+ connected/).first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/\d+ records indexed/).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/\d+ of \d+ evidence layers covered/).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Imports & API" }),
    ).toBeVisible();
    const connectorLink = page
      .locator('a[href^="/integrations/"]')
      .filter({ hasText: "Manage" })
      .first();
    await expect(connectorLink).toBeVisible();
    await connectorLink.click();
    await expect(page).toHaveURL(/\/integrations\/[^/?]+(?:\?|$)/, {
      timeout: 60_000,
    });
    await expect(
      page.getByRole("heading", { level: 2, name: "Connection health" }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByRole("heading", { level: 2, name: "Data available to Unauth" }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByRole("cell", { name: "Issue refund (forbidden in MVP+)", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Import history" }),
    ).toBeVisible({ timeout: 60_000 });
    await expectNoDocumentOverflow(page);
  });

  test("reports expose operational metrics and underlying-record navigation", async ({
    page,
  }) => {
    await page.goto("/reports");
    await expect(
      page.getByRole("heading", { level: 1, name: "Reports" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Value this period" }),
    ).toBeVisible();
    await expect(
      page.getByText("Maximum exposure", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Recovery performance", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Source coverage", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.locator("main canvas")).toHaveCount(0);
    await expect(page.locator("main .recharts-wrapper")).not.toHaveCount(0);
    await expect(page.getByRole("region", { name: "Case financial charts" })).toBeVisible();
    await expect(page.getByText("View chart data").first()).toBeVisible();
  });
});
