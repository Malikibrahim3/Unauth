# 01 — Requirements Traceability Matrix

One row per atomic contract requirement. Status vocabulary is the contract's: `PASS` / `PARTIAL` / `MISSING` / `BROKEN` / `MISLEADING` / `UNVERIFIED` / `DUPLICATE_OR_LEGACY` / `OUT_OF_SCOPE`. `NOT VERIFIED` = not audited to evidence standard in this truncated pass (see `00-executive-summary.md §0`), distinct from a product defect.

**Coverage key:** 🟢 agent-verified · 🔵 lead-verified against source · ⚪ NOT VERIFIED (domain agent did not complete — spend limit).

---

## 2. MVP+ scope & release conditions

| ID | Pri | Requirement (summary) | Status | Sev | Evidence | Gap / note | Action | Size |
|---|---|---|---|---|---|---|---|---|
| SCP-001 | P0 | Full signed-in app around the 11 nav groups | 🔵 PARTIAL | Med | `lib/navigation/appRoutes.ts` has all groups (Overview/Work/Payout Control/Losses/Recovery/Customers/Rules/Flows/Reports/Integrations/Settings) with correct labels; all routes exist | Present but per-page completeness unverified for most | Finish per-page audit | — |
| SCP-002 | P0 | One canonical support payout case joining all records | 🔵 PARTIAL | Med | `support_payout_cases` + `case_financial_entries` + loss/recovery links (`lib/losses/readModel.ts`) | Join exists; full population from all source types not runtime-verified | Verify E2E chain | M |
| SCP-003 | P0 | Explainable rule recommendation + explicit human decision | ⚪ NOT VERIFIED | — | `app/api/claims/[claimId]/decision` evaluates rules; `lib/rules/*` | Rule-engine internals not audited | Complete rules audit | — |
| SCP-004 | P0 | Append-only currency-safe financial history | 🔵 PASS | — | DB triggers block UPDATE/DELETE on `case_financial_entries`; `projectSummary` per-currency | Strong | — | — |
| SCP-005 | P0 | Evidence completeness/provenance/freshness/contradiction | ⚪ NOT VERIFIED | — | `lib/evidence/*` exists | Evidence-state model not audited | Complete case/evidence audit | — |
| SCP-006 | P0 | Merchant-scoped identity matching + exception path | ⚪ NOT VERIFIED | — | `lib/identity/*`, `record_match_candidates` | Not audited this pass | Complete identity audit | — |
| SCP-007 | P0 | Operational work queues | ⚪ NOT VERIFIED | — | `/work`, `work_tasks` | Not audited | Complete work audit | — |
| SCP-008 | P0 | Loss attribution + recoverability, advisory/correctable | 🔵 PARTIAL | Med | `LOSS_ATTRIBUTION_CANDIDATES`, `is_primary`; recoverability enum in claims select | Model present; advisory/correctable UX not verified | Verify attribution edit path | M |
| SCP-009 | P0 | Recovery cases w/ eligibility/evidence/owner/deadline/amounts/outcome | 🔵 PASS | — | `lib/recoveries/*`, `RECOVERY_CASES`, board columns, correspondence, deadlines | Strong model | — | — |
| SCP-010 | P0 | Source-agnostic connectors, truthful health/import/reconcile/disconnect | 🟢 PARTIAL | High | Provider matrix (`03` §Integrations); registry+adapters split | 4 providers falsely "live"; health partial | See INT-002/004 | L |
| SCP-011 | P0 | Tenant isolation, RBAC, audit, idempotency, server authz | 🟢 PARTIAL | High | See §14/§4 rows | Isolation by convention; audit gaps | See SEC-001/AUD-001 | L |
| SCP-012 | P1 | Compressed helpdesk decision surface linking to full case | ⚪ NOT VERIFIED | — | `app/api/gorgias/widget/*` | Widget domain not audited | Complete widget audit | — |
| SCP-013 | P1 | Manual case / CSV / document / API intake | 🔵 PARTIAL | Med | `claims/manual`, `imports/csv/*`, `documents/upload`, `v1/ingest/*` | Paths exist; validation/idempotency not deep-verified | Verify intake | M |
| SCP-014 | P1 | Bounded operational flows | ⚪ NOT VERIFIED | — | `/flows`, `workflow_definitions` | Flows runtime not audited | Complete flows audit | — |
| SCP-015 | P1 | Management reporting w/ drill-down | ⚪ NOT VERIFIED | — | `/reports`, shared metric service | Drill-down/export not verified | Complete reports audit | — |
| SCP-016 | P1 | Team collaboration | ⚪ NOT VERIFIED | — | comments/tasks routes | Not audited | — | — |
| SCP-017 | P1 | Multi-workspace membership + safe switcher | ⚪ NOT VERIFIED | — | `ACTIVE_MERCHANT_COOKIE`, `ensureMerchantContextForUser` | Switcher UX not verified | Verify ACC-007 | — |
| SCP-101..110 | P2 | Deferred (network/autonomous/marketplace/mobile/benchmarks/portal…) | OUT_OF_SCOPE | — | No autonomous refund/submit found; Stripe held `slot_only`; benchmarks absent | No P2 exposed in conflict found so far | — | — |
| REL-001 | P0 | Connect sources + import + truthful health | 🔵 PARTIAL | High | Shopify/Gorgias/ShipBob live; 4 false-live | Truthful-health condition fails | Blocker 1 | L |
| REL-002 | P0 | One support event → linked payout case | ⚪ NOT VERIFIED | — | `e2eOrder1013Chain.test.ts`, `e2eProductSurface.test.ts` exist | Not runtime-traced this pass | Run E2E chain | — |
| REL-003 | P0 | Case shows evidence/exposure/rule/explanation/next action | ⚪ NOT VERIFIED | — | case detail page exists | Not audited | Complete case audit | — |
| REL-004 | P0 | Record decision without silently executing a financial action | 🔵 PARTIAL | Med | Decision route evaluates + records; connectors return typed unsupported for writes | No autonomous refund found; recording specifics unverified | Verify DEC-* | M |
| REL-005 | P0 | Reconcile actual outcome into append-only entries | ⚪ NOT VERIFIED | — | `lib/reconciliation`, cron/reconcile | Reconcile semantics not audited | Complete jobs audit | — |
| REL-006 | P0 | Loss → attribution → recovery → paid/write-off | 🔵 PARTIAL | Med | Full recovery lifecycle + write-off in model | Model complete; E2E not traced | Trace SCN-009 live | M |
| REL-007 | P0 | Every Overview/Reports value drills to same cases/ledger | ⚪ NOT VERIFIED | — | shared metric service exists | Drill-down not verified | Verify RPT drill-down | — |
| REL-008 | P0 | Isolation/permissions/webhook/idempotency/reversal pass adversarial tests | 🟢 PARTIAL | High | No live cross-merchant test; webhook gaps | Adversarial coverage incomplete | Blocker 3 | L |
| REL-009 | P0 | Loading/empty/partial/stale/failure/denied states usable everywhere | ⚪ NOT VERIFIED | — | skeletons + `/flows` loading/error present | Per-route state coverage not audited | Complete states audit | — |
| REL-010 | P0 | No route/metric/integration/action overstates what is live | 🟢 FAIL | High | 4 providers falsely "live" (Zendesk/Freshdesk/UPS/FedEx) | Direct violation | Blocker 1 | L |

