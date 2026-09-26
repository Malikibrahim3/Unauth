import { expect, test, type Page } from "@playwright/test";

const CURRENT_ROUTES = [
  { path: "/overview", heading: "Operating position" },
  { path: "/work", heading: "Work" },
  { path: "/cases", heading: "Cases" },
  { path: "/financials/losses", heading: "Loss ledger" },
  { path: "/financials/recovery", heading: "Recovery board" },
  { path: "/customers", heading: "Customers" },
  { path: "/controls/rules", heading: "Payout rules" },
  { path: "/controls/flows", heading: "Flows" },
  { path: "/financials/reports", heading: "Reports" },
  { path: "/sources/connected", heading: "Connected sources" },
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

async function expectRouteHeading(page: Page, heading: string) {
  await expect(
    page.getByRole("heading", { level: 1, name: heading, exact: true }).first(),
  ).toBeVisible();
}

test.describe("current merchant experience", () => {
  for (const route of CURRENT_ROUTES) {
    test(`${route.path} renders the current product surface`, async ({
      page,
    }) => {
      await page.goto(route.path);
      await expectRouteHeading(page, route.heading);
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
    const reviewButton = page.getByRole("button", { name: "Review" }).first();
    await expect(reviewButton).toBeVisible({ timeout: 20_000 });
    await reviewButton.click();
    await expect(page).toHaveURL(/\/cases\//, { timeout: 30_000 });
    await expect(
      page.getByRole("navigation", { name: "Case file tabs" }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("button", { name: "Evidence", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Recommendation", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Review merchant decision" }),
    ).toBeVisible();
    await expect(page.getByText("PROVIDER GATES", { exact: true })).toBeVisible();
    await expect(page.getByText("MONEY & RECOVERY", { exact: true })).toBeVisible();
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
      page.getByRole("heading", { level: 1, name: "Imports", exact: true }).first(),
    ).toBeVisible();
    const uploadDialog = page.getByRole("dialog", { name: "Upload a file" });
    await expect(uploadDialog).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({
      name: "validate-only.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("external_id,currency,total_minor\nE2E-VALIDATE-ONLY,GBP,8400"),
    });
    const mappingDialog = page.getByRole("dialog", { name: "Map source columns" });
    await expect(mappingDialog).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel("Map external_id")).toHaveValue("external_id");
    await expect(page.getByLabel("Map currency")).toHaveValue("currency");
    await expect(page.getByLabel("Map total_minor")).toHaveValue("total_minor");
    await mappingDialog.getByRole("button", { name: "Validate mapping", exact: true }).click();
    const validationCard = mappingDialog.locator("aside section").filter({ hasText: "VALIDATION" });
    await expect(validationCard).toContainText(/Rows read\s*1/);
    await expect(validationCard).toContainText(/Valid\s*1/);
    await expect(validationCard).toContainText(/Held\s*0/);
    await expect(validationCard).toContainText(/Duplicates\s*0/);
    await expect(mappingDialog.getByText("Validation has not run. No row count is inferred.", { exact: true })).toHaveCount(0);
    await expect(mappingDialog.getByText(/rows posted in job/)).toHaveCount(0);
  });

  test("integration catalogue exposes connection health, capability, and provenance", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto("/sources/browse");
    await expect(page.getByText("connected", { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("you could connect today", { exact: true })).toBeVisible();
    await expect(page.getByText("planned, no date", { exact: true })).toBeVisible();
    await expect(
      page.getByText("One layer decides most answers", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "ORDERS AND MONEY" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "SUPPORT AND EVIDENCE" }),
    ).toBeVisible();
    const connectorLink = page.getByRole("link", { name: "Shopify AVAILABLE", exact: true });
    await expect(connectorLink).toBeVisible();
    await connectorLink.click();
    await expect(page).toHaveURL(/\/sources\/setup\/shopify(?:\?|$)/, {
      timeout: 60_000,
    });
    await expect(
      page.getByTestId("source-setup-wizard"),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("heading", { level: 2, name: "Connect Shopify", exact: true })).toBeVisible();
    await expect(page.getByText(/provider access, field coverage and activation as separate decisions/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue to mapping", exact: true })).toBeVisible();
    await expectNoDocumentOverflow(page);
  });

  test("reports expose operational metrics and underlying-record navigation", async ({
    page,
  }) => {
    await page.goto("/financials/reports");
    await expect(
      page.getByRole("heading", { level: 1, name: "Reports" }),
    ).toBeVisible();
    const reportSurface = page.locator('[data-surface-id="financial-reports"]');
    await expect(reportSurface).toBeVisible();
    for (const label of [
      "WHERE THIS PERIOD’S LOSS ENDED UP",
      "BY CAUSE",
      "EXCLUDED FROM EVERY FIGURE",
      "SAVED REPORTS",
    ]) {
      await expect(reportSurface.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "Export CSV" })).toBeVisible();
    await expect(page.locator("main canvas")).toHaveCount(0);
    await expect(page.locator("main .recharts-wrapper")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /records$/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "a ledger entry", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Attribution", exact: true })).toBeVisible();
    await expect(page.getByText("Case financials", { exact: true })).toHaveCount(0);
    await expect(page.getByText("How is financial value accumulating?", { exact: true })).toHaveCount(0);
  });
});
