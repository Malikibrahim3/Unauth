# Unauth — UX/UI Implementation Audit

Captured 2026-05-31 against the running app (localhost:3000), signed in as the **Elara & Co Apparel** demo merchant (`demo@unauth.app`, 49 customer profiles, 3 completed audits, 6 evidence packages, Zendesk connection on file). Full-scroll screenshots + per-page text dumps live in `screenshots/audit/` (`-fold.png` = above the fold; `-secNN.png` = section shots down the full inner scroll; `text/*.txt` = exact copy). Findings are based on the rendered screenshots, not code reading; file/token references are included only to make each fix directly implementable. No scoring, matching, or cluster logic is touched by any recommendation here.

One structural note that shapes everything below: **the app's own helpdesk widget is the design north star and it already gets this right.** The Zendesk setup page (`15-settings-zendesk-sec00.png`) renders a "Sidebar preview" where `DEFINITE` carries a **green dot** above a plain factual claims list. Every merchant-dashboard surface contradicts that preview by rendering `DEFINITE` as a **red alarm badge**. The dashboard didn't fail to find a visual language — it diverged from the one the product already ships.

---

## Surface 1 — Customer profile (`/customers/[id]`) — the most important page

Screens: heavy case `03-customer-claims-heavy-*` (Nora Kessler, DEFINITE, 100 orders, 49 refunds, 8 chargebacks, content height **13,667px ≈ 15 viewports**); clean case `05-customer-clean-*` (Arun Shaw, **0 claims, 0 chargebacks, $0.00 refunded, single store**, content height **4,298px ≈ 5 viewports**).

**What the eye lands on first:** a red `⚠ Definite` badge next to the customer name, with a red "Exposure $5,203.28" / "$828.12" figure and a strip of dark-red bars immediately below. The first impression is "fraud alert," not "identity resolved."

**Layout issues**
- **No clean state exists.** The spotless customer (Arun: Claims 0 (0.0%), Refunded $0.00, Chargebacks 0) is rendered with the *identical* heavy dossier as the 49-refund/8-chargeback customer — red Definite badge, "Case at a glance," red cadence bars, an 18-row "Identity timeline" with `▲ VARIANT` flags on every address/IP/card, a 25-event "Behavior roadmap," and the tags **`CARD REUSE OBSERVED`** and **`REFUND VELOCITY 14D`** (`05-customer-clean.txt` lines 251–255) — on a customer who has *never refunded*. The product brief says a DEFINITE match with no claims "should feel like a green confirmation — resolved and clean." It currently feels like an open investigation.
- **Two redundant full-length chronologies stacked vertically.** "Identity timeline" (a field-change table, `-sec02`→`-sec06`) and "Behavior roadmap" ("112 events" / "25 events", an order+change feed, `-sec09`→`-sec15`) narrate the *same* address/IP/card changes over time. On the heavy profile these two lists alone span roughly 9 of the 15 viewports.
- **Column collapse / empty right gutter.** Through the entire "Identity timeline" and "Behavior roadmap" (thousands of px — see `-sec06`, `-sec09`, `-sec12`, `-sec15`) the content occupies only the **left ~65%**; the **right ~35% is empty white**. The right-hand panels ("Identity details," "Network footprint," "Case activity") end within the first ~2 viewports while the left column runs for 10+ more. This is exactly the broken two-column model the brief warns about, mirrored: the sidebar dies while the main column runs on for many screens.
- **Above the fold is spent on the alarm, not the answer.** The agent's actual question — "is this the same person, and what's their claims record?" — is answered by the grade + the "This store / Merchant-wide network" claims counts. Those claims counts sit *below* the fold, beneath the metric cards and the red cadence bars.
- The 5th metric-card slot is **empty grey** on the clean profile (only grade / cross-merchant / exposure / last-seen are populated) — see `05-customer-clean-fold.png`, far-right card.
- The "Cross-merchant" metric value wraps brutally ("6 / merchants", "This / store / only") because the card is too narrow for the string (`03-…-sec00`, `05-…-fold`).