## 3. Governing principles (owned here; others cross-referenced)

| ID | Pri | Requirement | Status | Evidence / note |
|---|---|---|---|---|
| GOV-001 | P0 | Merchant decides; no silent auto-action | 🔵 PARTIAL | No autonomous refund/submit found; connectors return typed unsupported; recording specifics unverified |
| GOV-002 | P0 | One product model, no provider-specific duplicate | 🔵 PARTIAL | Canonical model present; but dual status vocabulary + legacy fraud modules coexist (LIF-001) |
| GOV-003 | P0 | One case, one timeline | ⚪ NOT VERIFIED | `caseTimeline` exists; not audited |
| GOV-004 | P0 | Facts retain provenance | 🔵 PARTIAL | `source_records` provenance columns exist; per-fact UI surfacing unverified |
| GOV-005 | P0 | Financial truth over impressive totals | 🔵 PASS | Minor-units, per-currency, append-only, distinct stage measures in model |
| GOV-006 | P0 | Neutral language | 🔵 PARTIAL | UI largely clean; legacy `blacklist` decision alias mapped to "Denied under policy"/"Watch internally", write-prohibited |
| GOV-007 | P0 | Unknown is valid (no fabricated zero) | ⚪ NOT VERIFIED | Not audited across surfaces |
| GOV-008 | P0 | Every screen answers a merchant question | ⚪ NOT VERIFIED | Not audited |
| GOV-009 | P0 | Every action has a result + audit + retry | 🔵 PARTIAL | Audit is fire-and-forget/incomplete (AUD-001) |
| GOV-010 | P0 | Every number traceable | ⚪ NOT VERIFIED | Shared metric service exists; drill-down unverified |
| GOV-011 | P0 | Automation bounded & observable | ⚪ NOT VERIFIED | Flows not audited |
| GOV-012 | P0 | Merchant isolation absolute | 🟢 PARTIAL | See SEC-001/SEC-010 — by convention, no live cross-tenant test |
| GOV-013 | P1 | Progressive disclosure | ⚪ NOT VERIFIED | Not audited |
| GOV-014 | P1 | Config never blocks first use unnecessarily | ⚪ NOT VERIFIED | Not audited |
| GOV-015 | P1 | Historical truth preserved | 🔵 PARTIAL | Append-only ledger + immutable versions support this; full coverage unverified |

