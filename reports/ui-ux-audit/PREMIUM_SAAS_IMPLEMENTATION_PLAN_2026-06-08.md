# Premium SaaS Implementation Plan

Date: 2026-06-08
Scope: landing page, auth surfaces, onboarding, and authenticated product pages inspected visually with seeded data.
Constraint: this document is an implementation plan only. No app code changes are included here.

## 0. Executive Verdict

Unauth has a real identity: warm paper, ink, rust, investigative language, commerce-risk specificity, and a case-file sensibility. That identity is worth preserving. The gap is not "make it look like Stripe" or "make it look like Ramp." The gap is that Stripe and Ramp make every surface feel authored, reliable, current, and complete. Unauth currently feels like a competent internal tool with a good brand wrapper.

The target is: a premium commerce-risk intelligence workbench that could sit next to Stripe Radar, Ramp, Linear, or Vercel without looking templated, underbaked, or AI-generated.

The core move is not a visual reskin. It is:

- Fix broken routes, loading dead zones, and development UI first.
- Rebuild the design system around fewer, stronger primitives.
- Make landing/auth/onboarding prove the product with real workflows and trust evidence.
- Turn internal pages from tables and status cards into a connected investigation cockpit.
- Add strict anti-AI-slop gates so implementation agents cannot drift into generic SaaS tropes.

## 1. Source Corpus

Local audit screenshots:

- `/tmp/unauth-premium-saas-audit/seed/00_landing_top.png`
- `/tmp/unauth-premium-saas-audit/seed/03_dashboard.png`
- `/tmp/unauth-premium-saas-audit/seed/06_claims.png`
- `/tmp/unauth-premium-saas-audit/seed/07_customers.png`
- `/tmp/unauth-premium-saas-audit/seed/08_customer_profile.png`
- `/tmp/unauth-premium-saas-audit/seed/14_chargebacks.png`
- `/tmp/unauth-premium-saas-audit/seed/15_evidence_detail.png`
- `/tmp/unauth-premium-saas-audit/seed/18_global.png`
- `/tmp/unauth-premium-saas-audit/seed/25_settings.png`
- `/tmp/unauth-premium-saas-audit/seed/28_settings_integrations.png`
- `/tmp/unauth-premium-saas-audit/seed/47_claims_1024.png`
- `/tmp/unauth-premium-saas-audit/seed/48_landing_mobile.png`
- `/tmp/unauth-premium-saas-audit/seed/dynamic-results.json`

Seed account used for inspection:

- Email: `simulation@unauth-test.com`
- Seeded merchant: Aurora Outfitters UK
- Seeded data: 12 customers, 22 claims, 5 audit runs, 4 evidence packages, 2 watchlist entries, 3 team members

External benchmark references:

- Stripe home: https://stripe.com/gb
- Stripe Radar: https://stripe.com/gb/radar
- Ramp home: https://ramp.com/
- Ramp platform: https://ramp.com/platform
- NN/g AI UX design tools, 2024: https://www.nngroup.com/articles/ai-design-tools-not-ready/
- NN/g AI design tools update, 2025: https://www.nngroup.com/articles/ai-design-tools-update-2/
- NN/g scope in generative AI features, 2025: https://www.nngroup.com/articles/scope-ai-features/
- AI-generated UI prototype study, 2026: https://arxiv.org/abs/2605.15124
- UI/UX Pro Max Skill: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Taste Skill: https://www.tasteskill.dev/
- UI Craft: https://skills.smoothui.dev/

## 2. Benchmark Standard

Stripe and Ramp are not premium because of decoration. They are premium because they combine five qualities:

1. Product proof in the first viewport.
   - Stripe leads with a business outcome and high-density product/market proof.
   - Ramp leads with a clear operational promise and then backs it with product imagery, customer proof, and workflow specificity.
   - Unauth currently leads with a strong premise, but the product artifact is too small, too static, and not credible enough as proof.

2. System confidence.
   - Every card, table, badge, surface, nav item, and motion decision feels like it comes from the same design system.
   - Unauth currently mixes multiple states, empty-state systems, page header treatments, table styles, and dev/tier preview controls.

3. Trust through detail.
   - Stripe shows scale, uptime, customers, documentation, product breadth, and hard metrics.
   - Ramp shows customer names, quotes, specific finance workflows, integrations, and enterprise controls.
   - Unauth talks about trust, privacy, and evidence, but does not show enough proof: security posture, auditability, accuracy, output examples, customer logos, sample evidence packets, or integration confidence.

