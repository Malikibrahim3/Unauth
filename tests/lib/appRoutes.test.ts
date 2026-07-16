import fs from "fs";
import path from "path";
import {
  APP_ROUTES,
  COMMAND_PALETTE_FILTERS,
  getAllAliasHrefs,
  getAllCanonicalHrefs,
  getCommandPaletteNavItems,
  getSidebarNavItems,
} from "@/lib/navigation/appRoutes";
import { ROUTE_ALIASES, resolveCanonicalHref } from "@/lib/navigation/aliases";

const APP_ROOT = path.join(process.cwd(), "app/(app)");

function appPageExists(routePath: string): boolean {
  const segments = routePath.split("/").filter(Boolean);
  const pagePath = path.join(APP_ROOT, ...segments, "page.tsx");
  return fs.existsSync(pagePath);
}

describe("app route registry", () => {
  it("lists canonical routes that exist as app pages", () => {
    for (const href of getAllCanonicalHrefs()) {
      expect(appPageExists(href)).toBe(true);
    }
  });

  it("resolves aliases to canonical routes", () => {
    for (const [alias, canonical] of Object.entries(ROUTE_ALIASES)) {
      expect(resolveCanonicalHref(alias)).toBe(canonical);
      expect(appPageExists(canonical)).toBe(true);
    }
  });

  it("does not redirect canonical routes to unrelated surfaces", () => {
    const canonical = new Set(getAllCanonicalHrefs());
    for (const alias of getAllAliasHrefs()) {
      const resolved = resolveCanonicalHref(alias);
      expect(canonical.has(resolved) || alias === resolved).toBe(true);
    }
  });

  it("generates sidebar and command palette from registry", () => {
    const sidebarHrefs = getSidebarNavItems().flatMap((g) =>
      g.items.map((i) => i.href),
    );
    const paletteHrefs = [
      ...getCommandPaletteNavItems().map((i) => i.href),
      ...COMMAND_PALETTE_FILTERS.map((i) => i.href.split("?")[0]),
    ];

    for (const href of [...sidebarHrefs, ...paletteHrefs]) {
      const route = Object.values(APP_ROUTES).find(
        (r) => r.href === href.split("?")[0],
      );
      expect(route ?? href.startsWith("/customers?")).toBeTruthy();
    }
  });

  it("matches snapshot of sidebar labels", () => {
    const labels = getSidebarNavItems().flatMap((g) =>
      g.items.map((i) => i.label),
    );
    expect(labels).toMatchInlineSnapshot(`
[
  "Overview",
  "Work",
  "Payout Control",
  "Losses",
  "Recovery",
  "Customers",
  "Rules",
  "Flows",
  "Reports",
  "Integrations",
  "Settings",
]
`);
  });

  it("keeps legacy identity/network routes out of command palette navigation", () => {
    const hrefs = getCommandPaletteNavItems().map((item) => item.href);
    expect(hrefs).not.toEqual(
      expect.arrayContaining([
        "/lookup",
        "/global",
        "/watchlist",
        "/catches",
        "/chargebacks",
        "/store",
      ]),
    );
  });

  it("keeps compatibility-only routes out of the canonical registry", () => {
    expect(getAllCanonicalHrefs()).not.toEqual(expect.arrayContaining([
      "/partners",
      "/lookup",
      "/global",
      "/watchlist",
      "/catches",
      "/chargebacks",
      "/store",
    ]));
  });
});