## 4. Personas & access (ACC)

| ID | Pri | Status | Evidence / gap |
|---|---|---|---|
| ACC-001 | P0 | 🔵 PARTIAL | Server enforcement exists (`requirePermission`/`requirePagePermission`) but isolation-by-convention (SEC-001) weakens "every query/mutation/export/job/callback" guarantee |
| ACC-002 | P0 | 🔵 PARTIAL | Nav filtered by permission (`getSidebarNavItems`); but **viewer over-permissioned** by default (EXPORT_AUDIT/VIEW_SETTINGS/VIEW_TEAM); denied deep-link redirects silently (no explanation, no audit) — see SCN-012 |
| ACC-003 | P0 | 🔵 PARTIAL | Some sensitive actions audited; decisions/exports/rule-publishes/identity-links **not** (AUD-001) |
| ACC-004 | P0 | 🔵 PARTIAL | `user_action_log` has actor/role/merchant/object/time but no correlation id / effective-time (AUD-002) |
| ACC-005 | P0 | ⚪ NOT VERIFIED | Last-owner protection & ownership transfer not read this pass |
| ACC-006 | P1 | ⚪ NOT VERIFIED | Grant revocation latency not verified |
| ACC-007 | P1 | ⚪ NOT VERIFIED | Active-workspace-cookie exists; "never inferred from highest privilege" not verified |

## 5. Language, taxonomy & financial truth (TAX, FIN)

| ID | Pri | Status | Evidence / gap |
|---|---|---|---|
| TAX-001 | P0 | ⚪ NOT VERIFIED | Issue-type vs requested-action vs cause vs decision separation not audited |
| TAX-002 | P0 | 🔵 PARTIAL | Legacy `blacklist`/`under_review` etc. mapped to canonical in `statusMachine.normalizeLegacyClaimStatus` + `claimReviewLabels`; but **legacy statuses still stored/allowed** alongside canonical (LIF-001) |
| TAX-003 | P0 | ⚪ NOT VERIFIED | `unknown` retention / audited reclassification not audited |
| TAX-004 | P1 | ⚪ NOT VERIFIED | Not audited |
| FIN-001..010 | P0 | 🔵 PARTIAL | Ten distinct financial states enumerated in `lib/finance/financialLedger.ts FINANCIAL_STATES` (requested/exposed/approved/paid/estimated_loss/confirmed_loss/recoverable/recovered/prevented/written_off) — model correct; per-UI-surface labelling & "unknown≠0" (FIN-020) not fully verified |
| FIN-011 | P0 | 🔵 PASS | `outstanding = max(0, recoverable − recovered − written_off)` (`lib/losses/readModel.ts:39`) |
| FIN-012 | P0 | 🔵 PARTIAL | Net-loss inputs surfaced (`confirmed_loss_minor`, `recovered_minor`); exact `max(confirmed − recovered, 0)` presentation not traced to UI |
| FIN-013 | P0 | ⚪ NOT VERIFIED | "Stage measures never summed" not verified per surface |
| FIN-014 | P0 | ⚪ NOT VERIFIED | "Saved/protected" combination not audited |
| FIN-015 | P0 | 🔵 PASS | Minor units + ISO exponents (`lib/canonical/money.ts`); no float storage |
| FIN-016 | P0 | 🔵 PASS | `projectSummary` keys by currency, never sums across (`lib/finance/financialLedger.ts`) |
| FIN-017 | P0 | ⚪ NOT VERIFIED | FX visibility (no FX conversion found — likely N/A at MVP+) |
| FIN-018 | P0 | 🔵 PASS | Append-only DB triggers + reversal via `reverses_entry_id` |
| FIN-019 | P0 | 🔵 PARTIAL | Reversals/partials modelled as separate events; multi-payout/overpayment not traced |
| FIN-020 | P0 | ⚪ NOT VERIFIED | "Zero means proven zero" not verified in UI |
| FIN-021 | P1 | ⚪ NOT VERIFIED | Replacement loss component breakdown not audited |
| FIN-022 | P1 | ⚪ NOT VERIFIED | Aggregate→ledger reproducibility not traced |
| FIN-023 | P0 | ⚪ NOT VERIFIED | Cost-basis labelling not audited |
| FIN-024 | P0 | ⚪ NOT VERIFIED | 30-day prevented-value observation window not verified |

