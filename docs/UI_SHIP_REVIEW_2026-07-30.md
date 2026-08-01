# UI ship review — 30 July 2026

## Outcome

The application was not visually ready to ship at the start of this review. Its product truth and interaction foundations were sound, but too many screens used the same pale bordered container treatment, important work had weak visual priority, and several sparse pages looked unfinished.

This pass establishes a clearer product hierarchy across the complete route manifest. It also fixes merchant-facing credibility defects that visual polish alone would not solve: raw provider identifiers, raw storage keys, and confidence values capable of rendering as 8,500%.

## Scope and method

- 64 page routes inspected: 58 production routes, 2 development-only routes, and 4 redirects.
- All 60 renderable page routes reviewed through source structure and deterministic route captures.
- Every route was assigned to a page family so shared changes could improve the whole product rather than a single screenshot.
- Each rendered page was checked section by section for:
  - application or public navigation;
  - title, record identity, context, and primary action;
  - metrics, status, freshness, and provenance;
  - search, filters, sorting, and pagination;
  - primary work surface and supporting context;
  - tables, lists, charts, timelines, and connected records;
  - empty, loading, error, not-found, success, and disabled states;
  - responsive composition, keyboard access, focus treatment, and reduced motion;
  - merchant-facing copy, identifier safety, currency, date, and confidence formatting.

## Primary diagnosis

1. **Hierarchy was too flat.** Headers, controls, content groups, and supporting evidence often had equal visual weight.
2. **Containers were overused.** Repeated bordered white or grey boxes made dense workflows feel fragmented and sparse workflows feel empty.
3. **Controls lacked grouping.** The Cases registry placed search, eight filters, sort, page size, and result count into one undifferentiated band.
4. **Sparse pages looked accidental.** Settings, builders, connected-object details, onboarding, and authentication did not make deliberate use of the available canvas.
5. **Public positioning was weaker than the product.** The landing hero wrapped awkwardly and underweighted its strongest asset: a real product capture.
6. **Data display could damage trust.** Shopify GIDs, UUID fragments, and mixed confidence scales reached merchant-facing surfaces.

## Implemented redesign system

### Shared authenticated hierarchy

- Increased page-title authority while keeping the compact operational density.
- Tightened subtitle and header spacing so context sits with its title.
- Added a restrained secondary band to panel and registry headers.
- Reduced border contrast on ordinary sections and reserved stronger framing for real boundaries.
- Increased workbench separation and gave primary detail surfaces more room.
- Kept motion, radius, typography, and colour within the existing design tokens.

### Operational registries and workbenches

- Split Cases controls into a search/sort band and a workflow-filter band.
- Strengthened the Cases master-detail composition, selection state, and review-priority cue.
- Replaced nested-card repetition in the selected case preview with section dividers.
- Preserved the existing table, queue, and dashboard density where it already worked.

### Settings

- Replaced the oversized horizontal settings menu on wide screens with a grouped local navigation rail.
- Kept a wrapped horizontal treatment at intermediate widths and the compact treatment on small screens.
- Expanded the readable form canvas and removed the sense of a narrow form stranded in empty space.

### Builders and onboarding

- Strengthened builder headers, canvas spacing, and preview hierarchy.
- Made builder preview content sticky on suitable wide viewports.
- Increased onboarding width, checklist presence, active-step contrast, and task-surface size.

### Entry and public product

- Reframed authentication as a deliberate split-screen entry experience with product context on wide screens and a focused form on mobile.
- Rewrote and rebalanced the landing hero around a shorter outcome-led promise.
- Increased the real product capture’s visual priority and clarified that it is a live fictional merchant workspace.

### Merchant-facing data credibility

- Humanised Shopify GIDs such as `gid://shopify/Order/814150` as `Order #814150`.
- Prevented UUIDs, seed keys, URLs, and URNs from becoming record titles.
- Added safe, stable display handles where no human reference exists.
- Applied the same identifier rules to case headers, queues, histories, customer profiles, connected objects, support context, drawers, global search, and audit export.
- Normalised confidence values supplied as either 0–1 or 0–100 before rendering.
- Removed code typography from dates while retaining tabular number alignment.

## Route-family review matrix

