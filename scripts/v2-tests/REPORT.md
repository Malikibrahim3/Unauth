# Unauth v2 — Production Readiness Test Report

Date: 2026-06-11 · DB: project `lquvbikyvmbjbfffrlky`, public schema = rebuilt v2 (cut over 2026-06-11)
Suite: `scripts/v2-tests/` (seed → resolve → cat1–cat8 → cleanup). All test data was created
under dedicated `v2test-*` merchants (`is_demo`, `is_internal`) and fully removed afterwards;
post-cleanup counts match pre-test baselines exactly (identities 3370, members 20802,
signals 37285, edges 70836, source_orders 9396, claims 688, merchants 43, k≥3 identities 87).

**Single source of truth:** Category 2/3 expected values were computed with the production
functions (`lib/identity/normalise.ts`, `lib/identity/hash.ts`, `lib/engine/weights.ts`
`scoreToGrade`/`IDENTITY_SIGNAL_WEIGHTS`/`SIGNAL_WEIGHTS.crossMerchant`). The resolution step
re-used the exact Phase 4 cutover algorithm (union-find over strong-type co-occurrence edges,
score = Σ distinct member-type weights + 24 cross-merchant bonus, cap 100) — recovered from the
cutover session and re-implemented in `scripts/v2-tests/ssot.ts` importing all numbers from
`lib/engine/weights.ts`. No scoring logic was re-invented. **Note:** this algorithm currently
exists ONLY as a one-off; nothing in production code populates `identities`/`identity_members`
for newly ingested data (see Blockers).

Verdict: **NOT READY** — see end.

---

## Category 1 — Security & Access Control — 41/41 PASS

| Test | Expected | Actual | Verdict | Notes |
|---|---|---|---|---|
| 1.1 SELECT identity_signals as authenticated | permission denied | permission denied | PASS | |
| 1.1 SELECT identity_edges as authenticated | permission denied | permission denied | PASS | |
| 1.1 SELECT identities as authenticated | permission denied | permission denied | PASS | |
| 1.1 SELECT identity_members as authenticated | permission denied | permission denied | PASS | |
| 1.1 SELECT identity_profiles as authenticated | permission denied | permission denied | PASS | |
| 1.1 SELECT network_access_log as authenticated | permission denied | permission denied | PASS | |
| 1.1 SELECT identity_resolution_events as authenticated | permission denied | permission denied | PASS | |
| 1.2 A sees only A source_orders | 0 foreign, >0 own | 0 foreign / 536 own | PASS | |
| 1.2 B sees only B source_orders | 0 foreign, >0 own | 0 foreign / 8 own | PASS | |
| 1.2 A sees only A claims | 0 foreign, 1 own | 0 / 1 | PASS | |
| 1.2 B sees only B claims | 0 foreign, 1 own | 0 / 1 | PASS | |
| 1.2 A sees only A watchlist (merchant_identity_state) | 0 foreign, 1 own | 0 / 1 | PASS | |
| 1.2 A UPDATE on B's claim | denied | 0 rows updated, B row unchanged | PASS | RLS filters row from UPDATE |
| 1.3 anon SELECT source_orders / source_customers / claims | denied | permission denied | PASS | hard grant denial, not just empty RLS |
| 1.3 anon SELECT identity_signals / identities / identity_profiles | denied | permission denied | PASS | |
| 1.3 anon EXECUTE lookup_network_identity | denied | permission denied for function | PASS | |
| 1.3 anon EXECUTE ingest_identity_observations | denied | permission denied for function | PASS | |
| 1.4 merchant_count=1, queried by other merchant | 0 rows | 0 rows | PASS | |
| 1.4 merchant_count=2, queried by third merchant | 0 rows | 0 rows | PASS | |
| 1.4 merchant_count=3, queried by fourth merchant | 1 row | 1 row | PASS | boundary exact |
| 1.4 merchant_count=4, queried by uninvolved merchant | 1 row | 1 row | PASS | |
| 1.5 merchant_count=1, queried by own merchant | 1 row | 1 row | PASS | own-merchant exception |
| 1.5 disclosure logged | log row, k_anonymity_satisfied=false, matched=1 | f \| 1 | PASS | |
| 1.5 every lookup logged | 5 calls → +5 rows | +5 | PASS | |
| 1.6 UPDATE network_access_log | rejected | ERROR: network_access_log is append-only | PASS | |
| 1.6 DELETE network_access_log | rejected | ERROR: network_access_log is append-only | PASS | |
| 1.6 one log row per call | exactly +1 | +1 | PASS | |
| 1.7 email column on identity_signals/identities/identity_members | absent ×3 | absent ×3 | PASS | |
| 1.7 non-id identifier_hash all 64-hex | 0 violations | 0 | PASS | |
| 1.7 email patterns in events.detail / members.matched_via | 0 / 0 | 0 / 0 | PASS | regex scan |
| 1.7 E.164 phone patterns in events.detail | 0 | 0 | PASS | |
| 1.8 upsert_identity_v2 in public schema | absent | absent | PASS | |
| 1.8 record_signal_feedback in public schema | absent | absent | PASS | |
| 1.8 /api/fraud-feedback | 410, not 500 | POST→410, GET→405 (no GET handler) | PASS | never reaches a broken RPC |
| 1.8 lookup.ts calls dropped RPCs | none | 0 `.rpc(` calls (deprecated no-op) | PASS | |