## 6–7. Object model & lifecycles (OBJ, LIF, DEC, ATR, RCV)

| ID | Pri | Status | Evidence / gap |
|---|---|---|---|
| OBJ-001..018 | P0/P1 | ⚪ NOT VERIFIED | Canonical tables exist (`source_*`, `support_payout_cases`, `merchant_customers`, `loss_cases`, `recovery_cases`, `merchant_rule_versions`, `workflow_definitions`); per-object minimum-contract completeness + read/write paths not audited this pass |
| OBJ-020 | P0 | 🔵 PARTIAL | External IDs scoped by merchant/provider/source-account (migration `source_orders_account_scope`, `source_accounts`) — architecture supports no collision; not adversarially tested live |
| OBJ-021..027 | P0/P1 | ⚪ NOT VERIFIED | Native-status retention, bidirectional nav, dup handling, disconnect-retains-history not audited |
| LIF-001 | P0 | 🔵 PARTIAL/DUPLICATE_OR_LEGACY | **Dual status vocabulary**: `lib/claims/statusMachine.ts` + `app/(app)/claims/page.tsx` carry canonical states *and* legacy `pending/open/escalated/resolved_*/stale`. Legacy mapped, not removed — risk of contradictory labels |
| LIF-002..005 | P0 | ⚪ NOT VERIFIED | Stale-vs-lifecycle, snooze, close/reopen guards not fully audited |
| DEC-001..006 | P0/P1 | 🔵 PARTIAL | Decision route enforces `SUBMIT_PAYOUT_DECISIONS` + merchant scope; write-prohibited `blacklist` decision; recording/override/correction specifics (DEC-004/005) NOT VERIFIED |
| ATR-001..005 | P0/P1 | ⚪ NOT VERIFIED | Attribution advisory/confidence/correctable model present (`loss_attribution_candidates`); UX + IDN-confidence-reuse guard not audited |
| RCV-001 | P0 | 🔵 PASS | All 8 board groups map every status (`lib/recoveries/status.ts`) |
| RCV-002 | P0 | 🔵 PASS | Distinct events per transition (`eventTypeForStatus`) |
| RCV-003 | P0 | 🔵 PARTIAL | `approved`/`partially_approved` are separate from `paid`; "not recovered until receipt" enforced in board; amount path not traced |
| RCV-004 | P0 | 🔵 PARTIAL | Amount-sought/recovered/outstanding/written-off in `readModel`; cumulative logic (`amounts.ts`) present |
| RCV-005 | P0 | ⚪ NOT VERIFIED | Close-unrecoverable reason + write-off not fully traced |
| RCV-006 | P0 | 🔵 PARTIAL | Connectors return typed unsupported for external submit (no autonomous submission found); explicit human-confirm UX not verified |
| RCV-007 | P1 | 🔵 PASS | `chase_due` does not set `last_chased_at` until a human records a chase (SCN-016) |

## 8. Journeys (JRN) — see `02-merchant-journeys.md` for detail