4. Workflow realism.
   - Premium SaaS pages show how work happens, not just what exists.
   - Unauth has useful data, but many internal pages behave like separate admin screens instead of one connected claim-investigation workflow.

5. Visual restraint with distinctive signature.
   - Stripe is visually energetic but systemized.
   - Ramp is restrained but sharp and confident.
   - Unauth should be restrained, investigative, editorial, and technical. It should avoid generic AI dashboards, bento grids, gradient hero tropes, and decorative white-card sprawl.

## 3. What Prevents Premium Feel Today

### 3.1 Product Reliability Breaks Trust

These are not just engineering bugs. They are premium-SaaS blockers.

- `/global` and `/graph` render a runtime error: `(selectedProfile.identity_signals_summary ?? []).slice is not a function`. Source observed around `components/global/GlobalIdentityGraphClient.tsx`.
- Several routes intermittently timed out or stalled during visual inspection, including `/inbox`, integration details, audit detail routes, and report detail routes.
- `/apply` rendered a workspace not-found state even though the route exists.
- `/lookup` redirects to customers, which is fine only if intentional and messaged elsewhere.
- `/settings/api-integrations` redirects to `/settings/integrations`, also fine only if canonicalized.
- Some pages show large blank or loading areas with no useful skeleton, fallback, or explanation.

Premium fix:

- A premium product must never expose a broken workbench during evaluation.
- All routes must be categorized as canonical, redirected, hidden, or intentionally unavailable.
- Every unavailable page must have intentional product copy and a real next action.
- Every data-dependent surface needs a skeleton, empty state, error state, and loaded state.

### 3.2 Dev/Tier UI Makes the App Feel Non-Production

The sidebar/app shell exposes development and tier-preview controls such as `DEV ACCESS`, `DEV PREVIEW`, and tier labels. This reads as staging software, not a top-tier SaaS product.

Premium fix:

- Remove all dev/tier-preview UI from normal product contexts.
- If internal demo controls are required, isolate them behind an explicit admin/debug mode that cannot appear in merchant-facing screenshots.
- Pricing/tier differences should appear only in intentional upgrade surfaces, billing, or locked feature states.

### 3.3 Landing Page Does Not Prove Enough

What works:

- The core pitch is distinctive: connect store and helpdesk, understand which claims to trust, generate evidence.
- The rust/paper identity is memorable.
- The integration-first story is more credible than CSV-first.

What fails the premium benchmark:

- Hero product artifact is too small and too screenshot-like.
- The first viewport lacks customer proof, security proof, and a clear "here is the workflow" moment.
- The page relies on tasteful copy more than visible product evidence.
- It has a warm brand, but not enough enterprise confidence.
- It risks looking AI-generated when it repeats pale cards, centered sections, and generic feature blocks.

Premium fix:

- Rebuild hero around one large, deliberate product artifact: a claim workbench showing risk score, customer dossier, order history, helpdesk context, and evidence readiness.
- Add proof in the first two scroll depths: integrations, sample evidence package, customer/security badges, and one specific metric band.
- Replace generic feature grids with workflow sections: Detect, Review, Decide, Generate, Audit.
- Use the brand's rust/paper system as a signature, not a beige wash across every section.

### 3.4 Auth and Onboarding Feel Too Sparse

Login/signup are functional but under-designed. They do not communicate security, data trust, or enterprise readiness.

Premium fix:

- Auth should look like the first trust ceremony: clean, secure, intentional.
- Add a compact product-side proof panel: integrations, SOC2/GDPR/security posture if true, and a tiny preview of the evidence workflow.
- Onboarding should start with live source connection, not CSV. CSV is backfill, not the hero path.
- Every onboarding step should say what data is needed, why it is needed, and how it will be used.

### 3.5 Internal Pages Are Too "Admin Dashboard"

The authenticated product has a useful structure, but too many pages are variations of:

- header
- KPI cards
- table
- empty/alert card
- settings form

That pattern is competent, but not premium. Premium SaaS workbenches make the user's next decision obvious.

Premium fix:

- Dashboard becomes the operational command center.
- Claims becomes the review workbench.
- Customer detail becomes the dossier.
- Evidence/report pages become executive-grade artifacts.
- Integrations become a showcase of data health and source coverage, not plain configuration pages.

