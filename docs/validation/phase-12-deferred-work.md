# Phase 12 deferred-work register

| Item | Reason deferred | External dependency | Core workflow impact | Temporary fallback | Owner / prerequisite | Recommended timing | Blocks design-partner testing |
|---|---|---:|---:|---|---|---|---:|
| Configure `CRON_SECRET` | Deployment access required | Yes | Yes, missed-event recovery | Authorized direct route + manual smoke | Deployment owner | Before pilot | Yes |
| Deploy and observe Vercel cron | No deployed run evidence | Yes | Yes | Static schedule validation only | Deployment owner; secret configured | Before pilot | Yes |
| Repair Shopify development token | Current token returns 401 | Yes | Yes | Recorded Shopify fixtures | Commerce integration owner | Before final gate | Yes |
| Run complete actual merchant flow | Needs working commerce sandbox and controlled events | Partly | Yes | Automated fixtures + partial browser trace | Validation owner after Shopify repair | Before pilot | Yes |
| Replace/isolate orphan recovery seed | Intentional shared fixture must be preserved until owner decides | No | Yes for financial proof | Exclude it from canonical totals/evidence | Test-data owner | Before final flow | Yes |
| Clean database migration replay | Docker/disposable project unavailable | Environment | Yes for migration proof | Linked ledger/schema read-only validation | Platform owner | Before pilot | Yes |
| Manual persona browser matrix | Separate manager/support/operations/finance users not provisioned | No | Permissions | Server permission and RLS tests | Product/security owner | Before broader pilot | No for founder-assisted limited pilot; yes for role claims |
| General collaboration email queue | No durable queue/provider-boundary workflow found | No | Secondary unless email promised | In-app notifications | Product owner decides scope | Before claiming email notifications | Only if email is pilot scope |
| Live email delivery | No controlled provider test performed | Yes | Secondary | In-app notifications | Provider credentials + test destination | Before email release | Only if email is pilot scope |
| Live Gorgias write workflow | Real messages/tickets were prohibited | Yes | Helpdesk proof | Read-only connectivity + fixtures | Controlled Gorgias sandbox | Before claiming full live integration | Yes for a full-live claim |
| Carrier/recovery provider validation | No controlled credentials | Yes | Recovery automation | Manual recovery workflow + fixtures | Integration owner | When provider enters pilot scope | No if clearly unsupported/manual |
| `legacy_v1` broken functions | Destructive/cutover scope excluded | Approval | No current core path proven dependent | Documented best-effort legacy behavior | Data owner + removal approval | Planned legacy cleanup | No, if current paths monitored |
| Destructive legacy-table removal | Explicit approval required | Approval | Migration safety | Leave schema intact | Data owner and backup/rollback plan | Separate change window | No |
| Production dependency advisories | Safe upgrade impact not evaluated | No | Security hygiene | Current tests/security controls | Dependency owner | Next maintenance window | No at current moderate severity |
| 73 lint warnings | Pre-existing cleanup debt | No | No | Lint remains zero-error | Component owners | Incrementally | No |
| Production-scale concurrency benchmark | Local MVP-scale only | Environment | Capacity confidence | 5,400-row fixture and local timings | Platform/performance owner | Before scaling beyond controlled pilot | No for tightly controlled pilot |
| Pilot-merchant parity data | No representative pilot export supplied | Yes | Confidence/analytics | Dedicated synthetic E2E merchant | Pilot owner | Before onboarding partner | Yes |

The reconciliation schedule is implemented, but production scheduling remains explicitly unverified until the secret is configured, the committed schedule is deployed, and logs show a successful idempotent run.