| ID range | Pri | Status | Note |
|---|---|---|---|
| JRN-001..006 (onboarding) | P0/P1 | ⚪ NOT VERIFIED | Onboarding domain agent did not run |
| JRN-010..015 (connection) | P0/P1 | 🟢 PARTIAL | Provider matrix covers connect/reconnect/disconnect truthfulness; JRN-013 reconnect-no-dup not runtime-verified |
| JRN-020..025 (pre-payout) | P0/P1 | ⚪ NOT VERIFIED | Case domain agent did not run; JRN-020 idempotency partly covered by webhook dedupe |
| JRN-030..033 (retrospective) | P0/P1 | ⚪ NOT VERIFIED | Not audited |
| JRN-040..043 (carrier) | P0/P1 | 🔵 PARTIAL | Carrier recovery model present; carriers are proof-lookup only (see UPS/FedEx) |
| JRN-050..052 (fulfilment/3PL) | P0/P1 | 🔵 PARTIAL | ShipBob live; self-fulfilment low-confidence pack confirmation present |
| JRN-060..062 (return) | P1 | ⚪ NOT VERIFIED | `source_returns` exists; return/refund separation not audited |
| JRN-070..072 (dispute) | P1 | 🔵 PARTIAL | Shopify disputes fetch exists but pilot scope omits `read_shopify_payments_disputes` |
| JRN-080..083 (exception) | P0/P1 | ⚪ NOT VERIFIED | Exceptions domain not audited |
| JRN-090..093 (recovery) | P0 | 🔵 PARTIAL | Recovery lifecycle strong; JRN-090/091 amount caps not adversarially tested |
| JRN-100..102 (reporting) | P0/P1 | ⚪ NOT VERIFIED | Shared metric service exists; drill-down/consistency unverified |
| JRN-110..112 (collaboration) | P1 | ⚪ NOT VERIFIED | Comments/notifications not audited |

## 9. IA, shell, UX (IA, SHL, UX, STA)

| ID | Pri | Status | Evidence / gap |
|---|---|---|---|
| IA-001 | P0 | 🔵 PASS | One canonical route per concept; aliases + `next.config.js` redirects rather than duplicate renders |
| IA-002 | P0 | 🔵 PASS | Nav uses "Payout Control", "Losses", "Recovery" (`lib/navigation/appRoutes.ts`) |
| IA-003 | P0 | ⚪ NOT VERIFIED | Cross-links between detail pages not audited |
| IA-004 | P0 | ⚪ NOT VERIFIED | Back/forward filter preservation not audited |
| IA-005 | P1 | 🔵 PARTIAL | Permission-filtered nav exists; empty-group avoidance not verified |
| IA-006 | P0 | 🔵 PASS | Legacy `/watchlist`,`/chargebacks`,`/network-metrics`,`/graph`,`/clusters`,`/inbox`,`/catches` redirect to canonical routes (`next.config.js`) |
| SHL-001..004 | P0/P1 | ⚪ NOT VERIFIED | Shell/workspace-switcher/attention-badges/source-health-warning not audited |
| UX-001..012 | P0/P1 | ⚪ NOT VERIFIED | Lists/drawers/confirmations/validation/feedback/states/bulk-limits not audited (UX-011 no-bulk-payout partly supported by absence of bulk decision routes) |
| STA-001..005 | P0/P1 | ⚪ NOT VERIFIED | `/flows` has loading/error; per-route state coverage not audited; STA-004 idempotency partly covered by webhook dedupe |

## 10. Page-by-page (ONB, OVR, WRK, PCL, CAS, WID, LOS, REC, CUS, RUL, FLW, RPT, INT, EXC, SEA, NTF, SET, HLP, OBV)

