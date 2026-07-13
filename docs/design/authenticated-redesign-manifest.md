# Authenticated redesign manifest

Initial inventory frozen: 2026-07-13

## Initial counts

| Category | Count | Discovery method |
|---|---:|---|
| Authenticated page route files | 67 | `app/(app)`, `app/onboarding`, and `app/audit-running` page scan |
| Route state files | 74 | loading, error, and not-found scan |
| Rendered/redirected major route views | 67 | page inspection; redirects retained as compatibility surfaces |
| Explicit modal/drawer instances | 18 | component usage scan |
| Authenticated table implementations | 15 | table/DataTable usage scan, excluding public marketing assets |
| Chart component families | 6 | ECharts and Recharts usage scan |
| Form-bearing component candidates | 44 | form/form-component usage scan |
| Shared authenticated component families | 52 | UI, layout, navigation, workbench, state, and skeleton scan |

## Route and state checklist

All routes below inherit the new authenticated token scope. Redirect-only routes are verified by destination and are intentionally retained for bookmarks/deep links.

| Surface ID | Route/component | Type | Entry point | Current state | Redesign required | Completed | Browser verified |
|---|---|---|---|---|---:|---:|---:|
| SHELL-001 | Authenticated layout, sidebar, header, command menu | Layout/global controls | All app routes | Rebuilt neutral operational shell | Yes | Yes | Yes |
| ONBOARD-001 | `/onboarding` | Guided setup | Auth gate | Authenticated setup scope | Yes | Yes | Yes |
| SETUP-001 | `/audit-running` | Async setup status | Audit submission | Rebuilt neutral setup status | Yes | Yes | Yes |
| OVERVIEW-001 | `/dashboard` | Overview | Sidebar | Rebuilt in shared operational system | Yes | Yes | Yes |
| WORK-001 | `/work` | Queue | Sidebar | Rebuilt in shared operational system | Yes | Yes | Yes |
| PAYOUT-001 | `/claims` | Queue/tabs | Sidebar, notifications, command | Rebuilt in shared operational system | Yes | Yes | Yes |
| PAYOUT-DETAIL-001 | `/claims/[id]` | Review workspace | Queue/deep link | Rebuilt in shared operational system | Yes | Yes | Yes |
| EXCEPT-001 | `/exceptions` | Redirect | Deep link | Redirects to Work exception view | Yes | Yes | Yes |
| LOSSES-001 | `/losses` | Ledger/tabs | Sidebar | Rebuilt in shared operational system | Yes | Yes | Yes |
| LOSS-DETAIL-001 | `/losses/[id]` | Detail | Ledger/related records | Rebuilt in shared operational system | Yes | Yes | Yes |
| RECOVERY-001 | `/recoveries` | Operational list/board | Sidebar | Rebuilt in shared operational system | Yes | Yes | Yes |
| RECOVERY-DETAIL-001 | `/recoveries/[id]` | Detail | Recovery queue | Rebuilt in shared operational system | Yes | Yes | Yes |
| CUSTOMERS-001 | `/customers` | Directory | Sidebar/search | Shared system applied; preserves active user edits | Yes | Yes | Yes |
| CUSTOMER-DETAIL-001 | `/customers/[id]` | Entity profile | Directory/deep link | Shared system applied; preserves active user edits | Yes | Yes | Yes |
| CUSTOMER-CLAIMS-001 | `/customers/[id]/claims` | Redirect | Customer profile | Canonical redirect retained | Yes | Yes | Yes |
| EVIDENCE-NEW-001 | `/customers/[id]/evidence/new` | Form | Customer detail | Rebuilt in shared operational system | Yes | Yes | Yes |
| RULES-001 | `/rules` | Policy list | Sidebar | Rebuilt in shared operational system | Yes | Yes | Yes |
| RULE-DETAIL-001 | `/rules/[id]` | Versioned builder | Rules list | Rebuilt in shared operational system | Yes | Yes | Yes |
| FLOWS-001 | `/flows` | Flow list | Sidebar | Rebuilt in shared operational system | Yes | Yes | Yes |
| FLOW-DETAIL-001 | `/flows/[id]` | Versioned builder | Flows list | Rebuilt in shared operational system | Yes | Yes | Yes |
| FLOW-RUNS-001 | `/flows/runs` | Run table | Flow detail/deep link | Rebuilt in shared operational system | Yes | Yes | Yes |
| FLOW-RUN-DETAIL-001 | `/flows/runs/[id]` | Run detail | Runs | Rebuilt in shared operational system | Yes | Yes | Yes |
| REPORTS-001 | `/reports` | Reporting workspace | Sidebar | Rebuilt report and chart system | Yes | Yes | Yes |
| REPORT-RECORDS-001 | `/reports/records` | Drill-down table | Reports | Rebuilt in shared operational system | Yes | Yes | Yes |
| INTEGRATIONS-001 | `/integrations` | Connection list | Sidebar/settings alias | Rebuilt in shared operational system | Yes | Yes | Yes |
| INTEGRATION-DETAIL-001 | `/integrations/[provider]` | Connection detail | Integrations | Rebuilt in shared operational system | Yes | Yes | Yes |
| IMPORTS-001 | `/integrations/imports` | CSV import/history | Integrations | Rebuilt in shared operational system | Yes | Yes | Yes |
| NOTIFICATIONS-001 | `/notifications` | Activity inbox/tabs | Header | Rebuilt in shared operational system | Yes | Yes | Yes |
| SETTINGS-001 | `/settings` | Redirect | Sidebar | Redirect to Account | Yes | Yes | Yes |
| SETTINGS-ACCOUNT-001 | `/settings/account` | Settings form | Settings rail | Rebuilt in shared operational system | Yes | Yes | Yes |
| SETTINGS-BILLING-001 | `/settings/billing` | Billing | Settings rail/gates | Rebuilt in shared operational system | Yes | Yes | Yes |
| SETTINGS-TEAM-001 | `/settings/team` | Team management | Settings rail | Rebuilt in shared operational system | Yes | Yes | Yes |
| SETTINGS-PLATFORM-001 | `/settings/platform` | Defaults form | Settings rail | Rebuilt in shared operational system | Yes | Yes | Yes |
| SETTINGS-AGREEMENTS-001 | `/settings/agreements` | Agreements | Settings rail | Rebuilt in shared operational system | Yes | Yes | Yes |
| SETTINGS-API-001 | `/settings/api-integrations` | API keys/helpdesk | Settings rail | Rebuilt in shared operational system | Yes | Yes | Yes |
| SETTINGS-NOTIFY-001 | `/settings/notifications` | Preferences form | Settings rail/inbox | Rebuilt in shared operational system | Yes | Yes | Yes |
| SETTINGS-PRIVACY-001 | `/settings/data-privacy` | Privacy controls | Settings rail | Rebuilt in shared operational system | Yes | Yes | Yes |
| SETTINGS-AUDIT-001 | `/settings/audit-trail` | Audit table | Settings rail | Rebuilt in shared operational system | Yes | Yes | Yes |
| SETTINGS-INTEGRATIONS-001 | `/settings/integrations` | Redirect | Legacy/settings | Canonical Integrations redirect | Yes | Yes | Yes |
| SETUP-SHOPIFY-001 | `/settings/integrations/shopify` | Provider setup | Deep link | Rebuilt in shared operational system | Yes | Yes | Yes |
| SETUP-GORGIAS-001 | `/settings/integrations/gorgias` | Provider setup | Deep link | Rebuilt in shared operational system | Yes | Yes | Yes |
| SETUP-ZENDESK-001 | `/settings/integrations/zendesk` | Provider setup | Deep link | Rebuilt in shared operational system | Yes | Yes | Yes |
| SETUP-FRESHDESK-001 | `/settings/integrations/freshdesk` | Provider setup | Deep link | Rebuilt in shared operational system | Yes | Yes | Yes |
| SETUP-CHROME-001 | `/settings/integrations/chrome` | Extension setup | Deep link | Rebuilt in shared operational system | Yes | Yes | Yes |
| SETUP-BIGCOMMERCE-001 | `/settings/integrations/bigcommerce` | Redirect | Legacy deep link | Canonical redirect retained | Yes | Yes | Yes |
| SETUP-WOOCOMMERCE-001 | `/settings/integrations/woocommerce` | Redirect | Legacy deep link | Canonical redirect retained | Yes | Yes | Yes |
| OBJECT-ORDER-001 | `/orders/[id]` | Entity detail | Related records | Rebuilt shared entity template | Yes | Yes | Yes |
| OBJECT-SHIPMENT-001 | `/shipments/[id]` | Entity detail | Related records | Rebuilt shared entity template | Yes | Yes | Yes |
| OBJECT-REFUND-001 | `/refunds/[id]` | Entity detail | Related records | Rebuilt shared entity template | Yes | Yes | Yes |
| OBJECT-RETURN-001 | `/returns/[id]` | Entity detail | Related records | Rebuilt shared entity template | Yes | Yes | Yes |
| OBJECT-DISPUTE-001 | `/disputes/[id]` | Entity detail | Related records | Rebuilt shared entity template | Yes | Yes | Yes |
| OBJECT-TICKET-001 | `/tickets/[id]` | Entity detail | Related records | Rebuilt shared entity template | Yes | Yes | Yes |
| HELP-001 | `/help` | Help index | Sidebar footer | Rebuilt in shared operational system | Yes | Yes | Yes |
| HELP-CONFIDENCE-001 | `/help/confidence-grades` | Redirect | Legacy deep link | Redirect to Help | Yes | Yes | Yes |
| HELP-HOW-001 | `/help/how-it-works` | Redirect | Legacy deep link | Redirect to Help | Yes | Yes | Yes |
| HELP-IDENTITY-001 | `/help/identity-matching` | Redirect | Legacy deep link | Redirect to Help | Yes | Yes | Yes |
| HELP-SIENA-001 | `/help/integrations/siena` | Provider help | Help/deep link | Rebuilt in shared operational system | Yes | Yes | Yes |
| HELP-YUMA-001 | `/help/integrations/yuma` | Provider help | Help/deep link | Rebuilt in shared operational system | Yes | Yes | Yes |
| LEGACY-STORE-001 | `/store` | Legacy/conditional redirect | Bookmark | Canonical Overview ownership | Yes | Yes | Yes |
| LEGACY-AUDIT-001 | `/audit/[runId]` | Redirect | Historical link | Redirect to Reports | Yes | Yes | Yes |
| LEGACY-CATCHES-001 | `/catches` | Redirect | Historical link | Redirect to Payout Control | Yes | Yes | Yes |
| LEGACY-CHARGEBACKS-001 | `/chargebacks` | Redirect | Historical link | Redirect to Payout Control | Yes | Yes | Yes |
| LEGACY-CHARGEBACK-DETAIL-001 | `/chargebacks/[id]` | Redirect | Historical link | Redirect to Payout Control | Yes | Yes | Yes |
| LEGACY-WATCHLIST-001 | `/watchlist` | Redirect | Historical link | Redirect to Customers | Yes | Yes | Yes |
| LEGACY-GLOBAL-001 | `/global` | Redirect | Historical link | Redirect to Customers | Yes | Yes | Yes |
| LEGACY-LOOKUP-001 | `/lookup` | Redirect | Search/deep link | Redirect to Customers search | Yes | Yes | Yes |
| PARTNERS-001 | `/partners` | Legacy recovery configuration | Deep link | Rebuilt in shared operational system | Yes | Yes | Yes |
| APPLY-001 | `/apply` | Founding merchant form | Account/deep link | Rebuilt in shared operational system | Yes | Yes | Yes |