**Hierarchy issues**
- The dominant element is the red badge + red money figure. The **grade should be dominant and calm**; the claims record second; everything else tertiary.
- **The grade is shown three different ways at once:** a header word-badge ("Definite"), a big letter "A" in an "Identity grade" card, and — lower down in "Merchant dossier" — a *contradicting* "Profile confidence 77%" (`05-customer-clean.txt` line 438). Pick one canonical representation; "A / Definite / 77%" on one page reads as three different scores.
- "Case at a glance" duplicates numbers that also appear in the metric cards, in "Evidence scope → This store," and again in "Merchant dossier." Orders / Exposure / Claims / Refunded are printed **four times** per profile.

**Colour / tone issues**
- The `Definite` badge uses `GRADE_COLOURS.definite → var(--sev-definite)` = **`#B42318` (red)** (`lib/utils/confidenceStyles.ts:10`, `app/globals.css:273`). The most-certain identity grade is painted the most alarming colour in the system.
- "Exposure," "Total spend," and every refund/order amount use `--data-currency` = **`#7B2D26`** (`globals.css:286`) — which is literally `--brand-rust` (`globals.css:13`). All money renders blood-red as a design token. Money is factual data; it should not alarm.
- The "Flagged 11/28/2025" date in "Case at a glance" renders in the same warm rust as the currency, compounding the alarm on what is just a *first-seen* date.
- The cadence/activity bars and the "Behavior roadmap" mini-bars are dark red (`03-…-sec00`, `-sec09`). Red bars = security-console vocabulary on neutral activity data.
- A calm green token **already exists and is unused**: `--sev-clear: #2F6B43` / `--sev-clear-fill: #E8F1E6` (`globals.css:279`). `GRADE_COLOURS` never references it.

**Vocabulary issues** (all from `03-…`/`05-…` text dumps)
- "Case at a glance," "Merchant dossier," "Case activity" — case-file framing.
- "Behavioral history," "Behavior roadmap," "…match known detection criteria" — assessment / fraud-detection framing.
- All-caps signal tags: `CROSSMERCHANT IDENTITY MATCH`, `REFUND RATE OVER 60PCT`, `PAYMENT FINGERPRINT MATCH`, `ADDRESS NORMALIZATION MATCH`, `CARD REUSE OBSERVED`, `REFUND VELOCITY 14D`, `NETWORK DEVICE LINK`, `ADDRESS CLUSTERING` — these are fraud-signal names, not identity facts.
- "Exposure" (should be "Order value" / "Total value"); "Flagged" (this is a first-seen date, nothing was flagged).
- `▲ VARIANT` on every identity-timeline row frames normal multi-address/multi-card history as deviation.

**Fixes**
1. **Build a real clean state, switching on `total_refund_claims === 0 && total_chargebacks === 0`.** When true: render the grade badge in green (`--sev-clear`), show a one-line "Clean record — no claims or chargebacks in your data," collapse "Behavior roadmap" and the alarm-tag row, and keep the page to header + identity summary + identity details (target ≤ 2 viewports). Use the widget preview in `15-settings-zendesk-sec00.png` as the visual reference.
2. **Remove red from the grade entirely.** In `confidenceStyles.ts`, map grade colour by *certainty*, not severity: `definite → --sev-clear (green)`, `probable → --sev-probable (amber)`, `possible → --sev-neutral (slate)`, `weak → --ink-tertiary (grey)`. The "factual flag" feeling for a high-claims customer comes from the **claims numbers**, not from reddening the grade. (Also fix `--sev-possible`, referenced in `confidenceStyles.ts:12` but undefined in `globals.css` — the Possible badge currently falls back to an inherited colour.)
3. **Recolour factual data to neutral ink.** Set `--data-currency` to `--ink-primary` (`#1A1612`) so amounts read as data; reserve `#7B2D26` rust for brand/CTA only. Render cadence/roadmap bars in `--ink-tertiary`/`--surface-border`, not red.
4. **Merge the two chronologies into one.** Keep a single "Order & claim history" timeline (the "Behavior roadmap" feed is the more useful of the two — it has orders, amounts, and claim events inline). Delete the standalone "Identity timeline" field-change table or demote it to a collapsible "Identifier changes (18)" disclosure. This alone removes ~6 viewports from the heavy profile.
5. **Fix the column model.** The page is functionally single-column once the right panels end. Make "Identity details / Network footprint / Notes" a **sticky right rail** (`position: sticky; top`) so it stays beside the long history instead of dying at viewport 2, OR restructure to a single centered column with the identity summary as an inset panel at top. Either way, no 35%-wide empty gutter beside 10 viewports of table.
6. **Promote the answer above the fold.** Order the page: grade (calm) → claims record ("This store: 14 of 27 orders had claims · Merchant-wide: 8 chargebacks") → identity evidence → CTAs. Move "Case at a glance" out; its numbers are redundant.
7. **Relabel** "Exposure"→"Order value," "Flagged [date]"→"First seen [date]," "Case at a glance"→"Summary," "Merchant dossier"→"Record," "Behavioral history"/"Behavior roadmap"→"Order & claim history," "Case activity"→"Activity." Convert all-caps detection tags to sentence-case factual descriptors ("Matches across 6 merchants," "Refund rate 60%," "Shared payment card," "Shared address") and **do not render them on profiles with zero claims**.