| ID range | Pri | Status | Note |
|---|---|---|---|
| ONB-001..005 | P0/P1 | ⚪ NOT VERIFIED | Onboarding not audited |
| OVR-001..007 | P0/P1 | ⚪ NOT VERIFIED | Overview not audited (uses shared metric service) |
| WRK-001..006 | P0/P1 | ⚪ NOT VERIFIED | Work not audited |
| PCL-001..007 | P0/P1 | 🔵 PARTIAL | Payout Control queues + `CLAIM_LIST_SELECT` fields present; PCL-005 no-bulk-approval supported by absence of bulk decision route; queue/detail depth not fully audited |
| CAS-001..011 | P0/P1 | ⚪ NOT VERIFIED | Case detail domain agent did not run |
| WID-001..004 | P1 | ⚪ NOT VERIFIED | Widget not audited |
| LOS-001 | P0 | 🔵 PASS | Request/exposure ≠ confirmed loss (separate `confirmed_loss_minor`/exposure) |
| LOS-002 | P0 | 🔵 PASS | Estimated vs confirmed are distinct fields in `readModel` |
| LOS-003 | P0 | 🔵 PARTIAL | `prevented` is a distinct financial state; prevention-only separation in totals not UI-verified |
| LOS-004..007 | P0/P1 | 🔵 PARTIAL | Attribution candidates + correspondence + filters modelled; UX not verified |
| REC-001 | P0 | 🔵 PASS | Every status in a board group (`lib/recoveries/status.ts`) |
| REC-002..008 | P0/P1 | 🔵 PARTIAL | Canonical state machine + events + amount validation present; board/list filter parity + partner-perf not verified |
| CUS-001..008 | P0/P1 | ⚪ NOT VERIFIED | Customers/identity domain agent did not run (CUS-005 no-fraud-labels partly supported by banned-term sweep) |
| RUL-001..008 | P0/P1 | ⚪ NOT VERIFIED | Rules domain agent did not run (`lib/rules/versioning.ts` has version states) |
| FLW-001..007 | P1 | ⚪ NOT VERIFIED | Flows domain agent did not run; note `/flows` UI ↔ `workflows` backend naming split |
| RPT-001..003,005..007 | P0/P1 | ⚪ NOT VERIFIED | Reports drill-down/export not audited |
| RPT-004 | P0 | 🔵 PASS | Dashboard + reports share `lib/reporting/intelligence` (no per-page formula) |
| INT-001 | P0 | 🔵 PASS | One canonical catalogue (`lib/integrations/registry.ts`); pages read it |
| INT-002 | P0 | 🟢 FAIL | "Live" driven by `buildStatus` metadata, not end-to-end validation; 4 providers false-live |
| INT-003 | P0 | 🟢 PARTIAL | `partial`/`planned` mostly honest (Woo/BigCommerce/Stripe); Shopify disputes over-advertised vs pilot scope |
| INT-004 | P0 | 🟢 PARTIAL | Effective health real for Shopify/Gorgias/ShipBob; **absent for Zendesk/Freshdesk**; carrier health is token-refresh-only |
| INT-005 | P0 | ⚪ NOT VERIFIED | Multi-account labelling/collision not audited |
| INT-006 | P0 | ⚪ NOT VERIFIED | Reconnect-no-dup not runtime-verified |
| INT-007 | P0 | 🔵 PARTIAL | Category-driven disconnect exists; Zendesk/Freshdesk generic-disconnect may fail (wrong table); only ShipBob audits disconnect |
| INT-008..009 | P1 | ⚪ NOT VERIFIED | Error repair / missing-category surfacing not audited |
| EXC-001..004 | P0/P1 | ⚪ NOT VERIFIED | Exceptions not audited |
| SEA-001 | P0 | 🔵 PARTIAL | Search server-authorized + merchant-scoped (`app/api/search`), but term in GET URL (SEC-009) |
| SEA-002..005 | P0/P1 | ⚪ NOT VERIFIED | Ranking/masking/shortcuts/no-result not audited |
| NTF-001..004 | P1 | ⚪ NOT VERIFIED | Notifications not audited |
| SET-001 | P0 | 🔵 PARTIAL | Settings read/write use canonical workspace/team records; full coverage unverified |
| SET-002 | P0 | 🔵 PARTIAL | Role changes server-side; audit incomplete (AUD-001) |
| SET-003 | P0 | 🔵 PARTIAL | API keys hashed/rotatable (`tests/lib/apiKeys.test.ts`); "shown once/never logged" not fully verified |
| SET-004 | P0 | 🔵 PARTIAL | Workspace/account deletion owner-only + thorough purge; recoverability/delay policy not verified |
| SET-005..007 | P1 | ⚪ NOT VERIFIED | Unsaved-changes / billing-gate / partner-terms not audited |
| HLP-001..002 | P1 | ⚪ NOT VERIFIED | Help not audited |
| OBV-001..003 | P1 | ⚪ NOT VERIFIED | Connected-object views not audited |

