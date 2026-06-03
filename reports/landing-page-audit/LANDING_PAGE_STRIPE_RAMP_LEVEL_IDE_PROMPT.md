# One-Shot IDE Prompt: Premium Landing Page Redesign

```text
You are redesigning only the Unauth landing page. Treat this as a premium product-led landing page pass, not a copy cleanup. The target quality bar is Stripe/Ramp-level: precise hierarchy, calm confidence, excellent spacing, product UI as proof, sharp integration storytelling, and no generic SaaS filler. Do not copy Stripe or Ramp visually; use them as the quality benchmark for clarity, craft, and conversion discipline.

Workspace: /Users/malikibrahim/Downloads/Unauth

Read these first:
- reports/landing-page-audit/LANDING_PAGE_VISUAL_AUDIT_AND_IMPLEMENTATION_BRIEF.md
- app/(public)/landing/page.tsx
- app/(public)/landing/landingPageConstants.ts
- app/(public)/landing/_components/sections/LandingHeroSection.tsx
- app/(public)/landing/_components/HeroAuditCta.tsx
- app/(public)/landing/_components/sections/LandingHeaderSection.tsx
- app/(public)/landing/_components/sections/LandingShopifySection.tsx
- app/(public)/landing/_components/PipelineTabs.tsx
- app/(public)/landing/_components/PipelineTabsParts.tsx
- app/(public)/landing/_components/sections/LandingDataSchemaSection.tsx
- app/(public)/landing/_components/sections/LandingProductTierSection.tsx
- app/(public)/landing/_components/sections/LandingFaqSection.tsx
- app/(public)/landing/_components/sections/LandingFooterSection.tsx
- app/globals.css

Product truth:
Unauth is not primarily a free CSV audit tool. It is an ecommerce claim intelligence workspace. The primary setup is one live order source plus one live helpdesk:
- Order source: Shopify, WooCommerce, BigCommerce. Magento coming soon.
- Helpdesk: Gorgias, Zendesk, Freshdesk.
- CSV upload is backup/historical backfill/evaluation if a merchant is not ready to connect.

The landing page must make integrations feel inevitable and premium. CSV must feel useful but secondary.

Design goal:
Recompose the page into a high-end fintech/infrastructure landing page: product-led, visually restrained, confident, and specific. It should feel like a serious operational system for merchants handling refunds, INR claims, chargebacks, support tickets, and evidence workflows. It should not feel like a beige CSV upload campaign.

Visual direction:
- Keep the Unauth brand voice: warm, precise, merchant-controlled, privacy-aware.
- Reduce the page's current beige/rust monotony. Keep the warm paper base, but add more contrast and precision through white panels, graphite/dark product surfaces, subtle blue-gray/information accents, and green/amber only for real status semantics.
- Use real product screenshots and integration logos. Do not use abstract SVG hero art, decorative gradient blobs, bokeh, or generic SaaS illustrations.
- Use fewer, stronger sections. Avoid card soup. Cards are for provider tiles, repeated tier items, and framed product modules only.
- Make the first viewport instantly legible: what Unauth is, who it is for, how it connects, and what action to take.
- Design for dense scanability. The page should feel operational and mature, not editorially airy to the point of vagueness.
- Use crisp alignment, clear grids, stable dimensions, and consistent vertical rhythm. The page should survive 320px, 390px, 430px, tablet, 1280px, and 1440px widths without text overflow.

Primary conversion:
The primary CTA is "Create workspace" or "Create workspace - connect sources" and must route to /signup for public visitors.
Secondary CTA can be "View demo" or "Use CSV fallback". CSV fallback can route to /audit, but it must never be the primary CTA.
Do not link public primary CTAs directly to /settings/integrations because unauthenticated users redirect to login.

Required page structure:
1. Header
2. Hero: integration-first product promise with product UI proof
3. Live sources section: order source + helpdesk + Unauth workspace output
4. Product outcomes: what merchants get once connected
5. Workflow: Connect -> Sync -> Resolve -> Review
6. Evidence/workspace proof: dashboard/case file/queue screenshot area
7. Privacy/network: own-store now, thresholded network when density exists
8. Pricing/tier model, compressed and easy to scan
9. Comparison, updated away from CSV-first claims
10. FAQ
11. Footer

Hero redesign:
Replace the current "Run free audit" email capture hero. Build a more premium hero that feels like an infrastructure product:
- Left: tight copy, two CTAs, 3-4 trust/status chips.
- Right: a composed product proof surface. Use existing screenshots such as /screenshots/inbox.png, /screenshots/dashboard.png, /screenshots/evidence-packages.png, or /screenshots/case-file-full.png. Compose one dominant screenshot with one or two compact overlays, such as:
  - "Order source connected"
  - "Helpdesk connected"
  - "25 open cases"
  - "Evidence ready"
  - "CSV backfill optional"
- Do not make the hero look like a form. Do not lead with an email field.

Suggested hero copy:
Eyebrow: "Live claim intelligence for ecommerce teams"
H1: "Connect your store and helpdesk. Know which claims to trust, review, or challenge."
Subcopy: "Unauth syncs orders, fulfillment, refunds, chargebacks, and support context into one merchant-controlled workspace. Start with live sources; use CSV only for historical backfill when you need it."
Primary CTA: "Create workspace"
Secondary CTA: "View demo"
Tertiary text/chips: "Shopify / WooCommerce / BigCommerce", "Gorgias / Zendesk / Freshdesk", "CSV backfill optional", "No auto-blocks"

Header:
- Replace "Run free audit" with "Create workspace".
- Mobile CTA should be short: "Start".
- Update nav anchors to: #integrations, #workflow, #evidence, #pricing, #faq.
- Remove duplicate #how-it-works IDs.

Live sources section:
Replace the Shopify-only section with a polished integration architecture section.
It should visually communicate:
Order source + Helpdesk -> Unauth workspace.
Use real logos from public/integrations:
- shopify.svg
- woocommerce.svg
- bigcommerce.svg
- magento.svg, coming soon
- gorgias.png
- zendesk.svg
- freshdesk.svg

Make this section feel top-tier:
- Use a clean horizontal architecture on desktop.
- On mobile, stack into: Order source card, plus divider, Helpdesk card, output card.
- Include a small low-emphasis CSV fallback row: "Historical CSV backfill is available if you are not ready to connect live sources."
- Avoid overexplaining. Let the architecture, logos, and short labels do the work.

Product outcomes section:
Do not dump raw tier feature lists here. Create 3 or 4 premium outcome modules:
- "Own-store truth" - refund, INR, chargeback, repeat claim analytics.
- "Claim operations" - queue, assignments, evidence workflow, helpdesk widget.
- "Customer context" - dossier, search, watchlist, claim history.
- "Network when ready" - thresholded cross-merchant signal, identity graph, APIs on Growth.

Each module should have a short headline, one tight sentence, and one concrete proof point. Avoid long paragraphs.

Workflow section:
Replace the current CSV-first pipeline.
Title: "Live sources in. Case-ready decisions out."
Steps:
1. Connect - order source plus helpdesk.
2. Sync - orders, refunds, fulfillment, claims, support context.
3. Resolve - own-store identity and claim patterns; thresholded network only when available.
4. Review - confidence grade, evidence context, queue action.

Do not use /screenshots/pipeline-upload-cohesive.png as the first proof image unless it is clearly labeled as fallback/backfill. Prefer inbox/dashboard/case file visuals.

Data schema section:
Reframe as current data model, not CSV.
Title: "Use the data your store and helpdesk already produce."
Body: "Live integrations keep order, fulfillment, refund, claim, and support context current. CSV backfill fills historical gaps."
Panel title: "LIVE SOURCES + HISTORICAL BACKFILL"
Include both commerce and helpdesk fields. CSV can be mentioned in a subordinate row only.

Pricing/tier section:
Compress it. The current tier cards are too dense and push integrations too far down the page.
Keep four public tiers but limit each to 3-5 bullets:
- Unauth: own-store analytics, chargeback analytics, evidence export, watchlist hits, one store.
- Pro: claim queue, evidence workflow, helpdesk widget, customer dossier/search.
- Growth: network signal, identity graph, lookup/quick-score API, multi-store.
- Scale: custom limits, SLA, security review, onboarding/custom integrations.
Pricing cards should look premium and calm, not like a raw entitlement table. Put detailed lists in FAQ or leave them out.
Replace awkward notes like "Billing inactive until threshold" with clearer language: "No charge until billing activates. Founding partners keep protected rates."

Comparison:
Update stale CSV-first row:
- Replace "Works from CSV upload - no code required"
- Use "CSV backfill available when integrations are not connected"
Make comparison less huge if it feels heavy. The comparison should reinforce "post-purchase claim intelligence" versus blocklists/checkout scoring.

FAQ:
Replace "Run a free audit" CTA with "Create workspace".
Change "Do I need to integrate anything?" to:
"For live monitoring, yes: connect one order source and one helpdesk. CSV import is available for historical backfill or evaluation if you are not ready to connect yet."
Fix mobile heading spacing so it does not render as "askbefore".

Footer:
Replace "Audit portal" and "Book a pilot" with:
- "Create workspace"
- "CSV fallback"
- "Interactive demo"
Keep legal links.

CSS/mobile requirements:
- Fix `.ua-landing-headline-accent` so it wraps on mobile. Remove/override `white-space: nowrap`.
- Check `.ua-landing-faq-heading-italic` and any nowrap spans so mobile text never clips.
- Ensure no horizontal overflow at 320px, 390px, or 430px.
- Preserve or improve existing responsive screenshot behavior.
- Keep border radius at 8px or less.
- Do not use viewport-width font scaling beyond existing sensible clamp usage.
- Do not add decorative orbs/blobs.
- Avoid a single-color beige/rust page. Introduce contrast through product surfaces, logo tiles, status semantics, and dark/light section pacing.

Stale language to remove or demote:
- "Run free audit" as a primary CTA
- "CSV in. Actionable cases out."
- "CSV upload - works today"
- "No integration required"
- "Connect Shopify in under a minute" as the whole integration story
- "Do I need to integrate anything? No."
- "Works from CSV upload - no code required"

Allowed CSV language:
- "CSV fallback"
- "historical CSV backfill"
- "CSV import is available if you are not ready to connect"
- "optional historical import"

Acceptance checks:
After changes, run:
1. npm run build, or the fastest valid local build/type check if build is too slow.
2. Open http://localhost:3000/landing.
3. Capture/inspect 1440x900, 1280x720, 390x844, and 320x667.
4. Confirm first viewport primary CTA is not CSV/free-audit.
5. Confirm integrations appear immediately after the hero and show both order source and helpdesk.
6. Confirm CSV is only fallback/backfill.
7. Confirm no duplicate section IDs.
8. Confirm no horizontal overflow or clipped hero/FAQ text.
9. Run:
   rg -n "Run free audit|CSV in|No integration required|CSV UPLOAD|Connect Shopify in under a minute|id=\"how-it-works\"" app/\(public\)/landing
   Expected: no matches, except intentional fallback/backfill language if the exact phrase is changed to include fallback/backfill.

Implementation constraint:
Edit only landing-page files and landing CSS needed for this redesign. Do not refactor authenticated app pages, signup internals, billing logic, Supabase code, product entitlements, or unrelated components.

Final deliverable:
Make the landing page feel like a premium, product-led operational intelligence company: clear enough for a founder to understand in 5 seconds, credible enough for a fraud/ops lead to trust, and polished enough that the integration-first product feels inevitable.
```