---

## Surface 2 — Customers list (`/customers`)

Screens: `02-customers-list-fold.png`, `-sec00/-sec01`, `02-customers-list.txt`.

**What the eye lands on first:** a "Sort: **Highest risk**" control and a column of red "A" badges with red refund counts — a fraud-triage queue.

**Layout issues** — Solid, readable table; this surface is structurally fine. Five stat cards (Profiles 49 / Watchlisted 7 / New status 21 / Has refunds 6 / Linked identities 5) sit above a paginated table (Customer / Confidence / Network / Orders / Refunds / Review →).

**Hierarchy issues**
- The page is built as a **work queue** ("Review →" on every row, status pills New/Review/Contacted/Resolved/Cleared, "New to review," "Customer case file / What happened, in order" drawer). But per the brief, the merchant dashboard is for *managing data and reviewing linked identities* — the ticket-by-ticket triage happens in the helpdesk widget, not here. The queue framing implies the merchant must "work" all 49 customers.
- Every visible row is tagged `WATCHED` (`02-…-fold.png`) — when 7 of 7 on-screen rows are watched the tag is noise and the real signal (which are genuinely watchlisted) is lost.

**Colour / tone issues**
- Confidence badges A=`#B42318` red, B=amber, C=slate; "Refunds" column values in red. Same inversion as the profile: highest-confidence identity = reddest badge.

**Vocabulary issues**
- Default sort "**Highest risk**"; sort options "Most chargebacks," "Highest refund rate," "Fastest claims"; saved views "High-confidence **unresolved**," "**Repeat refund claims**," "**Fast claimants**"; quick filter "**New to review**." This is a fraud-analyst console's vocabulary.

**Fixes**
- Rename default sort "Highest risk" → "Highest confidence." Keep refund-rate/chargeback sorts but label them neutrally ("Most refund claims," not "Highest refund rate").
- Recolour the Confidence column via the same grade remap as Surface 1 (green/amber/slate/grey, no red). Render "Refunds" count in neutral ink.
- Show `WATCHED` only on rows that differ from the page default; if the list is filtered to the watchlist, drop the per-row tag entirely.
- Soften the queue framing for a management surface: "Review →" → "View →"; "New to review" → "New"; rename the "Customer case file" drawer "Customer summary."

---

## Surface 3 — Dashboard (`/dashboard`)

Screens: `01-dashboard-fold.png`, `-sec00/-sec01`, `01-dashboard.txt` (content height 879px — fits one viewport, good).

**What the eye lands on first:** the headline metric "**Exposure at risk $8,852.57 / Flagged order value**" and a left column titled "Flagged customers to review."

**Layout issues** — Two-column dashboard (left: flagged-customer list; right: integrations / evidence / recent runs / exposure / activity). It fits one screen, so no scroll-depth problem. But `$8,852.57` appears **twice** (hero metric card *and* a right-column "Exposure at risk" card) — duplicated hero stat.