| Family | Routes reviewed | Sections reviewed | Disposition |
| --- | --- | --- | --- |
| Case detail | `/claims/[id]` | record identity, status/SLA, recommendation, evidence, reconciliation, responsibility, investigations, customer response, decision/outcome/status actions, history | Primary hierarchy strengthened; identifier and confidence handling corrected |
| Operational registries | `/claims`, `/customers`, `/notifications`, `/work` | page header, metrics, query controls, filters, result count, list/table/queue, preview/drawer, pagination, empty/loading/error states | Cases directly redesigned; shared registry changes carried across the family |
| Customer detail | `/customers/[id]` | identity, source and freshness, metrics, aliases, order history, linked accounts, cases, evidence actions | Confidence and order references corrected; hierarchy reviewed |
| Customer task | `/customers/[id]/evidence/new` | task header, customer context, package form, validation, upload/source fields, success/error states | Shared task and panel hierarchy retained |
| Analytics | `/dashboard`, `/reports` | time context, KPI groups, trends, charts, tables, report navigation, export and empty states | Existing dense analytical composition retained; shared header/panel hierarchy applied |
| Analytical registry | `/losses` | metrics, cause analysis, filters, ledger/table, currency disclosure, empty/error states | Shared hierarchy applied; cause panel remains the analytical focal point |
| Loss detail | `/losses/[id]` | identity, status, value, source confidence, linked records, evidence, activity, actions | Confidence display corrected; section framing refined |
| Recovery board | `/recoveries` | overview metrics, stage columns, cards, ownership, urgency, empty stages, responsive fallback | Existing board model retained; shared hierarchy reviewed |
| Recovery detail | `/recoveries/[id]` | identity, owner/partner, financial summary, evidence, submission/chasing state, activity, actions | Detail hierarchy and state coverage reviewed |
| Connected objects | `/orders/[id]`, `/refunds/[id]`, `/returns/[id]`, `/disputes/[id]`, `/shipments/[id]`, `/tickets/[id]` | human identity, source status, primary financial/conversation section, customer/case links, joined evidence, events, related records, loading/not-found | Lead section promoted; raw provider/storage references removed; dates corrected |
| Rule builders | `/rules`, `/rules/[id]`, `/rules/recovery` | registry controls, version/status, builder header, conditions/actions, preview, publish/pause workflow, recovery-owner policy | Builder canvas and preview strengthened |
| Flow builders | `/flows`, `/flows/[id]`, `/flows/runs`, `/flows/runs/[id]` | registry, builder inputs/actions, preview, version controls, run history, run outcome and event detail | Builder canvas and run-detail hierarchy reviewed |
| Integrations | `/integrations`, `/integrations/[provider]` | source catalogue, health/status, capability summary, setup entry, sync state, disconnect/reconnect actions | Shared registry/detail hierarchy reviewed |
| Integration tasks | `/integrations/imports`, `/integrations/shipbob/select` | task context, validation/mapping, selection, warnings, primary/secondary actions, completion/error states | Task flow and state hierarchy reviewed |
| Connector setup | `/settings/integrations/chrome`, `/settings/integrations/freshdesk`, `/settings/integrations/gorgias`, `/settings/integrations/shopify`, `/settings/integrations/zendesk` | provider identity, status, prerequisites, credentials/configuration, validation, connect/disconnect, sync state | New settings navigation structure applied to the full family |
| Settings | `/settings/account`, `/settings/agreements`, `/settings/api-integrations`, `/settings/audit-trail`, `/settings/billing`, `/settings/data-privacy`, `/settings/notifications`, `/settings/platform`, `/settings/team` | local navigation, page header, grouped forms, tables, destructive actions, save feedback, loading/error/empty states | Wide-screen local rail introduced; content canvas rebalanced |
| Help and guidance | `/help` | search, topic navigation, article hierarchy, supporting links, empty search state | Editorial hierarchy and task legibility reviewed |
| Authentication | `/login`, `/reset`, `/reset/update`, `/signup` | brand/product context, form title, fields, validation, submit, alternate route, legal/support copy, mobile layout | Wide-screen entry composition redesigned; mobile focus preserved |
| Onboarding | `/onboarding` | progress, checklist, active task, integrations, team invitation, completion and error/loading states | Canvas and active-step hierarchy strengthened |
| Public product | `/demo` | guided product state, case context, evidence, decision progression, navigation and CTA | Product-proof flow reviewed |
| Public marketing | `/landing`, `/pricing` | navigation, hero, proof capture, trust/assurance, feature/value sections, pricing, final CTA, footer | Landing hero directly redesigned; shared public hierarchy reviewed |
| Public editorial | `/legal/data-handling`, `/legal/dpa`, `/legal/pilot-terms`, `/legal/privacy` | legal navigation, document title/metadata, table of contents, prose hierarchy, contact/footer, not-found | Editorial readability and navigation reviewed |
| Development harnesses | `/dev/design-system`, `/integrations/dev-preview` | token/component coverage, component states, integration health variants | Reviewed as development evidence; not part of production navigation |
| Redirects | `/`, `/settings`, `/exceptions`, `/customers/[id]/claims` | destination, query/hash preservation, absence of dead-end UI | Redirect contracts reviewed; no standalone visual surface |