## 11. Data/identity/connector contract (CON, FRS, IDN, EVD)

| ID | Pri | Status | Evidence / gap |
|---|---|---|---|
| CON-001 | P0 | 🔵 PASS | One catalogue owns provider metadata (`lib/integrations/registry.ts`) |
| CON-002 | P0 | 🟢 PARTIAL | Adapters declare capabilities; unimplemented return typed unsupported (good) — but "presentation ≠ adapter" violated by 4 false-live providers |
| CON-003 | P0 | 🔵 PARTIAL | Credentials encrypted/server-only/scoped (`lib/integrations/secrets.ts`); support secret-in-URL gap |
| CON-004 | P0 | 🟢 PARTIAL | Signature-before-parse for Shopify/Woo/ShipBob/Stripe; **BigCommerce + support providers verify after parse, no replay defence** |
| CON-005 | P0 | 🔵 PARTIAL | Idempotency keys via `processed_webhooks`; per-merchant/source-account uniqueness for all writes not fully verified |
| CON-006..013 | P0/P1 | ⚪ NOT VERIFIED | Mapping/unsupported-value/backoff/reconcile/demo-distinct not audited (ingestion agent did not run) |
| FRS-001..006 | P0/P1 | 🟢 PARTIAL | Effective freshness real for 3 providers; missing for Zendesk/Freshdesk; carrier freshness weak |
| IDN-001 | P0 | 🟢 PARTIAL | Matching merchant-scoped; network identity graph is caller-scoped (no `merchant_id`) — structural risk, reads gated by owned members |
| IDN-002..008 | P0/P1 | ⚪ NOT VERIFIED | Identity confidence/merge/unmerge/reuse-guard not audited |
| EVD-001..007 | P0/P1 | ⚪ NOT VERIFIED | Evidence-state model + strength calc not audited (`lib/evidence/*` exists) |

## 12. Metrics (MET)

| ID | Pri | Status | Note |
|---|---|---|---|
| MET-033 | P0 | 🔵 PASS | No metric recomputed with a different formula per surface (shared `intelligence` service) |
| MET-001..024, MET-030..032, MET-034 | P0/P1 | ⚪ NOT VERIFIED | Per-metric formula/drill-down/denominator-handling not audited (financial-metrics agent did not run) |
| MET-035 | P2 | OUT_OF_SCOPE | ROI correctly deferred; no ROI surface found |

## 13. Required states (STA) — see §9. All ⚪ NOT VERIFIED except state primitives exist.

## 14. Non-functional (SEC/PRV/AUD deep in `03`; others below)

| ID | Pri | Status | Note |
|---|---|---|---|
| SEC-001..010 | P0 | 🟢 mostly PARTIAL | See `03`. No PASS: systemic scoping + no live cross-tenant test + audit gaps |
| PRV-001,003,005,006 | P0/P1 | 🟢 PARTIAL | See `03` |
| PRV-002 | P0 | 🟢 PARTIAL | Merchant removal hits legacy tables only |
| PRV-004 | P0 | 🟢 MISSING | No per-subject erasure |
| AUD-001 | P0 | 🟢 PARTIAL/High | Fire-and-forget + incomplete action set |
| AUD-002..004 | P0 | 🟢 PARTIAL | Missing correlation id / effective time / system-actor flag / superset guarantee |
| AUD-005 | P1 | 🟢 UNVERIFIED | Audit export content not verified |
| RLY-001..007 | P0/P1 | ⚪ NOT VERIFIED | Reliability/outbox/backoff/dead-letter not audited (ingestion agent did not run) |
| PER-001..006 | P0/P1 | ⚪ NOT VERIFIED | Runtime performance not measured (static audit) |
| A11Y-001..006 | P0/P1 | ⚪ NOT VERIFIED | Accessibility is runtime; `tests/current/accessibility-responsive.spec.ts` exists but not executed here |
| OBS-001..004 | P0/P1 | ⚪ NOT VERIFIED | Correlation IDs + alerting not audited; `lib/sentry.ts` present |
| DSN-001..010 | P1 | ⚪ NOT VERIFIED | Design-system consistency not audited (`lint:authenticated-design` guard exists + passed) |
| CPY-001 | P0 | 🔵 PARTIAL | Merchant UI largely neutral; legacy `blacklist` decision alias remains |
| CPY-002 | P0 | ⚪ NOT VERIFIED | "Record X decision" vs "Refund customer" labelling not audited across all actions |
| CPY-003..004 | P0/P1 | ⚪ NOT VERIFIED | Not audited |