**Hierarchy issues**
- The hero is a fraud number ("Exposure at risk," "Flagged order value"). For an identity-resolution management surface the lead metric should be coverage/identity-oriented ("Linked identities," "Profiles resolved," "Evidence packages ready"), not a dollar threat figure.
- "Flagged customers to review" lists the **same customer repeatedly** (Nora Kessler appears 5× with different order IDs and "5 signals matched · 114d ago") — it's a list of flagged *orders* mislabeled as customers, so the section reads as one person spamming the queue.

**Colour / tone issues** — Red `A DEFINITE` + `NETWORK` badges in the list; red exposure figure. Same grade/currency recolour applies.

**Vocabulary issues**
- Subtitle: "**Investigation intelligence** — look up customers, export evidence, and take findings back to your helpdesk."
- Banner: "Operating in **Siloed Mode** — analysing your store data only. **Connect to the network** to expand coverage." ("Siloed Mode" / "the network" is interface jargon.)
- "Exposure at risk," "Flagged order value," "Flagged customers to review," "X signals matched."

**Fixes**
- Replace the hero metric "Exposure at risk / Flagged order value" with an identity/coverage metric; if a value figure is kept, label it "Order value linked to matched identities" and render it in neutral ink.
- De-duplicate the flagged-customers list to one row per customer (show "+4 more orders" rather than five Nora rows), and rename it "Customers with claim history" or "Recently matched customers."
- Rewrite the subtitle: "Look up customers, review linked identities, and export evidence for your helpdesk." Replace "Siloed Mode / Connect to the network" with plain copy: "Showing your store's data only. Connect more sources to widen identity coverage."
- Remove the duplicate "$8,852.57" card.

---

## Surface 4 — Audit results (`/audit/[runId]`)

Screens: `09-audit-results-sec00.png`, `-sec01`, `09-audit-results.txt` (content 1,607px).

**What the eye lands on first:** the green "● completed" pill and "Audit results" title — good — followed immediately by a contradiction (see below).

**Layout issues — this page is a reporting dashboard, which the product explicitly says it is not.** The same four-number distribution (Definite 3 / Probable 5 / Possible 6 / Weak 55) is rendered **four times**: "Match strength breakdown" (stacked bar + list, `-sec00`), the A/B/C/D legend cards (`-sec00/01`), "Match distribution" (bar + list, `-sec01`), and "Customers by match confidence" (four vertical bars, `-sec01`) — plus a fifth "Overall composition" with/without-signals bar. That is vanity analytics.

**Hierarchy issues**
- "First insight: **No linked identities** in your order history yet" sits directly above "Status: **10 orders with likely identity links**" and "Definite 3." The page leads with a contradiction between cross-merchant linking (0) and within-store matches (10). The headline should state the within-store result the agent can act on.

**Colour / tone issues** — A/B/C/D cards: A red, B amber, C dark-red, D pink — an all-warm scale with the most-confident tier reddest. Apply the grade remap (Definite→green).

**Vocabulary issues** — "Anchor metric" (`-sec00`, an unexplained label over the number 69); "Max score" column header in "Top matched profiles" (`-sec01`) — fraud-score language; should be "Confidence."

**Fixes**
- Keep **one** distribution visualization (the "Match strength breakdown" stacked bar with counts+%). Delete "Match distribution," "Customers by match confidence," and "Overall composition." This removes ~1 viewport and the reporting-tool feel.
- Resolve the headline contradiction: lead with "10 of 69 orders matched a known identity · 0 linked across other merchants."
- Rename "Anchor metric" → "Orders analysed"; "Max score" → "Confidence."
- Recolour the A/B/C/D tiles via the grade remap.

---

## Surface 5 — Upload / New audit (`/upload`)

Screens: `08-upload-fold.png`, `-sec00/01`, `08-upload.txt` (content 1,259px).

**What the eye lands on first:** "Upload a CSV export of your orders to detect identity matches and repeated claim patterns" + a drop zone. **On-message and clean.**

**Layout issues** — A step scaffold ("Upload / Map & run / Output / Audit run / Review queue") plus a "Source CSV / Max file 200MB / Max rows 500k / Flow" spec strip sit above the actual dropzone, pushing the primary action ("Drop one or more CSVs here") down. The spec strip is decoration competing with the CTA.

**Hierarchy / tone / vocabulary** — Largely correct. Copy says "matched" not "flagged," "identity matches and repeated claim patterns." This is a model for tone.