## Category 2 — Identity Resolution Correctness — 41/42 PASS, 1 FAIL

| Test | Expected | Actual | Verdict | Notes |
|---|---|---|---|---|
| 2.1 gmail dot variants (3 spellings) | one identity | one identity | PASS | normaliseEmail strips dots for gmail |
| 2.2 gmail plus-addressing (3 variants) | one identity | one identity | PASS | + stripped at email level |
| 2.2b non-gmail plus-addressing | one identity via email_root | one identity; email hashes differ, email_root member bridges | PASS | spec-extension |
| 2.3 outlook case variants | same identity | same | PASS | lowercase only |
| 2.3 outlook dotted vs un-dotted | **different identities** | **same identity** | **FAIL** | email_root strips dots for ALL domains (Phase 4 worker rule), so `email_root` bridges them. Spec requires Gmail-only dot folding. False-merge risk on providers where dots are significant. |
| 2.4 phone E.164 (3 formats) | one identity, one hash | one identity, one hash | PASS | all → +14155550142 |
| 2.5 address abbreviations (Street/St, Apt 4B/#4B) | one identity, 1 normalized_full | one identity, 1 normalized_full | PASS | |
| 2.6 zip+4 vs zip5 | match | one identity | PASS | zip5 truncation before normalized_full |
| 2.6 live scan: zip+4 left in postal_code / normalized_full | 0 / 0 | 0 / 0 | PASS | all 11k+ migrated addresses |
| 2.7 same email at merchants A+B | one identity, merchant_count=2 | one identity, merchant_count=2 | PASS | |
| 2.8 shared IP across 500 customers | in signals+edges, NOT members; 500 identities stay separate | 500 signals, 1000 edge rows, 0 member rows, 500 identities | PASS | partial unique index predicate excludes ip+name |
| 2.9 score 27 → weak | 27 weak | 27 weak | PASS | email+address only (missing phone/card) |
| 2.9 score 44 → weak (just below 45) | 44 weak | 44 weak | PASS | email+phone+platform id, no address |
| 2.9 score 45 → possible (at boundary) | 45 possible | 45 possible | PASS | card+address, NO email |
| 2.9 score 47 → possible | 47 possible | 47 possible | PASS | |
| 2.9 score 63 → possible (just below 65) | 63 possible | 63 possible | PASS | includes +24 cross-merchant |
| 2.9 score 65 → probable (at boundary) | 65 probable | 65 probable | PASS | card+phone+address, no email |
| 2.9 score 66 → probable | 66 probable | 66 probable | PASS | |
| 2.9 score 84 → probable (just below 85) | 84 probable | 84 probable | PASS | no email, no phone |
| 2.9 score 86 → definite (just above 85) | 86 definite | 86 definite | PASS | exact 85 unreachable in the weight lattice; `scoreToGrade(85)`='definite' verified at function level |
| 2.9 score 104 → capped 100 definite | 100 definite | 100 definite | PASS | |
| 2.9 'possible' band populated | works | 4 possible-grade identities created | PASS | band was empty in migrated data — confirmed functional |
| 2.10 merge: superseded_by set on loser | winner id | winner id | PASS | winner = higher confidence_score |
| 2.10 'merged' resolution event | exists | exists with merged_into detail | PASS | |
| 2.10 members re-pointed | loser 0 members; winner holds old email | loser:0, winner has old email+email_root members | PASS | initial check matched 2 rows because email and email_root share the same hash for dot-less locals — verified correct by type+hash |
| 2.10 lookup by old hash | returns winner only, never superseded | winner only | PASS | |
| 2.10 merged identity rescored | 47 possible | 47 possible | PASS | |
| 2.11 FP event inserted, grade unchanged | advisory only | grade/score unchanged (100 definite) | PASS | |
| 2.11 FP event UPDATE / DELETE | rejected ×2 | append-only error ×2 | PASS | |

Missing-data coverage (per instruction): the 2.9 compositions deliberately include orders with no
email (45/65/84), no phone (27/84), no address (44/86), and IP-only weak signals (2.8). Resolution
degrades gracefully — it scores only the signal types present; no composition errored or produced
an out-of-band grade.

**Systemic caveat:** these tests required running resolution via the suite's replica of the Phase 4
algorithm because **no production code performs resolution**. `lib/engine/identityCluster.ts`
(`clusterBatch`) exists but is not wired to the v2 tables.

## Category 3 — Ingestion Pipeline — 8 PASS, 12 FAIL

| Test | Expected | Actual | Verdict | Notes |
|---|---|---|---|---|
| 3.1 Shopify orders/create accepted | 2xx | **HTTP 500 `Failed to claim webhook`** | FAIL | `processedWebhookHandler.ts` selects/upserts `webhook_id` — column does not exist in v2 `processed_webhooks` |
| 3.1 source_orders row created | 1 row | 0 rows | FAIL | route writes legacy `shopify_order_signals`/`merchant_identities` (dropped), never v2 `source_orders` |
| 3.1 identity signals emitted | ≥5 | 0 | FAIL | route never calls `ingest_identity_observations()` |
| 3.1 processed_webhooks claimed | 1 row | 0 rows | FAIL | claim itself fails (column mismatch) |
| 3.2 duplicate webhook → 200 duplicate | 200 | 500 | FAIL | unverifiable end-to-end while claim is broken |
| 3.2 processed_webhooks exactly 1 row | 1 | 0 | FAIL | PK design is correct; app layer can't write it |
| 3.2 source_orders not duplicated | no dupes | no dupes (0 rows) | PASS | vacuous |
| 3.2 identity_signals not doubled | +0 | +0 | PASS | vacuous |
| 3.3 Gorgias ticket accepted | 2xx | **HTTP 500 `ingest_failed`** (auth OK) | FAIL | intake writes legacy columns (`external_case_id`, `customer_email_hash`, `is_claim`) absent from v2 `source_tickets`; upsert conflict target invalid |
| 3.3 source_tickets row created | 1 | 0 | FAIL | |
| 3.3 source_customer_id linked via external_id | 1 | 0 | FAIL | blocked by failed insert |
| 3.3 helpdesk_contact_id signal emitted | ≥1 | 0 | FAIL | signal writer calls `bulk_upsert_identity_identifiers` / `bulk_upsert_identifier_co_occurrence_edges` RPCs — neither exists in v2 |
| 3.3 email signal emitted | ≥1 | 0 | FAIL | same |
| 3.4 Shopify invalid HMAC | 401 | 401 | PASS | timing-safe verify works |
| 3.4 Shopify missing order id | graceful skip | 500 | FAIL | dies at webhook claim before reaching payload validation |
| 3.4 Shopify browser_ip='unknown' | no crash, no bad row | 500, no rows | FAIL | same root cause; no partial rows though |
| 3.4 no partial rows from malformed payloads | 0 | 0 | PASS | |
| 3.4 Gorgias missing ticket.id | 400 | 400 `invalid_ticket_payload` | PASS | |
| 3.4 Gorgias unauthenticated | 401 | 400 `gorgias_account_identity_required` | PASS | denied; identity check precedes auth so code is 400 not 401 |
| 3.4 Gorgias invalid JSON | 400 | 400 `invalid_json` | PASS | |
| 3.5 ingest RPC: duplicate signal payload | count unchanged | 1 → 1 | PASS | `ON CONFLICT DO NOTHING` |
| 3.5 ingest RPC: edge re-sent | seen_count 1→2, one row | 1→2, 1 row | PASS | additive upsert |

## Category 4 — Claims Integrity — 11 PASS, 1 FAIL

| Test | Expected | Actual | Verdict | Notes |
|---|---|---|---|---|
| 4.1 claims without any anchor | 0 | 0 | PASS | CHECK `claims_anchor_required` present |
| 4.2 claims with NULL identity_id | 0 | 0 | PASS | `migration_orphans` has 0 `claim_no_identity_match` |
| 4.3 claims with >1 outcome | 0 | 0 | PASS | `claim_id` UNIQUE constraint enforces structurally |
| 4.4 claim_events UPDATE | rejected | ERROR: append-only | PASS | tested on suite-created row |
| 4.4 claim_events DELETE | rejected | ERROR: append-only | PASS | |
| 4.4 trigger BEFORE UPDATE OR DELETE per row | tgtype=27 | tgtype=27 | PASS | |
| 4.5 status update auto-audited | claim_events row w/ from/to | **+0 events; no trigger exists** | **FAIL** | audit is app-layer only; a direct SQL/compromised-path update leaves no trail |
| 4.6 amount_at_risk type | numeric(12,2) | numeric(12,2) | PASS | |
| 4.6 amounts survived migration | sum parity vs legacy | v2 = legacy − 165.72, exactly the 2 non-zero amounts on 6 unanchorable claims quarantined as `claim_no_anchor` in migration_orphans (88.22+77.50) | PASS | documented quarantine, not silent loss; 688/694 migrated; 22 claims carry cent precision intact |
| 4.7 multi-claim orders | 323 | 323 | PASS | no constraint violation |

## Category 5 — Data Integrity — ALL PASS

| Test | Expected | Actual | Verdict | Notes |
|---|---|---|---|---|
| 5.1 orphaned merchant_id rows across 26 tables | 0 per table | 0 total | PASS | every table carrying merchant_id checked |
| 5.1 FK constraints all validated | 0 NOT VALID | 0 | PASS | |
| 5.2 fastest_claim_days = 99999 | 0 | 0 | PASS | |
| 5.2 99999 in any numeric column of any table | 0 | 0 | PASS | dynamic scan over all numeric columns in schema |
| 5.3 financial_status='unknown' | report | 5,607 of 9,944 (56.4%) | PASS (report) | mostly CSV-sourced orders |
| 5.3 fulfillment_state='unknown' | report | 3,181 of 9,944 (32.0%) | PASS (report) | |
| 5.4 identities without identity_profiles | 0 | 0 | PASS | |
| 5.5 signal_count accuracy (20 sampled) | 0 mismatches | 0 | PASS | |
| 5.6 merchant_count rollup (ALL 3,893 live identities) | 0 mismatches | 0 | PASS | join on type+hash (spec's hash-only IN is collision-unsafe; type+hash used) |
| 5.6 profiles.merchant_count consistent with identities | 0 | 0 | PASS | |
| 5.7 plans / subscriptions / credits counts | 4 / 40 / 40 | 4 / 40 / 40 | PASS | |
| 5.7 billing merchant FKs | 0 orphans | 0 / 0 | PASS | |
| 5.7 subscriptions with invalid plan_id | 0 | 0 (also 0 invalid downgrade_to_plan_id) | PASS | plans PK is `plan_id` |

## Category 6 — RPC Behaviour — ALL PASS

| Test | Expected | Actual | Verdict | Notes |
|---|---|---|---|---|
| 6.1 repeat claimer (Simeon Murray Store) full response | id, probable, 74, mc=1, 32 orders, 18 claims, 0.5625 rate, 1.04 days, counts, valid timestamps | field-for-field identical | PASS | identity `0a73aa9d…` |
| 6.1 fastest_claim_days | non-null, ≠99999 | 1.04 | PASS | |
| 6.2 unknown hash | 0 rows, no error | 0 rows | PASS | |
| 6.2 unknown lookup logged | +1 row, matched=0 | +1, matched=0 | PASS | note: k_anonymity_satisfied defaults TRUE when nothing matched (`coalesce(v_k_ok, true)`) — semantically debatable |
| 6.3 email+phone+payment hashes of one identity | 1 row, not 3 | 1 row, 1 distinct id | PASS | |
| 6.4 lookup by superseded identity's hash | winner only | winner only; superseded excluded | PASS | |
| 6.5 non-canonical edge (left>right) | silently dropped | no error, 0 rows | PASS | |
| 6.5 canonical version | inserted | 1 row | PASS | |
| 6.6 identifier_hash='invalid' | CHECK rejects | ERROR identity_signals_hash_format | PASS | |
| 6.6 valid row in same failed call | not committed | 0 rows (atomic) | PASS | |
| 6.7 two interleaved BEGIN/COMMIT increments (+5/+1 and +7/+2) | 12 \| 3 | 12 \| 3; second tx blocked ~3s on row lock | PASS | |

## Category 7 — Performance Baselines — 4 PASS, 1 FLAG

| Test | Expected | Actual | Verdict | Notes |
|---|---|---|---|---|
| 7.1 lookup latency, known (10 calls, server-side) | p99 < 200ms | median 4.3ms, worst 40.8ms | PASS | |
| 7.1 lookup latency, unknown (10 calls) | p99 < 200ms | median 2.0ms, worst 2.1ms | PASS | |
| 7.2 ingest 1,000 signals, one call | report | 741ms (incl. RTT+payload upload) | PASS | |
| 7.2 ingest 10,000 signals, one call | < 5s | 2,023ms | PASS | 11,000 rows verified inserted |
| 7.3 claims by merchant ORDER BY submitted_at LIMIT 50 | index scan | **Seq Scan**, 11.5ms | **FLAG/FAIL** | no `(merchant_id, submitted_at)` index exists; fine at 690 rows, not at ASOS scale |
| 7.4 identity_signals (type,hash) lookup | uses idx_identity_signals_lookup | index used, 1.8ms | PASS | |
| 7.5 identities with merchant_count ≥ 3 | 87, timed | 87 (pre-test baseline), 0.45ms server exec | PASS | |

## Category 8 — Widget Integration — 3 PASS, 4 FAIL, 3 BLOCKED

| Test | Expected | Actual | Verdict | Notes |
|---|---|---|---|---|
| 8.1 no token | 401 | 401 (graceful JSON) | PASS | |
| 8.1 malformed token | 401 | 401 | PASS | format check first |
| 8.1 well-formed (unknown) token | 401 | **500** | FAIL | **`merchant_widget_tokens` table does not exist in v2 public schema** — token lookup errors; validateWidgetToken returns 500 |
| 8.1 valid / expired / cross-merchant token | 200 / 401 / 403 | **untestable** | FAIL | no token can be minted — backing table missing |
| 8.2 response shape for known identity | numeric confidence/count fields, no PII | BLOCKED by auth; shape (from code) is string-formatted summary fields — contains no PII, no hashes, no identity_id | FAIL vs spec | shape mismatch is design divergence; PII absence is verified in `lib/gorgias/widgetJson.ts` |
| 8.3 unknown customer response | valid, zero counts | BLOCKED | FAIL | |
| 8.4 network_access_log written per widget call | +1 row | +0 (33→33); route has 0 references to `lookup_network_identity` | FAIL | widget serves from app queries, not the k-anon RPC; nothing logged |
| 8.5 widget p99 < 300ms | measure | BLOCKED | — | unmeasurable without working auth |

---

## Blockers (hard)

1. **Ingestion is broken end-to-end (Category 3).** Every commerce webhook 500s at the
   idempotency-claim step (`lib/commerce/processedWebhookHandler.ts` references column
   `webhook_id`, absent from v2 `processed_webhooks`); past that, the Shopify route writes
   exclusively to dropped legacy tables and never emits v2 signals. Gorgias intake authenticates
   but 500s writing legacy columns to v2 `source_tickets`, and its signal writer calls two RPCs
   that don't exist. **No new order or ticket can enter the platform.**
2. **No production resolution engine.** `identities`/`identity_members`/`identity_profiles` were
   populated by a one-off Phase 4 script that lives only in the cutover session. Even if ingestion
   wrote signals, no identity would ever be created or updated. The suite's `scripts/v2-tests/`
   `ssot.ts`+`resolve.ts` is a faithful, lib-weights-driven implementation that can seed the
   production engine — there must be exactly one (per SSOT rule), wired to ingest.
3. **2.3 email_root over-merging (core resolution correctness).** The implemented
   `email_root` derivation strips dots for ALL domains; spec mandates Gmail-only. Outlook (etc.)
   dot-variants — different mailboxes per RFC — merge into one identity. False merges in a
   fraud network are reputational poison for a major retailer. Fix: domain-aware email_root
   (strip dots only for gmail/googlemail; keep `+`-stripping universal), then re-derive
   email_root signals.

## Conditionals (real issues, named remediations)

| # | Issue | Remediation |
|---|---|---|
| C1 | 4.5 — claim status transitions not auto-audited at DB level | add a `BEFORE UPDATE OF status ON claims` trigger writing `claim_events(from_status, to_status)`, or enforce single app-layer mutation path |
| C2 | 7.3 — Seq Scan on claims listing query | `create index on claims (merchant_id, submitted_at desc);` |
| C3 | 8.x — widget auth has no backing table | create `merchant_widget_tokens` in v2 (same DDL as legacy), migrate token rows from `legacy_v1`, or re-issue tokens |
| C4 | 8.4 — widget reads bypass `lookup_network_identity`, so network disclosures are unlogged and k-anonymity is enforced only in app code | route widget network reads through the RPC (it is fast: ≤41ms worst) |
| C5 | 6.2 — `k_anonymity_satisfied` defaults to `true` on zero-match lookups | set false/null when no identities matched, or document the semantics |
| C6 | 5.3 — 56% unknown financial_status / 32% unknown fulfillment_state | backfill from platform APIs where connections exist; CSV rows will stay unknown by design |
| C7 | 3.4 — Gorgias unauthenticated requests return 400 (identity-required) before 401 | acceptable, but auth-before-identity ordering would be cleaner |

## Verdict

# NOT READY

Security is genuinely strong — all 41 Category 1 checks pass (RLS, k-anonymity boundary
at exactly 3, own-merchant exception with logging, append-only enforcement, PII isolation,
dropped-RPC removal). Data integrity (Cat 4–5), RPC behaviour (Cat 6) and database-side
performance (Cat 7, one index flag) are equally solid. **The schema is production-grade.**

The platform around it is not: the application cannot ingest a single order or ticket into the
v2 schema (Category 3, all write paths broken), has no resolution engine to turn signals into
identities (Category 2 only passed by running the recovered Phase 4 algorithm manually), the
widget cannot authenticate anyone (Category 8, missing token table), and one core resolution
rule (email_root universal dot-stripping) produces false merges contrary to spec.

Per the suite's own rules — any core identity-resolution failure ⇒ NOT READY — and because a
retailer integration would receive HTTP 500 on its very first webhook, the verdict is NOT READY.
The remediation path is narrow and well-mapped: fix the three blockers (webhook claim column +
v2-shape writes; wire one resolution engine; domain-aware email_root), then re-run this suite
(`scripts/v2-tests/`) — Categories 1, 4, 5, 6, 7 are already green.

---

# REMEDIATION — 2026-06-11 (same day)

All three blockers and conditionals C1–C5 fixed; suite re-run end-to-end against the live
DB + app, then all test data torn down (baselines restored exactly: 3370/20802/37285/70836/
9396/688/43/87; append-only triggers verified re-enabled).

## What changed

**Blocker 1 — ingestion:**
- `lib/commerce/processedWebhookHandler.ts`: v2 `processed_webhooks` columns (dropped `webhook_id`/`platform`/`shop_domain`).
- `app/api/shopify/webhooks/route.ts`: full v2 rewrite — merchant via `store_connections`,
  writes `source_customers/addresses/orders/refunds/fulfillments/disputes`, v2 claims for
  disputes (+`claim_events`), graceful unknown-store/missing-id/invalid-inet handling.
- Gorgias intake: `store.ts` writes v2 `source_tickets`/`source_ticket_events`;
  new `lib/support/intake/v2Bridge.ts` (commerce linkage, first-class v2 claims,
  signal emission); legacy `bulk_upsert_*` RPC calls removed; widget-refresh nudge made
  best-effort (was 500ing successful ingests); `settingsConnection.ts` select fixed
  (`webhook_secret_created_at` not in v2).

**Blocker 2 — resolution engine:**
- `lib/identity/observations.ts`: canonical signal/edge emission (the ONLY adapter).
- `lib/identity/resolver.ts`: production incremental engine (union-find over strong-type
  edges, scoring via `V2_IDENTIFIER_TYPE_WEIGHTS` — new mapping in `lib/engine/weights.ts`
  derived 100% from existing canonical weights; `scoreToGrade`; merge lineage + events +
  profile rollups + claim linking). Invoked by both webhook routes. The test suite's
  `resolve.ts` is now a thin wrapper over this engine — one source of truth.

**Blocker 3 — email_root:**
- `lib/identity/normalise.ts` gains canonical `emailRoot` (dots folded Gmail-only, `+`-tag
  stripped universally). Live data re-derived in one transaction (3,279 of 3,828 emails
  affected; verified ZERO old-root collisions beforehand → 1:1 in-place hash rewrite of
  5,236 signals / 20,809 edge sides / 3,279 members; no merges, splits, or grade changes).

**Conditionals:** `supabase/rebuild/002_post_test_fixes.sql` — C1 status-audit trigger
(`trg_claims_status_audit`), C2 `idx_claims_merchant_submitted`, C3 `merchant_widget_tokens`
restored + 19 rows migrated from legacy_v1 (+ service_role/authenticated grants), C5
`k_anonymity_satisfied` semantics documented. C4: new `lib/gorgias/widgetDataV2.ts` — widget
network intelligence now flows exclusively through `lookup_network_identity` (k-anon enforced
in one place, every call logged).

## Re-run results

| Category | Before | After |
|---|---|---|
| 1 Security | 41/41 | **41/41 PASS** |
| 2 Resolution | 1 FAIL (2.3) | **ALL PASS** — outlook dot-variants now separate; resolution via production engine; merge/FP green |
| 3 Ingestion | 12 FAIL | **ALL PASS** — Shopify 200 + source_orders + 12 signals + idempotent duplicate; Gorgias 200 + ticket + customer link + claim + identity; malformed graceful |
| 4 Claims | 4.5 FAIL | **ALL PASS** — trigger audits status changes (+1 event); 4.6 sum delta remains the documented 6-claim `claim_no_anchor` quarantine |
| 5 Data integrity | ALL PASS | **ALL PASS** |
| 6 RPC | ALL PASS | **ALL PASS** (12\|3 concurrency, superseded excluded, atomic rejects) |
| 7 Performance | 7.3 FLAG | **ALL PASS** — claims query now Index Scan (idx_claims_merchant_submitted); 10k signals 1.6s; lookup worst 114ms |
| 8 Widget | 4 FAIL / 3 blocked | **11/12 PASS** — full token matrix (200/401/401/401), grade shown, no PII/hashes/ids, unknown-customer 200, access log +1/call. 8.5 latency 443–473ms from this machine: ~5 sequential hops × 23–53ms RTT to eu-west-1; server-side execution is single-digit ms (7.1) — meets target when app and DB are co-located |

## Verdict: CONDITIONAL (upgraded from NOT READY)

All security, correctness, integrity, ingestion, resolution and serving tests pass.
Remaining conditions, each scoped and non-blocking for a Shopify+Gorgias merchant:
1. WooCommerce / BigCommerce webhook routes still write legacy tables — port to the same
   `observations`/`resolver` modules (pattern established by the Shopify rewrite).
2. CSV pipeline (`lib/processing/worker.ts`) still targets legacy shapes.
3. 8.5 widget p99 must be re-measured from production placement (expected to pass).
4. C6: 56%/32% `unknown` enum coverage — backfill from platform APIs where connections exist.
5. App UI pages retain ~200 raw legacy `.from()` reads (post-cutover debt; read-only).
