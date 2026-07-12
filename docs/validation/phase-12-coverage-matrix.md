# Phase 12 coverage matrix

Statuses use only the release instruction vocabulary. “Real sandbox” means a controlled external account; read-only connectivity alone does not imply a complete workflow.

| Capability | Implemented | Automated tests | Manual validation | Real sandbox | Fixture/simulation | Status | Limitation |
|---|---:|---:|---:|---:|---:|---|---|
| Shopify import | Yes | Yes | Health only | Blocked | Yes | Verified with fixtures | Configured token returns 401 |
| Shopify webhooks | Yes | Yes | No live event | No | Yes | Verified with fixtures | No controlled live delivery |
| Gorgias import | Yes | Yes | Read-only preflight/UI | Connectivity only | Yes | Partially verified | No live write/import run |
| Gorgias webhooks | Yes | Yes | Endpoint reachable | No live event | Yes | Verified with fixtures | No controlled external delivery |
| Tracking | Yes | Yes | Source state only | No | Yes | Verified with fixtures | No carrier sandbox |
| CSV import | Yes | Yes | Validated in UI without commit | N/A | Yes | Verified | Destructive commit omitted |
| Generic webhooks | Yes | Yes | No | N/A | Yes | Verified with fixtures | Simulated events only |
| Basic API intake | Yes | Yes | No | N/A | Yes | Verified with fixtures | No external client run |
| Manual case creation | Yes | Yes | Controls inspected | N/A | Yes | Verified with fixtures | Not used as normal-flow proof |
| Record matching | Yes | Yes | Linked case inspected | No | Yes | Verified with fixtures | No current production match rate |
| Probable-match handling | Yes | Yes | Exception queue inspected | No | Yes | Verified with fixtures | No new live ambiguous event |
| Automatic case creation | Yes | Yes | Existing cases inspected | No | Yes | Verified with fixtures | No fresh complete sandbox scenario |
| Rules | Yes | Yes | Recommendation inspected | N/A | Yes | Verified | Historical E2E evaluations only |
| Flows | Yes | Yes | UI inspected | N/A | Yes | Verified with fixtures | No external high-risk action |
| Financial calculations | Yes | Yes | Exposure reconciled | N/A | Yes | Verified with fixtures | No actual completed chain |
| Loss attribution | Yes | Yes | Empty live state | No | Yes | Verified with fixtures | E2E merchant has no loss cases |
| Recovery | Yes | Yes | Board inspected | No | Yes | Partially verified | Retained seed is noncanonical |
| Reconciliation endpoint | Yes | Yes | Direct smoke | N/A | Yes | Verified | Local/direct execution only |
| Exceptions | Yes | Yes | Queue-to-case link | N/A | Yes | Verified | No live financial resolution chain |
| Dashboards | Yes | Yes | USD exposure reconciled | N/A | Yes | Partially verified | Recovery seed excluded |
| Reports | Yes | Yes | Render/navigation | N/A | Yes | Partially verified | No complete loss/recovery trace |
| Search | Yes | Yes | Command search | N/A | Yes | Verified | Representative, not exhaustive UI terms |
| Audit history | Yes | Yes | Timeline only | N/A | Yes | Partially verified | No actual final financial audit chain |
| Merchant isolation | Yes | Yes | Authenticated merchant | Live DB | Yes | Verified | Live RLS + server tests passed |
| Role permissions | Yes | Yes | Owner path | N/A | Yes | Partially verified | Requested personas not all provisioned |
| Notifications | Yes | Yes | Current UI | N/A | Yes | Verified with fixtures | No external notification |
| Email queue | No general queue found | Limited preferences | No | No | No | Not implemented | Provider boundary cannot be claimed |
| Integration health | Yes | Yes | Current Integration Centre | Read-only | Yes | Verified | Stale sources now fail closed |
| Cron scheduling | Yes | Route tests | Static config only | No | Direct smoke | Implemented but not externally verified | `CRON_SECRET`/deployed run missing |
| Source disconnect/reconnect | Yes | Yes | Stale/disconnected UI | No | Yes | Verified with fixtures | No live reconnect cycle |
| Demo mode | Yes | Yes | Not used for release proof | N/A | Yes | Partially verified | Not a connector substitute |
| Source-independent behavior | Yes | Yes | CSV/current UI | N/A | Yes | Verified with fixtures | Multi-source full chain not live |
| Clean migration replay | Yes | Static/live ledger | No | Linked DB read-only | No | Blocked | Docker/disposable project unavailable |
| Final merchant-flow demonstration | Paths exist | Component tests | Partial actual case | Blocked | Partial | Blocked | No loss/recovery/final-result trace |
