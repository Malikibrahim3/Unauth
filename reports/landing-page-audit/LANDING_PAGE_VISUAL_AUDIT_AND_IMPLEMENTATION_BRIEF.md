# Landing Page Visual Audit and Implementation Brief

Date: 2026-06-03
Scope: landing page only. Do not refactor the authenticated app, signup flow, billing model, database, or non-landing public pages in this pass.

## Product Understanding

Unauth is a merchant-side trust and claims intelligence product for ecommerce teams.

The complete live product setup is:

- An order source: Shopify, WooCommerce, or BigCommerce. Magento is coming soon.
- A helpdesk/support source: Gorgias, Zendesk, or Freshdesk.
- CSV import is a backup path for historical backfill, evaluation, and merchants who are not ready to connect live sources yet.

The product turns order, fulfillment, refund, dispute, and support context into:

- Own-store refund, INR, chargeback, and repeat-claimer intelligence.
- Claim review workflow, customer dossier/search, watchlist, and evidence pack workflow on Pro.
- Cross-merchant network signal, identity graph, lookup/quick-score APIs, and multi-store on Growth, with aggregate/thresholded signals only.
- Custom limits, SLA, security review, and custom integrations on Scale.

Important positioning: Unauth is not "a free CSV audit tool." The base Unauth product is the own-store intelligence layer. CSV upload should not be the first promise unless it is explicitly framed as fallback or historical backfill.

## Evidence Captured

Desktop and mobile screenshots were saved here:

- `reports/landing-page-audit/screenshots/desktop-00-hero.png`
- `reports/landing-page-audit/screenshots/desktop-01-product-tiers.png`
- `reports/landing-page-audit/screenshots/desktop-02-pricing-integrations.png`
- `reports/landing-page-audit/screenshots/desktop-04-pipeline.png`
- `reports/landing-page-audit/screenshots/desktop-05-schema-dashboard.png`
- `reports/landing-page-audit/screenshots/desktop-06-comparison.png`
- `reports/landing-page-audit/screenshots/desktop-07-faq.png`
- `reports/landing-page-audit/screenshots/pw-mobile-00-hero.png`
- `reports/landing-page-audit/screenshots/pw-mobile-03-integrations.png`
- `reports/landing-page-audit/screenshots/pw-mobile-04-pipeline.png`
- `reports/landing-page-audit/screenshots/pw-mobile-05-schema.png`
- `reports/landing-page-audit/screenshots/pw-mobile-06-faq.png`

## Audit Verdict

The page has a strong visual foundation: restrained brand, real app screenshots, credible enterprise-ish tone, and a distinctive serif/sans pairing. But it is not yet top-level because the message hierarchy is behind the product reality.

The highest-impact issue is not aesthetics. It is that the page still sells the old CSV/free-audit funnel while the app now wants integrations first. The hero, header CTA, pipeline, schema section, FAQ CTA, comparison matrix, and footer all keep pulling the visitor back to CSV/audit language.

## Highest Priority Problems

1. The first viewport has conflicting CTAs.

The body says "connect Shopify or upload a CSV," but the nav, hero form, and mobile header all say "Run free audit." That makes CSV feel primary and integrations feel optional. Change the primary action everywhere to create/connect a workspace.

2. Mobile H1 has a real visual bug.

`.ua-landing-headline-accent` uses `white-space: nowrap`, causing the italic H1 line to overflow off the right side at 390px. Fix this for 320px, 390px, and 430px.

3. Integrations are buried below product tiers and pricing.

On desktop, pricing appears before the integration story. On mobile, users scroll through a long tier card and pricing before they learn what to connect. The integration section should appear immediately after the hero.

4. Integration story is too narrow.

The page says "Shopify integration," but the app supports Shopify, WooCommerce, BigCommerce, Gorgias, Zendesk, and Freshdesk. The landing must show the required pair: order source plus helpdesk. Shopify can still be the lead example, not the entire story.

5. CSV remains first-class in key sections.

Stale phrases to replace or demote:

- "Run free audit"
- "CSV in. Actionable cases out."
- "CSV upload - works today"
- "No integration required"
- "Works from CSV upload - no code required"
- "Do I need to integrate anything? No."

Keep CSV, but frame it as "historical CSV backfill" or "CSV fallback if you are not ready to connect."

6. Product tiers are too dense for a landing page.

The "What you get" cards copy raw tier features into tall cards. On desktop, cards run below the viewport; on mobile, the first card becomes a long wall before users see the integration promise. Compress this section.

7. Section order and numbering are inconsistent.

`LandingShopifySection` and `PipelineTabs` both use `id="how-it-works"` and both display section 2. This breaks nav clarity and makes the page feel assembled rather than intentional.

8. FAQ and footer still point users back to `/audit`.

FAQ CTA says "Run a free audit." Footer says "Audit portal." These should be secondary/fallback, not primary product links.

## Required Landing-Only Implementation

### 1. Reorder the page

Edit `app/(public)/landing/page.tsx`.

Recommended order:

1. Header
2. Hero
3. Integrations section
4. Product outcomes section
5. Workflow/pipeline section
6. Dashboard/evidence section
7. Network/privacy section
8. Pricing
9. Comparison
10. FAQ
11. Footer

Move pricing below the integration and product outcome narrative. Do not make the visitor read pricing before they understand the live setup.

### 2. Replace the hero CTA and copy

Edit:

- `app/(public)/landing/_components/sections/LandingHeroSection.tsx`
- `app/(public)/landing/_components/HeroAuditCta.tsx`
- `app/(public)/landing/_components/sections/LandingHeaderSection.tsx`

Do one of these:

- Preferred: replace the email form with two clear link buttons.
- Acceptable: keep the email form, but route to `/signup`, not `/audit`, and change the button label.

Suggested hero copy:

Eyebrow:

`Live claim intelligence for ecommerce teams`

H1:

`Connect your store and helpdesk. See which claims deserve trust, review, or challenge.`

Subcopy:

`Unauth syncs your order source and support desk, resolves own-store identity and claim patterns, and assembles evidence context for refunds, INR claims, and chargebacks. CSV import stays available for historical backfill when you need it.`

Primary CTA:

`Create workspace - connect sources`

Secondary CTA:

`Use CSV fallback`

CTA routing:

- Primary should point to `/signup` for public users.
- CSV fallback can point to `/audit` or a lower section anchor if the page has a CSV fallback block.
- Do not link public primary CTAs directly to `/settings/integrations`, because unauthenticated users redirect to login.

Header:

- Desktop CTA: `Create workspace`
- Mobile CTA: `Start`
- Keep `Sign in`.
- Update nav anchors after section IDs are fixed.

### 3. Replace Shopify-only section with an integrations-first section

Edit or replace:

- `app/(public)/landing/_components/sections/LandingShopifySection.tsx`
- `app/(public)/landing/landingPageConstants.ts`

Rename optional, but the component should visually become "Integrations," not "Shopify."

Suggested section:

Eyebrow:

`01 - LIVE SOURCES`

Title:

`Connect live sources first. Use CSV only for backfill.`

Body:

`Unauth needs an order source and a helpdesk to monitor live claims. Orders provide purchase and fulfillment context; the helpdesk provides claim history and dispute context. CSV import is still there for historical backfill or evaluation.`

Visual structure:

- Left column/card: "Order source" with Shopify, WooCommerce, BigCommerce. Magento marked coming soon.
- Middle connector: plus sign or "plus".
- Right column/card: "Helpdesk" with Gorgias, Zendesk, Freshdesk.
- Output card: "Unauth workspace" with own-store intelligence, evidence workflow, claim review queue.
- Small tertiary row: "CSV fallback: historical order import, optional, no live monitoring."

Use actual assets from `public/integrations/`:

- `shopify.svg`
- `woocommerce.svg`
- `bigcommerce.svg`
- `gorgias.png`
- `zendesk.svg`
- `freshdesk.svg`
- `magento.svg` for coming soon

Do not over-card the section. One clean band with compact provider tiles is enough.

### 4. Change the pipeline from CSV-first to live-source-first

Edit:

- `app/(public)/landing/_components/PipelineTabs.tsx`
- `app/(public)/landing/_components/PipelineTabsParts.tsx`

Replace:

`CSV in. Actionable cases out.`

With:

`Live sources in. Case-ready decisions out.`

Suggested steps:

1. `Connect` - order source plus helpdesk.
2. `Sync` - orders, refunds, fulfillment, claims, support context.
3. `Resolve` - own-store identity and claim patterns, network only when thresholded density exists.
4. `Review` - confidence grade, evidence context, queue action.

CSV should appear as one sentence in step 1 or a small fallback note:

`CSV backfill is available when live sources are not connected yet.`

Replace the upload screenshot in step 1 if possible with `/screenshots/inbox.png`, `/screenshots/dashboard.png`, or a new compact integration/workspace visual. Do not make the first pipeline screenshot a CSV uploader.

### 5. Fix the data schema section

Edit:

- `app/(public)/landing/_components/sections/LandingDataSchemaSection.tsx`

Replace the framing:

- From: `Use data you already have. Standard order, refund, delivery, and payment exports. No integration required.`
- To: `Use the data your store and helpdesk already produce. Live integrations keep it current; CSV backfill fills historical gaps.`

Panel title:

- From: `CSV UPLOAD - WORKS TODAY`
- To: `LIVE SOURCES + HISTORICAL BACKFILL`

Panel meta:

- Include order sources and helpdesk sources, not only CSV export platforms.

Checkout embed row:

- Keep future-facing only if accurate, but do not make it compete with current integrations.

### 6. Compress the tier/product section

Edit:

- `app/(public)/landing/_components/sections/LandingProductTierSection.tsx`
- `lib/billing/landingTierChart.ts` only if copy source must change.

Landing cards should not dump every tier feature. Limit each tier card to 3-5 bullets and push detail into FAQ or pricing.

