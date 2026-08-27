#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import nextEnv from "@next/env";
import sharp from "sharp";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (!value.startsWith("--")) continue;
  args.set(value.slice(2), process.argv[index + 1]?.startsWith("--") ? true : process.argv[++index] ?? true);
}

const baseURL = String(args.get("base-url") ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000");
const outputDir = path.resolve(String(args.get("output") ?? "artifacts/unauth-ui/r0/reliability"));
const storagePath = path.resolve(String(args.get("storage-state") ?? "tests/current/.auth/storage-state.json"));
const routeTimeout = Number(args.get("timeout") ?? 30_000);
const overlaysOnly = args.has("overlays-only");

const publicRoutes = [
  { path: "/reset", identity: "password-reset-request" },
  { path: "/reset/update", identity: "password-reset-expired" },
];

const authenticatedRoutes = [
  { path: "/work", heading: "Work" },
  { path: "/cases", heading: "Cases" },
  { path: "/financials/reports", heading: "Reports" },
  { path: "/settings/workspace/account", heading: "Account" },
  { path: "/financials/losses", heading: "Loss ledger" },
  { path: "/sources/browse", heading: "Sources" },
  { path: "/sources/imports", heading: "Imports" },
  { path: "/settings/developers/api-access", heading: "API access" },
  { path: "/settings/governance/audit-trail", heading: "Audit trail" },
  { path: "/settings/product/platform", heading: "Defaults" },
  { path: "/financials/recovery", heading: "Recovery board" },
  { path: "/notifications", heading: "Notifications" },
  { path: "/customers", heading: "Customers" },
  ...[
    ["financial", "Financial performance"],
    ["loss-causes", "Loss causes"],
    ["prevention", "Loss prevention"],
    ["recovery", "Recovery performance"],
    ["policy", "Policy effectiveness"],
    ["operations", "Operations / SLA"],
    ["evidence", "Evidence gaps"],
    ["coverage", "Source coverage"],
  ].map(([id, heading]) => ({ path: `/financials/reports/${id}`, heading, exactPath: true })),
];

function slug(value) {
  return value.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
}

async function ensureAuthenticatedState() {
  if (fs.existsSync(storagePath)) return storagePath;
  const secret = process.env.E2E_AUTH_SECRET;
  const merchantId = process.env.E2E_MERCHANT_ID;
  if (!secret || !merchantId) return null;
  fs.mkdirSync(path.dirname(storagePath), { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    const authUrl = new URL("/api/test/e2e-auth", baseURL);
    authUrl.searchParams.set("secret", secret);
    authUrl.searchParams.set("merchant_id", merchantId);
    authUrl.searchParams.set("redirect", "/legal/privacy?r0_session=ready");
    await page.goto(authUrl.toString(), { waitUntil: "domcontentloaded", timeout: 45_000 });
    if (new URL(page.url()).pathname !== "/legal/privacy") throw new Error("Safe E2E session bootstrap did not reach its expected landing route.");
    await context.storageState({ path: storagePath });
    return storagePath;
  } finally {
    await browser.close();
  }
}

async function capture(page, name) {
  const file = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true, type: "png" });
  const metadata = await sharp(file).metadata();
  if (metadata.format !== "png") throw new Error(`${file} is not encoded as PNG.`);
  const pageMetadata = await page.evaluate(() => ({
    document: {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
    headings: Array.from(document.querySelectorAll("h1, h2, h3"))
      .filter((heading) => {
        const style = window.getComputedStyle(heading);
        const rect = heading.getBoundingClientRect();
        return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
      })
      .map((heading) => heading.textContent?.trim())
      .filter(Boolean),
    surfaceIds: Array.from(document.querySelectorAll("[data-surface-id]"))
      .map((surface) => surface.getAttribute("data-surface-id"))
      .filter(Boolean),
    overlayTitles: Array.from(document.querySelectorAll('[role="dialog"] h1, [role="dialog"] h2, [role="dialog"] h3'))
      .map((heading) => heading.textContent?.trim())
      .filter(Boolean),
    terminalState: document.querySelector("[data-route-state]")?.getAttribute("data-route-state") ?? "loaded",
  }));
  return {
    file: path.relative(process.cwd(), file),
    format: metadata.format,
    raster: { width: metadata.width, height: metadata.height },
    ...pageMetadata,
  };
}

async function assertRoute(page, descriptor, authenticated) {
  const requested = new URL(descriptor.path, baseURL);
  await page.goto(requested.toString(), { waitUntil: "domcontentloaded", timeout: routeTimeout });
  await page.locator('[data-shell-ready="true"][data-auth-resolved="true"]').first().waitFor({ state: "visible", timeout: routeTimeout });

  if (authenticated) {
    await page.locator('[data-data-resolved="true"]').waitFor({ state: "attached", timeout: routeTimeout });
  } else {
    await page.locator(`[data-surface-id="${descriptor.identity}"]`).waitFor({ state: "visible", timeout: routeTimeout });
  }

  const final = new URL(page.url());
  if (descriptor.exactPath && final.pathname !== requested.pathname) {
    throw new Error(`${descriptor.path} resolved to ${final.pathname}; named reports must retain their requested route.`);
  }
  if (authenticated && final.pathname === "/login") throw new Error(`${descriptor.path} silently resolved to sign-in.`);
  if (authenticated) {
    const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (pageOverflow > 1) throw new Error(`${descriptor.path} creates ${pageOverflow}px of page-level horizontal overflow.`);
  }

  const identity = page.locator("[data-surface-id]:visible").last();
  const surfaceId = await identity.getAttribute("data-surface-id");
  if (!surfaceId) throw new Error(`${descriptor.path} has no visible surface identity.`);
  if (descriptor.heading) await page.getByRole("heading", { name: descriptor.heading, exact: true }).first().waitFor({ state: "visible", timeout: routeTimeout });
  const state = authenticated ? await page.locator('[data-route-state]').getAttribute("data-route-state") : await identity.getAttribute("data-state-id");
  if (state === "loading" || state === "timeout") throw new Error(`${descriptor.path} did not reach a terminal route state.`);

  return {
    requestedUrl: requested.toString(),
    finalUrl: final.toString(),
    surfaceId,
    state: state ?? "loaded",
    artifact: await capture(page, `route-${slug(descriptor.path)}`),
  };
}

async function assertOverlay(page, { route, trigger, roleName, overlayId, artifactName }) {
  await page.goto(new URL(route, baseURL).toString(), { waitUntil: "domcontentloaded", timeout: routeTimeout });
  await page.locator('[data-data-resolved="true"]').waitFor({ state: "attached", timeout: routeTimeout });
  const button = page.getByRole("button", { name: trigger, exact: true });
  const buttonHandle = await button.elementHandle();
  if (!buttonHandle) throw new Error(`${trigger} trigger is unavailable.`);
  await button.focus();
  await button.click();
  const dialog = page.getByRole("dialog", { name: roleName, exact: true });
  await dialog.waitFor({ state: "visible", timeout: routeTimeout });
  await dialog.locator(`h2:has-text("${roleName}")`).waitFor({ state: "visible", timeout: routeTimeout });
  await page.locator(`[data-overlay-id="${overlayId}"][data-overlay-state="open"]`).waitFor({ state: "attached", timeout: routeTimeout });
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport || box.x < 0 || box.y < 0 || box.x + box.width > viewport.width + 1 || box.y + box.height > viewport.height + 1) {
    throw new Error(`${roleName} is clipped outside the viewport.`);
  }
  const artifact = await capture(page, artifactName);
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached", timeout: routeTimeout });
  await page.waitForFunction((node) => document.activeElement === node, buttonHandle, { timeout: routeTimeout });
  const focusRestored = await button.evaluate((node) => document.activeElement === node);
  if (!focusRestored) throw new Error(`${roleName} did not restore focus to its trigger.`);
  return { route, overlayId, roleName, focusRestored, artifact };
}