### 3.6 Visual System Is Too Pale, Boxed, and Inconsistent

Observed visual issues:

- Pale paper and white surfaces have low contrast.
- Many sections are boxes inside boxes.
- Borders, radii, shadows, and badges vary between routes.
- Some tables are clipped at 1024px.
- Status badges and pills do not always share a single semantic vocabulary.
- Empty states vary between compact workbench and generic centered panels.
- Charts and metric cards read as stock dashboard components.

Premium fix:

- Fewer cards. More ruled sections, table density, and workbench layout.
- Sharper hierarchy: stronger ink, clearer secondary text, fewer equal-weight panels.
- One badge system. One table system. One empty-state system. One header system.
- Use dark/graphite sections sparingly for emphasis and product proof.
- Keep the rust accent, but use it structurally: active rail, evidence dot, selected row, primary action, risk highlight.

### 3.7 Copy Lacks Enterprise Proof

Unauth's copy has good product language, but it sometimes sounds like a concept pitch rather than operational software.

Premium fix:

- Use concrete workflow verbs: "Review claim", "Generate evidence", "Escalate customer", "Export package", "Sync helpdesk".
- Replace generic marketing claims with product facts.
- Use proof-led section headings.
- Avoid fake magazine affectations unless they directly support the case-file brand.

## 4. Anti-AI-Slop Research Summary

The most important research point: current AI design tools can produce usable-looking interfaces, but they often miss originality, context, system cohesion, and real design judgment.

NN/g's 2024 research found design-specific AI tools were not meaningfully improving UX design workflows for professional designers. Their 2025 update says narrow AI features improved, but broad wireframe/prototype generation still cannot match human design judgment. The 2026 empirical study on AI-generated prototypes found positive pragmatic scores like usability/efficiency, but weaker hedonic scores like originality and innovation.

For Unauth, the risk is not "bad-looking UI." The risk is worse: polished conventional UI that looks assembled from common patterns and does not feel authored.

### 4.1 Things AI Is Still Bad At For UI/UX

Avoid asking an implementation agent to invent these from scratch:

- Broad visual direction.
- Product taste and originality.
- Cross-screen workflow logic.
- Information hierarchy for complex domain data.
- Brand expression that is specific rather than trendy.
- Knowing which visual details are meaningful versus decorative.
- Balancing user goals, business goals, privacy, risk, and trust.
- Producing a cohesive design system across many pages.
- Making realistic product proof instead of fake charts and placeholder metrics.
- Judging whether a page feels expensive after it technically works.

Use AI for:

- Narrow implementation against a defined design system.
- Refactoring repeated UI into primitives.
- Creating state matrices.
- Checking accessibility, responsiveness, and consistency.
- Producing variants after the design brief is already constrained.
- Writing first-pass microcopy that a human then trims and grounds in product facts.

### 4.2 AI-Slop Traps To Ban

Do not let any phase introduce these patterns:

- Purple/cyan gradients, glowing blobs, or generic mesh backgrounds.
- Glassmorphism except where the app already intentionally uses subtle header blur.
- Bento grids as a default layout.
- Centered hero plus generic dashboard mockup plus three cards.
- Over-rounded cards, `rounded-2xl`, pill buttons everywhere, or hover scale effects.
- White-card grids on pale backgrounds with no hierarchy.
- Fake metrics, fake customers, fake compliance claims, or unlabeled placeholder charts.
- Stock-looking AI illustrations or generated people.
- Icons used as decoration rather than interaction or meaning.
- "AI-powered" copy without a specific user-visible capability.
- Generic empty states like "No data yet" with no cause or next action.
- Repeating the same card/list/table composition on every route.
- Arbitrary motion, bounce transitions, or animated everything.
- Overuse of monospace for aesthetic effect rather than data.
- Any visible debug, preview, or development state in product UI.

### 4.3 Anti-Slop Design Gates

Every implementation PR should pass these gates:

