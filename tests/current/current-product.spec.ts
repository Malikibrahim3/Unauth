import { expect, test, type Page } from "@playwright/test";

const CURRENT_ROUTES = [
  { path: "/dashboard", heading: "Overview" },
  { path: "/work", heading: "Work" },
  { path: "/exceptions", heading: "Work" },
  { path: "/claims", heading: "Payout Control" },
  { path: "/losses", heading: "Losses" },
  { path: "/recoveries", heading: "Recovery board" },
  { path: "/customers", heading: "Customers" },
  { path: "/rules", heading: "Rules" },
  { path: "/flows", heading: "Flows" },
  { path: "/reports", heading: "Reports" },
  { path: "/integrations", heading: "Integrations" },
  { path: "/notifications", heading: "Notifications" },
  { path: "/settings/team", heading: "Team management" },
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
    const caseLinks = page.locator('main a[href^="/claims/"]');
    const count = await caseLinks.count();
    test.skip(
      count === 0,
      "The safe E2E merchant currently has no open reconciliation exception.",
    );
    const href = await caseLinks.first().getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!);
    await expect(
      page.getByText("Evidence on file", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Manage evidence and lifecycle", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Case comments" }),
    ).toBeVisible();
    await expect(
      page.getByText("Event timeline", { exact: true }),
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
      "Search customers, audits, evidence packages",
    );
    await input.fill("recoveries");
    await expect
      .poll(() => dialog.getByText("Recoveries", { exact: true }).count())
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
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Import 1 valid row" }),
    ).toBeEnabled();
  });

  test("integration catalogue exposes connection health, capability, and provenance", async ({
    page,
  }) => {
    await page.goto("/integrations");
    await expect(
      page.getByText("Connected providers", { exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText("Imported records", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Covered categories", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Import records" }),
    ).toBeVisible();
    const connectorLink = page
      .locator('a[href^="/integrations/"]')
      .filter({ hasText: "View connection" })
      .first();
    await expect(connectorLink).toBeVisible();
    await connectorLink.click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Connection health" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Capability contract" }),
    ).toBeVisible();
    await expect(
      page.getByText(/Unsupported autonomous payout actions remain blocked/),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Import history" }),
    ).toBeVisible();
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
      page.getByText("Payout exposure", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Recovery performance" }),
    ).toBeVisible();
    await expect(
      page.getByText("Source coverage", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.locator("main canvas")).toHaveCount(0);
    await expect(page.locator("main .recharts-wrapper")).not.toHaveCount(0);
    await expect(page.getByRole("region", { name: "Payout performance charts" })).toBeVisible();
    await expect(page.getByText("View chart data").first()).toBeVisible();
  });
});