**Fixes**
- Lift the dropzone to the top; demote the "Max file / Max rows / Flow" spec strip to small print beneath it. Keep "Recent imports" (good).
- Minor: the page title is "New audit" while the nav item is "New audit" and the result is an "audit" — consistent, fine.

---

## Surface 6 — Settings → Integrations (`/settings/integrations`)

Screens: `14-settings-integrations-sec00.png` (content 947px).

**What the eye lands on first:** a clean two-pane settings layout — left sub-nav, right cards (Shopify / API keys / Gorgias / Zendesk). **This is the best-executed surface in the app** and should be the structural template for others.

**Issues**
- Copy is on-message ("Surface identity confidence and claims history inside your helpdesk sidebar"). Buttons are brand-rust — correct usage of the red (CTA, not alarm).
- One **state bug to verify**: this merchant has an *active* Zendesk connection on file, yet the Zendesk card shows "Not connected." Confirm the card reads `support_provider_connections` rather than a separate flag.

**Fixes** — Verify the Zendesk connection-state read. Otherwise leave as-is and reuse this two-pane pattern elsewhere.

---

## Surface 7 — Zendesk setup (`/settings/integrations/zendesk`)

Screens: `15-settings-zendesk-sec00.png` (content 934px).

**What the eye lands on first:** "Connect Zendesk" + a clear 4-step install and, below, the **"Sidebar preview"** of the real widget.

**Issues**
- Subtitle: "**Add Unauth fraud intelligence to every support ticket**." "Fraud intelligence" mislabels the product (identity confidence + claims facts) at the exact moment a merchant is deciding to install it.
- The "Sidebar preview" is the **correct** design: green `DEFINITE`, "Matched on email + shipping address," "CLAIMS ON RECORD: 2 refunds · your store / 4 refunds across 3 merchants," "View Profile / Get PDF." Calm, factual.

**Fixes**
- Subtitle → "Show identity confidence and claims history on every support ticket."
- Adopt the preview's green-DEFINITE + factual-list treatment as the canonical grade styling across the dashboard (Surfaces 1–4).

---

## Surface 8 — Gorgias setup (`/settings/integrations/gorgias`)

Screens: `16-settings-gorgias-sec00.png` (content 1,390px).

**What the eye lands on first:** "Connect Gorgias" + a well-built API-credentials form (account domain / display name / API email / API key) with strong helper text ("Your API key is stored encrypted… never shown to other merchants").

**Issues**
- Same "**Add Unauth fraud intelligence to every support ticket**" subtitle.
- Connection UX differs from Zendesk (form vs zip-download) — acceptable, since Gorgias uses API keys, but the two setup pages don't visually rhyme (Zendesk has a preview card; Gorgias has none). Consider adding the same "Sidebar preview" to Gorgias for parity.

**Fixes** — Same subtitle rewrite as Zendesk; add the sidebar preview for parity.

---

## Surface 9 — Watchlist (`/watchlist`)

Screens: `13-watchlist-full.png` (content 842px — fits one screen).

**What the eye lands on first:** "Watchlist / Customers you're monitoring across future audits" + five stat cards + a table.

**Issues**
- Three of the five "stat cards" are table *controls* dressed as metrics: "Search **Off** / No query," "Page size **25**," "Pages **1** / Result pages." "Pages 1" as a hero stat is meaningless.
- Table column header "**LAST RISK**" with A=red/B=amber/C=slate badges — risk vocabulary + the grade-colour inversion again.
- The "**TREND**" column is entirely "—" (empty) for every row — a dead column taking width.

**Fixes**
- Drop the Search/Page-size/Pages "stat" cards; keep only "Watchlisted" and "Appeared 30d." Move page-size to the table toolbar (it already exists there).
- Rename "LAST RISK" → "Confidence" and recolour via the grade remap.
- Remove the "TREND" column until it has data, or populate it.

---

## Surface 10 — Claim review (`/customers/[id]/claims`)

Screens: `06-customer-claims-subpage-sec00.png` (content 1,517px).

**What the eye lands on first:** "Claim review" + "**Case intelligence** / No claim selected."

