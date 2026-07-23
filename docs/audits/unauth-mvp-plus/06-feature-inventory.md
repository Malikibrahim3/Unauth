# 06 — Feature Inventory

Classification of capabilities by real state. "Working" here means *verified working to evidence standard in this pass*; capabilities in un-audited domains appear under **Unverified**, not under Working/Broken. Also includes the **duplicate/legacy register** (audit prompt register G) and **beyond-spec** capabilities.

---

## A. Fully working (verified to evidence standard)

| Capability | Evidence |
|---|---|
| Canonical money (minor units + ISO exponents) | `lib/canonical/money.ts` — JPY 0 / BHD 3 handled; no float storage |
| Append-only financial ledger + reversal projection | `lib/finance/financialLedger.ts`; DB triggers `forbid_financial_entry_mutation` (migration `20260711120000`) |
| Per-currency totals with no cross-currency sum | `projectSummary` keys by currency |
| Outstanding-recovery & loss read model | `lib/losses/readModel.ts` — `max(0, recoverable − recovered − written_off)` |
| Recovery board (all 8 status groups mapped) | `lib/recoveries/status.ts RECOVERY_BOARD_COLUMNS` |
| Recovery chase semantics (`chase_due` ≠ chased) | `lib/recoveries/status.ts nextStatusPatch` (SCN-016) |
| Fail-closed tenant scoping | `lib/supabase/scoped.ts createScopedClient` |
| Evidence-download signed-token security | `app/api/v1/evidence/[id]/download/route.ts` (15-min single-use, dual merchant match) |
| Shopify webhook HMAC-before-parse + idempotency | `app/api/shopify/webhooks/route.ts` |
| Encrypted integration credentials (AES-256-GCM) | `lib/integrations/secrets.ts` |
| One canonical provider catalogue read by UI | `lib/integrations/registry.ts` |
| Canonical IA + merchant vocabulary + legacy redirects | `lib/navigation/appRoutes.ts`, `next.config.js` |
| Shared metric service (dashboard + reports) | `lib/reporting/intelligence` imported by both |
| Server-side authorization on RSC pages & API routes | `lib/auth/requestContext.ts`, `lib/permissions/index.ts` |
| Account deletion (thorough, FK-safe, owner-only) | `app/api/account/delete/route.ts` |
| Gorgias live helpdesk path (controlled e2e + reconciliation) | `scripts/e2e/*`, `lib/support/gorgias/*` |
| ShipBob live 3PL adapter (import/sync/webhook/disconnect + validation script) | `lib/connectors/providers/shipbob.ts`, `scripts/validate-controlled-live-connectors.ts` |

## B. Partially working (meaningful implementation, important gap)

| Capability | Gap | Ref |
|---|---|---|
| Tenant isolation | By hand-written `.eq` on ~163/179 routes; partial RLS; no live cross-tenant test | SEC-001 |
| Security audit trail | Fire-and-forget writes; incomplete action set | AUD-001 |
| Webhook verification | BigCommerce + support providers verify after parse, no replay defence | SEC-004 |
| Shopify integration | Live for orders/refunds/fulfilments; disputes capability advertised beyond pilot scope | INT-003 |
| Payout Control queue | Queue fields + no-bulk-approval present; depth unverified | PCL |
| Decision evaluation route | Enforced + scoped; recording/override/correction specifics unverified | DEC |
| Loss attribution model | Candidate model present; advisory/correctable UX unverified | ATR |
| Recovery amounts | Cumulative/outstanding/written-off modelled; amount-cap adversarial tests missing | RCV-004 |
| API keys | Hashed/rotatable; "shown once/never logged" unverified | SET-003 |
| Data & Privacy removal | Targets legacy tables only | PRV-002 |
| Neutral language | Legacy `blacklist` decision alias mapped to neutral display, write-prohibited | CPY-001 |

## C. Misleading (claims more than proven) — highest-priority to correct

| Capability | Problem | Ref |
|---|---|---|
| **Zendesk = "live"** | No controlled proof, no effective-health probe, no reconciliation, no executable adapter | INT-002 |
| **Freshdesk = "live"** | Same as Zendesk | INT-002 |
| **UPS = "live"** | On-demand proof-lookup only (no import/webhook/reconcile); "verified" health only refreshes a token | INT-002/004 |
| **FedEx = "live"** | Same as UPS | INT-002/004 |
| Effective health for helpdesks | `verifyMerchantLiveConnections` probes Gorgias only; Zendesk/Freshdesk health from a stored flag | INT-004 |

## D. Missing

| Capability | Ref |
|---|---|
| Per-customer (data-subject) erasure / pseudonymisation | PRV-004 |
| Live authenticated cross-merchant isolation test | SEC-010 |
| Retention enforcement job (purge cron is a no-op) | PRV-002 |
| Audit events for decisions/reversals/attribution/recovery-transitions/identity-links/rule-publishes/exports | AUD-001 |
| In-app role/grant-based PII masking | PRV-006 |