- Screenshot gate: desktop 1440, laptop 1024, mobile 390 for every touched route.
- Side-by-side gate: compare one screenshot against Stripe/Ramp/Linear-level references. It does not need to copy them, but it must not look cheaper.
- State gate: loading, empty, error, partial data, full data.
- Data realism gate: all hero/product artifacts use real seeded or realistic domain data.
- Token gate: no raw colors, rogue shadows, rogue radii, or one-off badge styles.
- Density gate: operational pages must prioritize scanning and action over decorative space.
- Trust gate: no claim without proof, source, artifact, or clear caveat.
- Accessibility gate: visible focus, keyboard navigation, labels, contrast, touch targets.
- Motion gate: every animation must clarify cause/effect, state change, or spatial continuity.
- "Would someone think AI made this?" gate: if yes, remove the generic pattern and ground the screen in Unauth-specific product facts.

## 5. GitHub UI/UX Skill Review

The likely popular skill is `nextlevelbuilder/ui-ux-pro-max-skill`.

Observed signals:

- GitHub repository shows very large community adoption: about 88k stars and 9k forks at inspection time.
- MIT licensed.
- Provides UI/UX design intelligence for multiple platforms.
- Claims broad coverage: styles, color palettes, font pairings, UX guidelines, chart types, product types, and stack-specific guidance.
- The `SKILL.md` includes strong priority categories: accessibility, touch/interaction, performance, style selection, layout/responsive, typography/color, animation, forms/feedback, navigation, and charts.

Verdict: it has real legs as a structured checklist and guardrail system. It should not be treated as the source of Unauth's taste.

Best use for Unauth:

- Use it as a QA/audit lens during implementation.
- Extract its priority categories into our review checklist.
- Let it catch obvious misses: contrast, touch target size, focus states, loading feedback, responsive overflow, chart accessibility, form labels, reduced motion.
- Use it for narrow design-system enforcement, not for picking a style from a style menu.

Risks:

- The large catalog of styles can encourage pick-and-mix visual direction.
- Some named styles, such as glassmorphism/neumorphism/claymorphism, are exactly the kind of trend vocabulary that can create AI-looking output if used casually.
- The skill cannot understand Unauth's product identity unless the implementation brief is explicit.
- It should not override the anti-slop bans in this document.

Recommendation:

- Add UI/UX Pro Max to the implementation workflow as a "quality checklist reference", not a design authority.
- Pair it with Unauth's own design brief: editorial commerce-risk workbench, paper/ink/rust, evidence-led, no generic SaaS decoration.
- If adding an actual skill later, also evaluate Taste Skill and UI Craft. They are less about broad checklists and more about anti-slop taste rules. Their warnings align with this plan: avoid generic gradients, random bounce, lazy `transition: all`, and template-like layouts. They are useful inspiration, but the implementation source of truth should remain this document and Unauth's design system.

## 6. North Star Design Direction

Unauth should become:

> A calm, evidence-led commerce-risk workbench for reviewing suspicious claims, understanding customer identity, and generating defensible evidence packages.

Visual personality:

- Investigative, not playful.
- Editorial, not decorative.
- Technical, not cold.
- Premium, not luxury.
- Dense and scannable, not cramped.
- Warm paper, ink, rust, and graphite, not beige monotone.

System vocabulary:

- Rust dot for evidence/section identity.
- Ink text and tabular numerics.
- Thin ruled dividers.
- Sharp or modest radii, capped at 8px.
- Graphite/dark sections for high-value product proof.
- Strong table and dossier layouts.
- Fewer cards, more workbench surfaces.
- Lucide-style iconography where icons clarify commands.

## 7. Implementation Phases

### Phase 1 - Reliability, IA, and Trust Cleanup

Goal: remove everything that makes the app feel broken, unfinished, or non-production.

Primary outcomes:

- All audited routes load or intentionally redirect.
- No runtime errors in graph/global identity pages.
- No dev/tier-preview UI in merchant-facing shell.
- Every unavailable route has a premium unavailable state and a useful next action.
- Route aliases are clean and predictable.
- Seeded demo data supports every critical page.

Work:

1. Fix global identity graph.
   - Normalize `identity_signals_summary` before `.slice()`.
   - Add shape guards for arrays versus objects.
   - Add test coverage for seeded profile variants.
   - Verify `/global` and `/graph` screenshots are clean.

2. Resolve route timeouts and slow blocking layouts.
   - Inspect app shell data dependencies.
   - Avoid blocking all routes on non-critical merchant/job/connection fetches.
   - Convert long waits into skeletons with progressive loading.
   - Verify `/inbox`, integration details, audit detail, and report detail.