## End-to-end flow coverage

| Flow | Pages and transitions reviewed | Critical sections |
| --- | --- | --- |
| Acquisition to account | Landing/pricing → signup/login → reset/update | value proposition, proof, CTA priority, form clarity, validation and recovery |
| First-run setup | Onboarding → integrations/team/workspace | progress, prerequisites, active task, completion and recoverability |
| Daily triage | Dashboard/notifications → Work/Cases | operational summary, urgency, filters, selection, preview, next action |
| Case resolution | Cases → case detail → evidence → recommendation → decision/outcome → response/status | identity, evidence provenance, recommendation limitations, operator control, auditability |
| Customer investigation | Customers → customer detail → case/evidence or connected order | customer identity, linked signals, history, confidence, navigation continuity |
| Loss and recovery | Losses → loss detail → recovery board/detail | economic value, cause, ownership, evidence, submission, chasing and outcome |
| Rule lifecycle | Rules → builder → version/publish/pause | policy context, condition/action construction, preview and safe activation |
| Flow lifecycle | Flows → builder → runs → run detail | workflow construction, status/version, execution history and outcome |
| Source setup | Integrations → provider/setup/import/account selection | prerequisites, credentials, validation, source health and safe disconnect |
| Governance | Settings account/team/API/audit/agreements/privacy/billing/defaults/notifications | local wayfinding, permissions, sensitive actions, feedback and audit trail |
| Reporting | Dashboard/reports → record slice/export | time and currency context, metric/chart relationship, records and export |

## Validation record

| Gate | Result |
| --- | --- |
| TypeScript | Passed |
| Production build | Passed; all 93 static pages generated |
| Changed-file lint | Passed with zero errors |
| Identifier, confidence, search and connected-object tests | 34/34 passed |
| Complete Living Precision component suite | 123/123 passed across 26 suites |
| Design and functional contract verifier | 25/25 passed |
| Browser accessibility and responsive suite | 67/67 passed with the recorded release clock |
| Serious or critical axe violations | None in the release route matrix |
| Layout clipping | None at the tested release widths |
| Keyboard, forced-colour, dark-mode and reduced-motion contracts | Passed |
| Impeccable design detector | Zero findings across the changed design targets |
| Live visual inspection | Cases, Settings and Landing checked at 1440px; Cases and Settings checked at 1024px |

## Ship decision

**UI decision: release-candidate quality.** The reviewed interface now passes the visual-system, build, component, accessibility, responsive, keyboard, colour-mode and motion gates used by this project.

**Overall product decision: hold until the test environment’s investigation schema is current.** During browser verification, the application reported that `case_clarification_requests.partner_id` and `merchants.investigation_response_sla_hours` were absent. Both columns are defined by `supabase/migrations/20260723200000_release1_investigations.sql`, so this is database migration drift rather than a visual defect. The Cases page degrades around the missing investigation summary, and Recovery Rules reaches its error state. Apply and verify that migration in the intended release environment before treating the whole product as ship-ready.

## Deliberate constraints

- No decorative image generation was introduced. The product already has a stronger proof asset than a generic illustration: its real operational UI.
- The redesign stays inside the established token, typography, motion, and component systems.
- No product behavior, permissions, or merchant data was changed solely to improve a screenshot.
- Development-only routes and redirects were audited but were not given unnecessary standalone visual treatments.