async function discoverDetailRoute(page, indexPath, pattern) {
  await page.goto(new URL(indexPath, baseURL).toString(), { waitUntil: "domcontentloaded", timeout: routeTimeout });
  await page.locator('[data-data-resolved="true"]').waitFor({ state: "attached", timeout: routeTimeout });
  const hrefs = await page.locator('main a[href]').evaluateAll((links) => links.map((link) => link.getAttribute('href')).filter(Boolean));
  return hrefs.find((href) => pattern.test(new URL(href, baseURL).pathname)) ?? null;
}

fs.mkdirSync(outputDir, { recursive: true });
const authState = await ensureAuthenticatedState();
const browser = await chromium.launch();
const manifest = { generatedAt: new Date().toISOString(), baseURL, routes: [], overlays: [], authenticatedSweep: Boolean(authState) };
try {
  if (!overlaysOnly) {
    const publicContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const publicPage = await publicContext.newPage();
    for (const route of publicRoutes) {
      manifest.routes.push(await assertRoute(publicPage, route, false));
      console.log(`verified ${route.path}`);
    }
    await publicContext.close();
  }

  if (!authState) throw new Error("R0 authenticated sweep requires tests/current/.auth/storage-state.json or E2E_AUTH_SECRET and E2E_MERCHANT_ID.");
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: authState });
  const page = await context.newPage();
  if (!overlaysOnly) {
    for (const route of authenticatedRoutes) {
      manifest.routes.push(await assertRoute(page, route, true));
      console.log(`verified ${route.path}`);
    }
    const dynamicCandidates = [
      ["/cases", /^\/cases\/[^/]+$/],
      ["/financials/losses", /^\/financials\/losses\/[^/]+$/],
      ["/financials/recovery", /^\/financials\/recovery\/[^/]+$/],
      ["/customers", /^\/customers\/[^/]+$/],
      ["/sources/connected", /^\/sources\/(?!browse$|connected$|imports$|setup\/)[^/]+$/],
    ];
    for (const [indexPath, pattern] of dynamicCandidates) {
      const detailPath = await discoverDetailRoute(page, indexPath, pattern);
      if (!detailPath) {
        console.log(`skipped dynamic detail from ${indexPath}: no governed record is available`);
        continue;
      }
      manifest.routes.push(await assertRoute(page, { path: detailPath, exactPath: true }, true));
      console.log(`verified ${detailPath}`);
      if (detailPath.startsWith('/customers/')) {
        const evidencePath = `${new URL(detailPath, baseURL).pathname}/evidence/new`;
        manifest.routes.push(await assertRoute(page, { path: evidencePath, exactPath: true }, true));
        console.log(`verified ${evidencePath}`);
      }
    }
  }
  manifest.overlays.push(await assertOverlay(page, { route: "/controls/rules", trigger: "Create rule", roleName: "New payout rule", overlayId: "rule-builder-drawer", artifactName: "overlay-rule-builder" }));
  console.log("verified rule builder drawer");
  manifest.overlays.push(await assertOverlay(page, { route: "/settings/workspace/team", trigger: "Invite member", roleName: "Invite team member", overlayId: "invite-member", artifactName: "overlay-invite-member" }));
  console.log("verified invite member dialog");
  await context.close();
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`R0 reliability sweep passed: ${manifest.routes.length} routes, ${manifest.overlays.length} overlays.`);