3. Canonicalize route map.
   - Decide which routes exist, redirect, hide, or are retired.
   - Retire or hide legacy watchlist unless it has a premium purpose.
   - Make `/lookup` and `/clusters` behavior explicit in nav and docs.
   - Fix `/apply` not-found behavior for seeded audit data or remove from visible flows.

4. Remove non-production UI.
   - Hide `DEV ACCESS`, `DEV PREVIEW`, tier controls, and tier preview badges from merchant UI.
   - Move internal controls behind admin/debug mode only.

5. State completion pass.
   - Add skeleton, empty, error, partial, loaded states for every shared page module.
   - Replace blank panels with reasoned states.
   - Add retry or setup CTA where data source is missing.

6. Integration consistency.
   - If Shopify/helpdesk are seeded as connected, all pages should reflect that consistently.
   - If helpdesk is missing, claims/help/customer pages must explain what data is degraded.
   - No contradictory banners.

Deliverables:

- Route inventory table with status for every public and app route.
- Playwright screenshot set for all primary routes.
- Bug fixes for graph/global and stalled routes.
- Debug UI hidden.
- Seed account demo-ready.

Exit criteria:

- No visible runtime overlay.
- No merchant-facing debug labels.
- No page with unexplained blank/loading content after 2 seconds.
- No route discovered in navigation that lands in generic not-found.

### Phase 2 - Design System and App Shell

Goal: make the authenticated product feel like one premium workbench, not a set of separately styled pages.

Primary outcomes:

- One app shell.
- One table primitive.
- One badge/status system.
- One empty-state system.
- One form/input system.
- One chart language.
- One route header/action bar pattern.

Work:

1. Token consolidation.
   - Canonicalize color, surface, border, radius, shadow, type, and motion tokens.
   - Remove raw hex colors from components.
   - Standardize radius: 4px or 6px for product surfaces, 8px only for modals/drawers if needed.
   - Cap shadows to shell, drawer, modal/popover, and primary button.

2. Layout system.
   - Define `WorkbenchPage`, `WorkbenchPanel`, `WorkbenchActionBar`, `KpiStrip`, `DataTable`, `EmptyState`, `StatusBadge`, `RiskBadge`, `SourceHealthBadge`.
   - Remove card-inside-card layouts.
   - Replace decorative sections with ruled dividers.
   - Ensure stable fixed-format dimensions for tables, KPIs, badges, toolbar controls, and chart panels.

3. Typography.
   - Use a premium sans spine and mono only for data.
   - Keep the brand serif only if it is controlled and intentional.
   - Apply tabular numerics to money, risk scores, timestamps, claim IDs, counts, and percentages.
   - Remove negative tracking and viewport-scaled font sizes.

4. Navigation and shell.
   - Sidebar should be production-clean, precise, and stable.
   - Header should expose merchant context, source health, search, and account controls without visual clutter.
   - Remove redundant nested nav where pages already have sidebar context.
   - Add breadcrumbs only where they help orient deep objects.

5. Chart/data visualization language.
   - Replace generic donut and stock chart patterns with evidence bars, timelines, score distributions, and source coverage maps.
   - Make all charts explain a decision or trend.
   - Add accessible labels and avoid relying on color alone.

6. Responsive system.
   - Fix 1024px clipping in Claims and other tables.
   - Define table behavior: horizontal scroll within table container, pinned key columns, compact cell wrapping, or mobile card rows.
   - Verify 390px mobile for landing/auth and 1024px app for internal users.

Deliverables:

- Design-system cleanup PR.
- Component inventory.
- Before/after screenshots across core routes.
- Token lint or manual grep checklist for raw hex/radius/shadow.

Exit criteria:

- A screenshot montage of dashboard, claims, customer dossier, evidence detail, integrations, and settings looks like one product.
- No rogue Tailwind default visual language: `rounded-lg`, `shadow-sm`, random pills, random grey cards.
- Text does not clip at 1024px.

### Phase 3 - Landing, Auth, and Onboarding Rebuild

Goal: make the first impression credible enough for a top-tier SaaS buyer.

Primary outcomes:

- Landing page proves the workflow visually.
- Auth feels secure and intentional.
- Onboarding leads with live integrations.
- CSV becomes clearly secondary/backfill.
- Trust layer exists: security, privacy, integrations, customer proof, or validated artifacts.

Work:

1. Landing hero.
   - Build a large product artifact in the first viewport.
   - Show real claim workflow: suspicious claim, customer identity signals, order/helpdesk context, evidence ready state.
   - Use product UI as proof, not decorative illustration.
   - Add 2-3 high-confidence proof points near the artifact.

2. Landing structure.
   - Replace generic feature sections with a narrative:
     - Connect live sources.
     - Detect suspicious claims.
     - Review customer dossier.
     - Generate evidence.
     - Audit decisions.
   - Add integration proof and source coverage.
   - Add privacy/security/compliance section with only true claims.
   - Add sample evidence output section.

3. Landing visual craft.
   - Use paper/ink/rust identity with stronger contrast bands.
   - Add one graphite/dark product-proof section.
   - Remove repeated equal cards and generic bento layouts.
   - Use icons only where they clarify workflow or command.
   - Avoid generated stock-like imagery.

4. Auth.
   - Upgrade login/signup with a trust-side panel.
   - Add security microcopy, source logos, and preview of what the user gets after sign-in.
   - Keep forms simple, high-contrast, and accessible.

5. Onboarding.
   - Make Shopify/helpdesk connection the primary route.
   - CSV appears as "historical backfill" after live source setup.
   - Add source health and data-permission clarity.
   - Add setup progress with realistic next actions.

Deliverables:

- New landing wire/implementation plan before coding.
- Product artifact component design.
- Auth/onboarding screenshot review.
- Trust-proof content inventory.

Exit criteria:

- Landing first viewport can sit next to Stripe/Ramp without looking like an AI landing template.
- Hero artifact communicates the product without reading body copy.
- Login/signup feel secure, not sparse.
- Onboarding does not imply CSV is the primary product.

### Phase 4 - Premium Workflow Surfaces

Goal: turn the app into a connected investigation OS.

Primary outcomes:

- Dashboard is a command center.
- Claims is a review workbench.
- Customer profile is a dossier.
- Evidence and reports look like artifacts a merchant would send, save, or defend.
- Settings/integrations feel enterprise-grade.

Work by area:

1. Dashboard.
   - Replace passive status cards with an action queue.
   - Show priority claims, source health, evidence readiness, impact at risk, and recent decisions.
   - Add "next best action" per queue item.
   - Remove any chart that does not help choose what to do next.

2. Claims.
   - Move from spreadsheet to workbench.
   - Layout: left queue/table, center selected claim, right evidence/customer/source panel.
   - Include owner, SLA, amount, risk reason, confidence, next action, and evidence state.
   - Add bulk review only where it is safe and auditable.

3. Customers.
   - Table should surface identity clusters, duplicate risk, claim history, value, and signal strength.
   - Customer detail becomes dossier:
     - identity summary
     - claims timeline
     - orders
     - helpdesk interactions
     - linked identifiers
     - evidence packages
     - audit events
   - Replace placeholder avatar/grey blocks with structured identity marks.

4. Evidence and reports.
   - Evidence package detail should look like a real exportable artifact.
   - Add cover summary, source list, timeline, confidence notes, and export/preview state.
   - Reports should be executive-grade: clear narrative, decisions, impact, source coverage, and caveats.

5. Audits.
   - Audit run should show progress, data sources, issues found, records evaluated, and next action.
   - Audit history should be more than a table: show status, impact, deltas, and artifact links.

6. Integrations/settings.
   - Integrations should be a premium source-health center.
   - Each integration card should show connection status, last sync, data coverage, scopes, errors, and setup action.
   - Settings forms need consistent labels, helper text, validation, and save states.
   - Billing/team/API keys/audit trail need complete loaded/empty/error states.

7. Help/support.
   - Help pages should be concise and operational.
   - Add links from empty/error states to relevant setup/help content.
   - Avoid documentation-style walls inside the product.

Deliverables:

- Claims workbench redesign.
- Customer dossier redesign.
- Evidence package artifact redesign.
- Integrations source-health redesign.
- Dashboard command-center redesign.

Exit criteria:

- A merchant can open the dashboard and know exactly what to review first.
- A claim can be reviewed without jumping across four pages.
- A customer profile feels like a dossier, not a generic CRM page.
- Evidence output feels defensible and premium.

## 8. Route-Level Punch List

Landing:

- Strong identity, insufficient product proof.
- Rebuild around a large realistic workflow artifact.
- Add trust/proof/security/integration layers.
- Reduce generic card repetition.