Recommended card model:

- Unauth: own-store truth, order/refund/chargeback analytics, evidence export, watchlist hits, one connected store.
- Pro: claim queue, evidence workflow, helpdesk widget, customer dossier/search.
- Growth: network signal, identity graph, lookup/quick-score API, multi-store.
- Scale: custom limits, SLA, security review, onboarding/custom integrations.

Move pricing lower and keep pricing cards short. Avoid insider phrasing like "Billing inactive until threshold" as the dominant pricing note. Prefer:

`No charge until billing activates. Founding partners keep protected rates.`

### 7. Update comparison, FAQ, footer copy

Edit:

- `app/(public)/landing/landingPageConstants.ts`
- `app/(public)/landing/_components/sections/LandingComparisonSection.tsx`
- `app/(public)/landing/_components/sections/LandingFaqSection.tsx`
- `app/(public)/landing/_components/sections/LandingFooterSection.tsx`

Comparison row:

- Replace `Works from CSV upload - no code required`
- Use `CSV backfill available when integrations are not connected`

FAQ:

- Change `Do I need to integrate anything?` answer from "No" to:

`For live monitoring, yes: connect one order source and one helpdesk. CSV import is available for historical backfill or evaluation if you are not ready to connect yet.`

FAQ CTA:

- Replace `Run a free audit` with `Create workspace` or `Connect sources`.

Footer product links:

- Primary: `Create workspace`
- Secondary: `CSV fallback`
- Demo: `Interactive demo`

### 8. Fix CSS and mobile defects

Edit `app/globals.css`.

Required fixes:

- Remove or override `white-space: nowrap` from `.ua-landing-headline-accent` at mobile sizes. The H1 must wrap naturally at 320px and 390px.
- Check `.ua-landing-faq-heading-italic` and the FAQ heading spans. Ensure the accessible/rendered text has a visible and semantic space between "ask" and "before."
- Keep headline font sizes stable. Do not use viewport-width font hacks beyond existing clamp patterns.
- Avoid adding more beige-on-beige cards. Use provider logos, small status dots, and restrained green/info accents to break up the current cream/rust monotone.
- Keep card radius at 8px or less unless using the existing 6px token.

### 9. Fix anchors and section numbering

Use unique IDs:

- `#integrations`
- `#workflow`
- `#evidence`
- `#network`
- `#pricing`
- `#faq`

Remove duplicate `id="how-it-works"`.

Suggested numbering after reorder:

- 01 Live sources
- 02 What Unauth does
- 03 Workflow
- 04 Evidence workspace
- 05 Network/privacy
- 06 Pricing
- 07 Compare
- 08 FAQ

Or remove visible section numbers entirely if they start to feel editorial/internal.

## Copy Rules for the IDE Agent

Use these terms:

- `live sources`
- `order source`
- `helpdesk`
- `own-store intelligence`
- `claim confidence`
- `evidence workflow`
- `historical CSV backfill`
- `CSV fallback`
- `thresholded network signal`
- `merchant-controlled review`

Avoid making these primary:

- `free audit`
- `CSV in`
- `no integration required`
- `no developer required`
- `checkout embed coming soon`

Avoid overclaiming:

- Do not imply raw customer records are shared across merchants.
- Do not imply network intelligence is always available.
- Do not imply checkout controls are live.
- Do not guarantee chargeback wins.

## Acceptance Checks

Run these checks after implementation:

1. `npm run build` or the repo's fastest reliable type/build check.
2. Open `http://localhost:3000/landing`.
3. Capture/check desktop at 1440x900 and mobile at 390x844 and 320x667.
4. Confirm no H1, FAQ, CTA, chip, or pricing text overflows horizontally.
5. Confirm the first viewport has one primary action and it is not `Run free audit`.
6. Confirm integrations appear before pricing.
7. Confirm order source plus helpdesk is visible above the fold or immediately below it.
8. Confirm CSV is framed only as fallback/backfill.
9. Confirm no duplicate section IDs.
10. Run:

```bash
rg -n "Run free audit|CSV in|No integration required|CSV UPLOAD|Connect Shopify in under a minute|id=\"how-it-works\"" app/\\(public\\)/landing
```

Expected: no matches, except intentional CSV fallback language that clearly says fallback/backfill.

## Suggested IDE Prompt

Use this prompt with the implementation model:

```text
You are editing only the Unauth landing page. First read reports/landing-page-audit/LANDING_PAGE_VISUAL_AUDIT_AND_IMPLEMENTATION_BRIEF.md, then update the landing page to prioritize integrations over CSV. The product's primary setup is an order source plus a helpdesk: Shopify/WooCommerce/BigCommerce plus Gorgias/Zendesk/Freshdesk. CSV upload is only fallback/historical backfill. Keep the existing premium visual style, but fix mobile overflow and remove stale free-audit/CSV-first messaging. Do not refactor authenticated app pages or billing logic. After editing, verify desktop 1440x900 and mobile 390x844/320x667, and run the stale-copy rg check from the brief.
```
