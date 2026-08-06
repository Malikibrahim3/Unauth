# Coverage and safety notes

## Session

The browser was authenticated through the local test-only E2E route using the seeded merchant ID from the project environment. The visible workspace consistently showed Simeon Murray Store and the operator `simeonmurray123@gmail.com`. The authentication route, secret, and any login UI were excluded from the deliverable.

## Captured coverage

The capture set covers the complete visible product shell and the primary authenticated destinations exposed by the seeded account:

- Overview/dashboard, including all four payout-position segments.
- Work queue, secondary saved views, and row actions.
- Cases queue, every seeded status filter, a case detail workbench, and the evidence failure state.
- Loss ledger and a loss detail.
- Recovery board, recovery actions menu, case-context drawer in loading and populated states, and recovery detail.
- Customer registry, open-cases/refunds/chargebacks filters, and customer-preview loading states.
- Rules registry, rule detail, and recovery-policy configuration.
- Flows registry, flow detail, and flow-run history empty state.
- Reports overview and report records.
- Integrations registry, connected/browse views, and import records.
- Account, team, billing, platform, notification, and API-integration settings.
- Agreements, Data & privacy, and Audit trail settings, including the audit trail's persistent loading state.
- Help centre, all notifications, and unread notifications.
- Global search palette, account menu, and collapsed/restored sidebar shell states.

The manifest has 62 canonical screenshots. Two first-frame skeleton captures remain in the folder for traceability but are explicitly excluded from the canonical set.

## Expansion pass

The following expandable or stateful surfaces were opened and captured:

- Work “More views” menu.
- Work row actions menu.
- Dashboard payout-position metric states.
- Dashboard chart data table.
- Dashboard trust-details dialogs, including source-by-source detail.
- Global search command palette.
- Account menu.
- Sidebar collapsed and restored states.
- Recovery “More recovery actions” menu.
- Recovery case-context drawer, before and after its asynchronous load.
- Customer preview, before and after waiting for its asynchronous load.
- Customer registry filters.
- Cases status filters.
- Notifications unread filter.
- Agreements, Data & privacy, and Audit trail settings were captured as their own administrative surfaces; Audit trail was captured before and after waiting for its activity data.

No mutating operational action was submitted. In particular, recovery menu actions, case decisions, rule draft creation, flow testing/publishing, notification opening, and integration connection flows were not executed just to create a screenshot.

## Truthful seeded states preserved

The screenshots intentionally preserve states that a design critique should see:

- Dashboard source freshness is stale and ledger validation needs review.
- Some financial sources are unavailable, rather than being presented as zero.
- Maya Chen’s evidence request fails to load; the product explains that no recommendation or merchant decision was changed.
- Customer preview remains in a loading state after waiting.
- Recovery case context shows both loading and populated states.
- Flow runs is an honest empty state because the seeded account has zero runs.
- The recovery configuration route exposes its seeded loading/attention presentation.

These are not auth failures or hidden browser errors; they are app-rendered states and are valuable for judging resilience, trust, and progressive disclosure.

## Boundaries

The app source contains additional parameterized object routes (for example orders, tickets, shipments, refunds, returns, disputes, customer profiles, provider-specific integration setup, and some administrative subroutes). I did not fabricate IDs or force external connection flows where the seeded UI did not expose a navigable, safe, real record. The manifest therefore represents every primary post-auth view and interactive state observed from the seeded account, plus the real detail routes reached through seeded links.

The screenshots are desktop-first. There is no mobile/responsive capture in this package. PNGs are not annotated or cropped so Claude can critique the real layout, content density, and responsive-risk areas directly.