## Interaction and component surfaces

| Surface ID | Route/component | Type | Entry point | Current state | Redesign required | Completed | Browser verified |
|---|---|---|---|---|---:|---:|---:|
| DRAWER-CASE-001 | `CaseContextDrawer` | Drawer | Case/list context | New shared drawer tokens | Yes | Yes | Yes |
| DRAWER-CUSTOMER-001 | `CustomerPreviewDrawer` | Drawer | Customer table | New shared drawer tokens | Yes | Yes | Yes |
| DRAWER-FILTER-001 | `CustomersFilterSheet` | Drawer/sheet | Customer toolbar | New shared drawer tokens | Yes | Yes | Yes |
| DRAWER-RULE-001 | `RuleBuilderDrawer` | Builder drawer | Rule list/detail | New shared drawer tokens | Yes | Yes | Yes |
| MODAL-CLAIM-001 | Claim manage/reopen/reverse dialogs | Modal family | Claim detail | New shared modal tokens | Yes | Yes | Yes |
| MODAL-RULE-001 | Rule publish/rollback/simulate dialogs | Modal family | Rule workbench | New shared modal tokens | Yes | Yes | Yes |
| MODAL-FLOW-001 | Flow create/publish/rollback/test dialogs | Modal family | Flow list/workbench | New shared modal tokens | Yes | Yes | Yes |
| MODAL-RECOVERY-001 | Recovery action dialog | Modal | Recovery board | New shared modal tokens | Yes | Yes | Yes |
| MODAL-CONNECTION-001 | Connection action dialogs | Modal family | Integration detail | New shared modal tokens | Yes | Yes | Yes |
| MODAL-KEY-001 | API key create/revoke dialogs | Modal family | API settings | New shared modal tokens | Yes | Yes | Yes |
| MODAL-WRITEOFF-001 | Loss write-off confirmation | Modal | Loss detail | New shared modal tokens | Yes | Yes | Yes |
| MODAL-SHOPIFY-001 | Shopify connection dialog | Modal | Integration setup | New shared modal tokens | Yes | Yes | Yes |
| TABLES-001 | Operational table family | Table | Queues/records/settings | Compact table family rebuilt | Yes | Yes | Yes |
| CHARTS-001 | Analytics/chart family | Chart | Overview/reports | Authenticated chart palette rebuilt | Yes | Yes | Yes |
| FORMS-001 | Authenticated form family | Form | Setup/settings/builders | Authenticated form family rebuilt | Yes | Yes | Yes |
| STATES-001 | 74 route loading/error/not-found files | State family | Route transitions/failures | Shared route-state system rebuilt | Yes | Yes | Yes |
| RESPONSIVE-001 | 1440/1280/1024/tablet/mobile | Responsive family | All surfaces | Verified at desktop, tablet, and critical mobile | Yes | Yes | Yes |

## Discovery sources checked

- Route directories and dynamic segments.
- Central route registry and alias registry.
- Redirect calls and compatibility pages.
- Sidebar, workbench navigation, command palette, settings rail.
- Links in pages/components, notification/deep-link destinations, related-record links.
- Modal/drawer/table/chart/form usage.
- Route loading, error, and not-found files.
- Existing Playwright/audit screenshots and route-oriented tests.

## Independent second inventory

The post-implementation inventory was performed from the filesystem again, without reusing the initial route array. It scanned `app/(app)`, `app/onboarding`, and `app/audit-running` for `page.tsx`, normalized dynamic segments, and compared every result with this manifest.

| Result | Count |
|---|---:|
| Initial authenticated route inventory | 67 |
| Independently rediscovered routes | 67 |
| Unique rediscovered routes | 67 |
| Missing from initial manifest | 0 |
| Initial routes absent from rediscovery | 0 |

The final Playwright matrix exercises all 67 static/dynamic/compatibility route patterns at 1440×900, 1024×900, and 390×844. Seeded record discovery separately opens real case, customer, loss, recovery, rule, flow, flow-run, and integration destinations.
