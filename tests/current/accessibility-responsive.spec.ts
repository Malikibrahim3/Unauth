import { expect, test, type Page } from "@playwright/test";

const CORE_ROUTES = [
  "/dashboard",
  "/work",
  "/claims",
  "/losses",
  "/recoveries",
  "/customers",
  "/rules",
  "/flows",
  "/integrations",
  "/reports",
  "/notifications",
  "/settings/account",
  "/integrations/imports",
  "/flows/runs",
  "/rules/recovery",
  "/settings/billing",
  "/settings/team",
  "/settings/platform",
  "/settings/agreements",
  "/settings/api-integrations",
  "/settings/notifications",
  "/settings/data-privacy",
  "/settings/audit-trail",
  "/settings/integrations/shopify",
  "/settings/integrations/gorgias",
  "/settings/integrations/zendesk",
  "/settings/integrations/freshdesk",
  "/settings/integrations/chrome",
  "/help",
] as const;
const VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1440, height: 900 },
] as const;

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
            nodes: violation.nodes.slice(0, 10).map((node) => ({
              target: node.target,
              html: node.html,
              failureSummary: node.failureSummary,
            })),
          }));
      });
      expect(
        violations,
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
        const layout = await page.evaluate(() => {
          const main = document.querySelector("main");
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
              while (parent && parent !== main) {
                const overflow = getComputedStyle(parent).overflowX;
                if (
                  (overflow === "auto" || overflow === "scroll") &&
                  parent.scrollWidth > parent.clientWidth
                )
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
          };
        });
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
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Search (⌘K)" }).click();
    await expect(
      page.getByRole("dialog", { name: "Command palette" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "Command palette" }),
    ).toHaveCount(0);
  });
});