## E. Dead / duplicate / placeholder / mock-backed (Register G — legacy)

| # | Concept | Paths | Active reads/writes? | Canonical target | Merchant risk | Consolidation dependency |
|---|---|---|---|---|---|---|
| G1 | Friendly-fraud scoring engine | `lib/engine/*`, `lib/scorer.ts`, `lib/confidence.ts`, `lib/rules-engine.ts` | **Still wired** — `decisionEngine`/identity scoring referenced by tests + possibly recommendations; needs call-site proof before removal | Merchant rules engine (`lib/rules/*`) | Contradicts "merchant decides"/"no fraud verdict" if it drives recommendations | Prove no case/recommendation path depends on it |
| G2 | Legacy v1 API surface | `app/api/v1/*` (`gate/evaluate`, `gate/escalation`, `ingest/*`, `lookup`, `profile-link`, `helpdesk-ticket-context`) | **Reachable** — authenticated ingest/gate routes | Canonical intake (`imports/csv`, `internal/support/ingest`) | Parallel case/gate lifecycle; the "gate" concept predates payout cases | Confirm no external caller; migrate to canonical intake |
| G3 | Claim-gate | `app/api/claim-gate/check`, `lib/claim-gate/*` | Reachable | Rule recommendation | Second decision path | Prove unused or fold into rules |
| G4 | Fraud feedback / checkout signals | `app/api/fraud-feedback`, `app/api/checkout-signals/*`, `lib/checkoutSignals` | Reachable; `SUBMIT_FRAUD_FEEDBACK` permission granted to analyst | none (pre-pivot) | Fraud-verdict framing | Remove permission + routes if unused |
| G5 | Dual claim status vocabulary | `lib/claims/statusMachine.ts`, `app/(app)/claims/page.tsx` | **Active** — legacy `pending/open/escalated/resolved_*/stale` stored & allowed alongside canonical | Canonical case lifecycle (§7.1) | Contradictory labels across pages (LIF-001) | Migrate rows; map read-only; drop legacy from write paths |
| G6 | Fraud RBAC capabilities | `lib/permissions/index.ts` (`VIEW_WATCHLIST`, `VIEW_CHARGEBACKS`, `MANAGE_WATCHLIST`, `SUBMIT_FRAUD_FEEDBACK`, `LOOKUP_CUSTOMER`) | Granted to viewer/analyst defaults | payout-decision + customer-view capabilities | Watchlist/fraud framing in roles | Remove unused capabilities |
| G7 | `parcelclaim` package identity + fraud fixtures | `package.json name`, `friendly_fraud_blind_test_2000.csv`, `threshold-recommendations.json`, `synthetic-lab/*` | Build/test artefacts | Unauth product identity | Naming confusion; fraud framing in repo | Rename; move fixtures out of repo root |
| G8 | `/flows` UI ↔ `workflows` backend naming split | `app/(app)/flows/*` vs `app/api/workflows/*`, `workflow_definitions`, `lib/workflows/*` | Active (both) | Single "Flows" concept | Dev confusion (not merchant-facing) | Rename backend to flows, or document the mapping |

*Note:* per the contract's own rule, a legacy path is **not** "dead" without access/runtime/DB proof. G1–G4 are marked "still wired / reachable" and require call-site + access-log disproof before removal — this is the `legacy-duplicate-tests-qat` domain agent's un-run deep task.

## F. Beyond the MVP+ spec (implemented capabilities the contract doesn't require)

| Capability | Note |
|---|---|
| Billing/subscription (Stripe) + product tiers/entitlements | `lib/billing/*`, `app/api/billing/*`, `lib/product/tiers` — MVP+ treats billing as a thin surface (SET-006); this is more built-out |
| Chrome extension | `extensions/chrome/*`, `app/api/settings/chrome/*` — not in the MVP+ contract |
| Synthetic-lab / tuning harness | `synthetic-lab/*`, `scripts/tune/*` — engineering tooling, not product |
| Zendesk private-app package build | `scripts/package-zendesk-app.mjs` — supports a provider the contract lists as "partial unless validated" |
| Dev design-system route | `app/(app)/dev/design-system` + `integrations/dev-preview` — internal, ensure hidden in prod |

## G. Could not be verified (audit truncated — spend limit)

Whole domains not audited to evidence standard: **Onboarding**, **Overview/Work**, **Case detail & decision recording**, **Evidence strength**, **Rules engine & simulation**, **Flows runtime**, **Customers & identity resolution**, **Exceptions**, **Search/Notifications/Help/Widget/Connected-objects**, **Reports drill-down/export**, **Canonical object-model read/write completeness**, **Ingestion/reconciliation/jobs (RLY)**, **Accessibility & performance (runtime)**, **Non-functional design-system consistency**.

Each corresponds to a domain agent that failed with the org spend error. These are the immediate next audit targets (`00 §7 step 4`).