**Issues**
- Two-column (left detail, right collapsible OWNERSHIP / ADD EVIDENCE / CUSTOMER RESPONSE). Reasonable.
- Vocabulary: "Case intelligence." Same all-caps signal tags as the profile ("Crossmerchant Identity Match," "Refund Rate Over 60pct," etc.).
- Good disclaimer copy: "Unauth shows context; the merchant owns the action." Keep it.

**Fixes** — "Case intelligence" → "Claim context." Apply the same tag relabel as Surface 1. Otherwise structurally sound.

---

## Surface 11 — Evidence builder (`/customers/[id]/evidence/new`)

Screens: `07-evidence-new-sec00.png` (content 855px).

**What the eye lands on first:** "Build evidence package" + careful, well-judged copy ("…your payment processor or acquirer determines what qualifies as valid dispute evidence").

**Issues**
- Copy and structure are good (disclaimer, "This package will include" checklist, optional merchant note, amber "No prior matching transactions detected" empty state).
- **Layout:** the form is a single centered column starting at x≈536; the left ~300px between the nav and the content is **empty white**, and the right side past the column is empty too. On a 1440 screen the form floats with large dead margins.

**Fixes** — Constrain to a centered max-width card or, better, present evidence-package creation as a modal/drawer over the profile (the agent is already on the profile when they click "Build evidence package"). Keep the copy verbatim — it's the right register.

---

## Surface 12 — Auth & public surfaces

Screens: `00-login-*`, `20-signup-fold.png`, `22-public-demo-full.png`, `23-public-audit-demo-fold.png`, `25-landing-*`.

**What works:** Login and signup are clean, centered, calm (`20-signup-fold.png`). The `/demo` and `/audit-demo` gateways are simple.

**Issues**
- **Signup CTA colour is wrong.** The "Create account" button is a washed-out mauve (desaturated rose), while every other primary CTA in the product ("Open audit demo," "Start interactive demo," "Connect Shopify," "Build evidence package") is deep brand-rust `#7B2D26`. The signup CTA looks disabled. Make it the standard `--accent` rust.
- **Vocabulary:** signup footer reads "By signing in, you agree to use Unauth for **authorised investigations only**." "Investigations" reframes an identity tool as surveillance at the moment of account creation. Reword to "…for authorised business use only" or reference the merchant agreement.
- `/audit-demo` headline "See what's hiding in your data" is threat-framed; acceptable for a marketing funnel but inconsistent with the calm in-product tone.
- **Onboarding could not be captured** — `/onboarding` redirects to `/login` for unauthenticated sessions (`21-onboarding.txt`), and `/signup` redirects to `/login?signup=1`. The public audit report at `/audit/[runId]/report` also redirects to `/login` (`24-public-report.txt`) — not publicly accessible for this run. Flagging as not-verified rather than asserting findings.

**Fixes** — Set the signup CTA to `--accent`. Reword the "authorised investigations only" footer. (Onboarding left unaudited; re-capture with a fresh, unset-up account if needed.)

---

# Summary

## Top 10 changes by impact (stack-ranked)