Login/signup:

- Too sparse.
- Add secure trust panel, better form states, and clearer product continuity.

Onboarding:

- Make live integrations primary.
- Make CSV backfill secondary.
- Add data-permission clarity.

Dashboard:

- Convert from status overview to command center.
- Add action queue, source health, evidence readiness.

Store:

- Should not feel like a duplicate dashboard.
- Make it merchant/source health and commerce data coverage.

Inbox/Claims:

- Current Claims is one of the stronger pages, but too table-like.
- Build selected-claim review workbench.
- Fix 1024px clipping.

Customers:

- Useful, but too generic.
- Emphasize identity clusters, risk signals, value, and claim relationship.

Customer profile:

- Promising structure, but prototype cues remain.
- Turn into dossier with timeline and linked evidence.

Customer claims:

- Default "No claim selected" is weak.
- Start with relevant claims/timeline or redirect into customer dossier context.

Reports:

- Plain.
- Make reports narrative, exportable, and executive-grade.

Watchlist:

- Legacy/retired feel.
- Hide, retire, or reframe as "monitored identities" if still strategic.

Upload/history:

- CSV import should be secondary/backfill.
- Make that hierarchy explicit visually and in copy.

Chargebacks:

- Needs tighter workbench connection to claims/evidence.
- Reduce generic table feel.

Evidence:

- Promising domain.
- Make evidence packages the premium artifact center.

Audits:

- Needs progress, source coverage, deltas, and impact.
- Avoid generic "run history" tables only.

Global/Graph:

- P0 broken.
- Once fixed, this could become a premium differentiator if visualized as identity intelligence, not a generic node graph.

Settings:

- Too utilitarian and incomplete.
- Upgrade forms, loading, billing, team, audit trail, API keys.

Integrations:

- Should be one of the most premium areas.
- Make it source health, data coverage, scopes, and sync confidence.

Help:

- Keep concise.
- Tie help to product states and setup recovery.

Mobile/internal responsive:

- Landing/auth mobile must be excellent.
- Internal mobile can be simplified, but 1024px app must be polished and unclipped.

## 9. Acceptance Checklist

Use this checklist before declaring the premium redesign complete.

Reliability:

- No visible runtime errors.
- No route hangs without skeleton/error state.
- No merchant-facing dev/debug UI.
- Every visible nav item lands somewhere intentional.

Visual system:

- No rogue raw colors in product components.
- No rogue shadows or large radii.
- No nested decorative cards.
- One badge system.
- One table system.
- One empty state system.
- One form system.
- One chart language.

Premium SaaS benchmark:

- Landing first viewport has product proof.
- Auth feels secure.
- Dashboard has a clear command center.
- Claims can be reviewed in one workbench.
- Customer profile feels like a dossier.
- Evidence package feels exportable and defensible.
- Integrations communicate source health and trust.

Anti-slop:

- No generic gradient/glow/blob hero.
- No fake charts or fake claims.
- No stock AI imagery.
- No repeated equal-card sections without hierarchy.
- No "AI-powered" filler copy.
- No decorative animation.
- Every screenshot can be explained by product purpose.

Accessibility/responsive:

- Keyboard focus visible.
- Form labels present.
- Touch targets meet platform standards.
- Contrast checked.
- Reduced motion respected.
- 1024px internal app does not clip key text.
- 390px landing/auth are polished.

## 10. Suggested Work Order

Recommended sequence:

1. Phase 1 first, even if visual redesign feels more exciting. A broken route cancels all premium perception.
2. Phase 2 second, because landing and workflow redesigns need stable primitives.
3. Phase 3 third, because the external story should use the product system created in Phase 2.
4. Phase 4 fourth, because workbench pages need the reliability and design-system foundation.

Do not implement page-by-page visual tweaks before the system pass. That creates another round of inconsistency. Start with reliability, then primitives, then the surfaces that prove the product.

## 11. Final North-Star Test

After implementation, open these side by side:

- Stripe home or Stripe Radar
- Ramp platform
- Unauth landing
- Unauth dashboard
- Unauth claims workbench
- Unauth customer dossier
- Unauth evidence package
- Unauth integrations

Unauth does not need to look like Stripe or Ramp. It needs to look equally intentional. If a senior buyer sees it and thinks "this is a real, trusted system for a serious operational workflow," the redesign has landed.