## 17. Acceptance scenarios (SCN)

| ID | Pri | Status | Note |
|---|---|---|---|
| SCN-001 | P0 | ⚪ NOT VERIFIED | Full pre-payout case chain not traced live (`e2eOrder1013Chain.test.ts` exists) |
| SCN-002 | P0 | 🔵 PARTIAL | Duplicate webhook dedupe proven; out-of-order handling not verified |
| SCN-003 | P0 | ⚪ NOT VERIFIED | Missing-evidence degradation not audited |
| SCN-004 | P0 | ⚪ NOT VERIFIED | Ambiguous match → exception not audited |
| SCN-005 | P0 | ⚪ NOT VERIFIED | Override reason + preserve original not audited |
| SCN-006 | P0 | ⚪ NOT VERIFIED | Retrospective payout not audited |
| SCN-007 | P0 | 🟢 PARTIAL | Stale/revoked source: real for 3 providers, absent for Zendesk/Freshdesk |
| SCN-008 | P0 | ⚪ NOT VERIFIED | Reconnect-no-dup not runtime-verified |
| SCN-009 | P0 | 🔵 PARTIAL | Formulas correct in code; exact worked example not traced to a live case |
| SCN-010 | P0 | 🔵 PARTIAL | Per-currency separation proven in `projectSummary`; UI "no hidden combined total" not verified |
| SCN-011 | P0 | 🔵 PARTIAL | Reversal/correction modelled (append-only); UI correction flow not verified |
| SCN-012 | P0 | 🟢 PARTIAL | Server denies + no state change; silent redirect (no explanation), attempt not logged; stale tests |
| SCN-013 | P0 | 🟢 PARTIAL | Scoped in reviewed vectors; **no live end-to-end proof** |
| SCN-014 | P0 | 🟢 PARTIAL | Partial/planned mostly honest; 4 false-live undermine |
| SCN-015 | P0 | ⚪ NOT VERIFIED | CSV partial-import not audited |
| SCN-016 | P0 | 🔵 PASS | `chase_due` doesn't set `last_chased_at`; no duplicate work (`lib/recoveries/status.ts`) |
| SCN-017 | P0 | ⚪ NOT VERIFIED | Rule version history not audited |
| SCN-018 | P0 | ⚪ NOT VERIFIED | No-source first-use not audited |

## 18. Verification contract (QAT)

| ID | Pri | Status | Note |
|---|---|---|---|
| QAT-001 | P0 | 🔵 PARTIAL | Strong unit coverage (money/status/recovery/evidence/rules suites) but with fixtures; some suites shallow |
| QAT-002 | P0 | 🔵 PARTIAL | Append-only + idempotency tested; **RLS/tenant-isolation live test skipped** |
| QAT-003 | P0 | 🔵 PARTIAL | Webhook/duplicate/reconnect tests exist; reorder/partial-import/backoff incomplete |
| QAT-004 | P0 | ⚪ NOT VERIFIED | Browser route/state coverage exists (`tests/current/*.spec.ts`) but not executed here |
| QAT-005 | P0 | 🟢 PARTIAL | Controlled live proof for Gorgias + ShipBob (+Shopify w/ fixture fallback); **none for the 4 false-live providers** |
| QAT-006 | P0 | 🔵 PARTIAL | `crossModuleFinancialIntegrity.test.ts` exists; full dashboard↔ledger↔export reconciliation not proven |
| QAT-007 | P0 | ⚪ NOT VERIFIED | A11y automated+manual not executed here |
| QAT-008 | P0 | ⚪ NOT VERIFIED | Performance tests not run |
| QAT-009 | P0 | 🟢 PARTIAL | Security suites broad but 2 fail (stale) + isolation test skipped |
| QAT-010 | P1 | ⚪ NOT VERIFIED | Visual regression not run |