1. **Build a real clean/confirmed state for customer profiles.** *Surface 1.* Today a 0-claim customer looks identical to a 49-refund/8-chargeback one (red Definite, "Case at a glance," "REFUND VELOCITY 14D" on someone who never refunded). Branch on `claims === 0 && chargebacks === 0` → green grade, "Clean record," collapse the alarm sections. *Why:* it's the product's stated core feeling ("green confirmation — resolved and clean") and it is currently absent.
2. **Remove red from the confidence grade everywhere; map Definite to the existing green token.** *Surfaces 1,2,3,4,9.* `confidenceStyles.ts` → `definite:--sev-clear`, `probable:--sev-probable`, `possible:--sev-neutral`, `weak:--ink-tertiary`. *Why:* the grade is the one thing the eye must land on first, and rendering "most certain" as "most alarming" inverts the entire product message.
3. **Stop painting money red.** *All surfaces.* `--data-currency` `#7B2D26` → `--ink-primary` `#1A1612`. *Why:* "Exposure $5,203.28" in blood-red turns neutral order value into an alarm on every page.
4. **Collapse the audit-results page from four distribution widgets to one.** *Surface 4.* *Why:* showing the same 3/5/6/55 split four times makes an identity tool look like a vanity-metrics reporting platform — the thing it explicitly is not.
5. **Merge the customer profile's two redundant chronologies** ("Identity timeline" + "Behavior roadmap") into one "Order & claim history," and fix the empty right gutter with a sticky rail. *Surface 1.* *Why:* removes ~6–8 viewports of duplicate scroll from a 15-viewport page and ends the column collapse.
6. **Purge fraud vocabulary for identity-neutral terms.** *All surfaces.* "Exposure"→"Order value," "Flagged"→"First seen," "Investigation intelligence"→plain copy, "fraud intelligence"→"identity confidence and claims history," "Case at a glance"/"dossier"/"Case activity"→"Summary"/"Record"/"Activity," "Highest risk" sort→"Highest confidence," "LAST RISK"→"Confidence," "Max score"→"Confidence." *Why:* the words are the product's positioning; right now they read as a fraud-scoring console.
7. **Reframe the dashboard hero away from "Exposure at risk / Flagged order value."** *Surface 3.* Lead with an identity/coverage metric; de-duplicate the repeated $8,852.57. *Why:* the first screen currently sells "threat," not "identity resolved."
8. **De-duplicate the dashboard "flagged customers" list** (one row per customer, not five Nora-Kessler order rows) and rename it. *Surface 3.* *Why:* it currently reads as one person flooding a queue.
9. **Fix the signup CTA colour** (mauve → brand rust) and reword "authorised investigations only." *Surface 12.* *Why:* the primary action looks disabled, and the first sentence a new merchant reads frames the tool as surveillance.
10. **Relabel/recolour the per-row "WATCHED" tag and "Refunds"-in-red on the customers list; rename default sort.** *Surface 2.* *Why:* when every row is "WATCHED" and refund counts are red, the triage queue drowns the actual signal.

## Quick wins (copy / colour / labels — under 1 hour each)
- `confidenceStyles.ts`: remap `GRADE_COLOURS` (Definite→`--sev-clear` green) and define the missing `--sev-possible` token (currently referenced but absent from `globals.css`, so Possible badges fall back to an inherited colour).
- `globals.css`: set `--data-currency` to neutral ink.
- Rewrite subtitles: dashboard "Investigation intelligence…"; Zendesk/Gorgias "Add Unauth fraud intelligence…".
- Rename labels: sort "Highest risk"→"Highest confidence"; column "LAST RISK"→"Confidence"; "Max score"→"Confidence"; "Anchor metric"→"Orders analysed"; "Exposure"→"Order value"; "Flagged [date]"→"First seen [date]".
- Signup: CTA → `--accent`; footer "authorised investigations only" → "authorised business use only."
- Watchlist: delete the "Search / Page size / Pages" stat cards and the empty "TREND" column.
- Dashboard: remove the duplicate "$8,852.57" card.
- Sentence-case the all-caps signal tags and hide them on zero-claim profiles.

## Layout restructures (information architecture, not styling)
- **Customer profile (`/customers/[id]`):** the single biggest restructure. (a) Add the clean-state branch. (b) Collapse two chronologies into one. (c) Convert the right-hand panels to a sticky rail or move to a single centered column so the 35%-wide empty gutter beside 10+ viewports of table is eliminated. (d) Reorder to grade → claims record → identity evidence → CTAs, killing the redundant "Case at a glance" (its numbers already live in "Evidence scope" and "Merchant dossier"). Target: heavy profile from ~15 viewports to ~6; clean profile from ~5 to ~2.
- **Audit results (`/audit/[runId]`):** delete three of the four distribution widgets; resolve the "No linked identities" vs "10 orders with likely identity links" headline contradiction into one factual lead.
- **Dashboard (`/dashboard`):** re-base the hero row on identity/coverage metrics; collapse the per-order "flagged customers" list to per-customer.
- **Evidence builder (`/customers/[id]/evidence/new`):** move from a full-page form with dead left/right margins to a modal/drawer launched from the profile, or constrain to a centered card.
- **Reuse the Settings→Integrations two-pane pattern** as the structural template; it's the cleanest layout in the app.
