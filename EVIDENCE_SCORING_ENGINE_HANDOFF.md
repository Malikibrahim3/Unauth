# Evidence Scoring Engine — Implementation Handoff

> **Audience:** a coding agent (e.g. Cursor Composer 2.5) continuing this feature.
> **Branch:** `feat/evidence-scoring-engine`
> **Golden rule:** this doc describes intent + verified facts as of the last session.
> The working tree is ground truth — **open and read the real files before editing**;
> if reality contradicts this doc, follow the code and note it.

---

## 1. What this feature is

Unauth's intelligence layer is a three-stage pipeline:

1. **Identity Resolution** (already built) — "is this the same person across merchants?" → outputs a `confidence_grade` (`weak | possible | probable | definite`) on the `identities` table. **Do not modify this engine.**
2. **Evidence Scoring** (this feature) — "given it *is* them, how concerning is the accumulated pattern?" → outputs an `evidence_score` (0–100) + `evidence_level`, cached per identity, fully decomposed for audit.
3. **Rules Engine** (already built) — merchant rules consume both the confidence grade and the evidence score to produce a recommendation.

**Confidence and evidence are two separate axes and are NEVER merged** (not summed, not blended into one number). A rule may reference both; the two values stay distinct columns from distinct sources.

---

## 2. Hard rules / invariants (do not violate)

From `CLAUDE.md` and decisions made this project:

1. **Never modify** identity-resolution internals or any existing scoring/weighting/matching/cluster logic. Evidence scoring only *consumes* `identities.confidence_grade`.
2. **No `as any`** in production code. **No `// eslint-disable`.** Fix types properly. (`: any` *type annotations* are tolerated by lint and acceptable for test mocks; `as any` casts are not.)
3. **Env only via `env` from `@/lib/utils/env`** — never `process.env` in server code. New vars go in that Zod schema. `CRON_SECRET` already exists.
4. **British spelling** in identifiers and copy (`normalise`, `GRADE_COLOURS`; 401 body is `'Unauthorised'`). DB is snake_case; TS is camelCase.
5. **SSOT for table/column names:** import from `@/lib/supabase/tables` (`TABLES`, `COLUMNS`). Never hard-code a table-name string.
6. **Evidence config is its own axis** — it must not import or merge `SIGNAL_WEIGHTS` / `IDENTITY_SIGNAL_WEIGHTS` from `lib/engine/weights.ts`.
7. **No "risk" / "fraud" wording** in any user-facing copy (already enforced repo-wide). Use "evidence" / "evidence level".
8. **Network-level data is service-role only + k-anonymity-gated** (`K_ANONYMITY_MIN = 3`, in `lib/engine/weights.ts`). Computing a score may read everything; *disclosing* it to a merchant must pass the same gate `lookup_network_identity` uses.
9. **Commit discipline:** one focused commit per iteration on the feature branch, message `feat(evidence): <goal>` ending with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer. **Never push without being asked.** Never commit `scripts/.salt-rotation-backup-*.json` (pre-existing, unrelated, untracked).

---

## 3. Verified reality map (real names — the original spec's drafts were wrong)

Live schema is **v2** (`supabase/rebuild/001_new_schema.sql`, cutover 2026-06-11).

| Thing | Reality | Reference |
|---|---|---|
| Resolved identity table | **`identities`** (PK `id`; `confidence_grade` enum, `merchant_count`, `superseded_by`) | `001_new_schema.sql:533` |
| Claims | **`claims`** with a **direct, nullable** `identity_id` FK ("set by resolver"); filing time = `submitted_at`; `claim_type` is the DB enum | `001_new_schema.sql:594` |
| `claim_type` enum | `item_not_received, damaged, wrong_item, not_as_described, refund_request, chargeback, return_abuse, other` | `001_new_schema.sql:72` |
| Behavioural rollup | **`identity_profiles`** (`total_claims`, `merchant_count`, `claim_type_counts` jsonb, `last_seen_at`, …), maintained by `refreshIdentityProfile()` in `lib/identity/resolver.ts` | `001_new_schema.sql:696` |
| Watchlist | **`merchant_identity_state.on_watchlist`** (per-merchant bool). **No `network_flags` table.** There is currently **no write path that sets `on_watchlist = true`** (see §6). | `001_new_schema.sql:714` |
| Service-role client | **`createServiceClient()` from `@/lib/supabase/server`** (returns `any`). Network tables are service-role only. | — |
| Rules engine | `IdentitySignals` + `FIELD_LABELS` in **`lib/rules-engine.ts`**; generic `evaluateRules()`. Field catalogue **`lib/rules/fields.ts`** (`RULE_FIELDS`, `RuleFieldCategory`, `CATEGORY_LABELS`); `CATEGORY_ORDER` is in `components/rules/ConditionBlock.tsx`. Zod **`evaluateSchema` in `lib/rules/store.ts`**. | — |
| Rules evaluate route | `app/api/rules/evaluate/route.ts` — merchant via **widget token** (`x-widget-token`), signals from the **request body** (so the score is injected upstream, not here). | — |
| Gorgias widget | route `app/api/gorgias/widget/route.ts`; data build `lib/gorgias/widgetData.ts` + `lib/gorgias/widgetDataV2.ts` (`buildGorgiasClaimWidgetDataV2`, type `ClaimWidgetData`); signal map `lib/rules/widgetSignals.ts` (`widgetDataToSignals`); sidebar template `lib/support/gorgias/registerSidebarWidget.ts` (payload type `GorgiasWidgetJsonPayload`). **Sidebar renders native JSON primitives only (text/card) — NO React, no colour, no expand/collapse.** | — |
| Widget signal stubs | In `widgetDataToSignals`, `claim_types: []` and `is_network_flagged: false` are **hardcoded stubs** to be wired from source in Iteration 7. | `lib/rules/widgetSignals.ts` |
| Cron pattern | Routes in `app/api/cron/*` use `export const maxDuration = 60`, `POST`, auth `Authorization: Bearer ${env.CRON_SECRET}` → 401 `'Unauthorised'`, `createServiceClient()`. `vercel.json` holds the schedules. | `app/api/cron/mark-stale-claims/route.ts` |
| Migrations | Raw SQL, `YYYYMMDDHHmmss_description.sql`. Apply via `supabase db push` (dry-run with `--dry-run --linked`). Network tables: enable RLS, `revoke all from anon, authenticated`, a `service_role` policy, **and an explicit `grant all … to service_role`** (the lesson from `20260617120000_grant_rules_tables.sql`). | — |
| Generated DB types | `lib/supabase/types.ts` exports a **runtime** `Constants.public.Enums.claim_type` array — use it in regression tests. | — |
| Confidence-grade UI styling | reuse `GRADE_COLOURS` / `GRADE_LABELS` from `lib/utils/confidenceStyles.ts`. | — |

---

## 4. Resolved decisions

- **Claim-type taxonomy (settled):** the DB `claim_type` enum is the single canonical stored/evaluated vocabulary everywhere. Friendly labels are display-only. Legacy shorthand (`INR`, `refund`) is **never** stored or used as a condition value. Canonical values + labels live in **`lib/claims/claimTypes.ts`** (`CANONICAL_CLAIM_TYPES`, `CLAIM_TYPE_LABELS`, `toCanonicalClaimType`). The evidence severity map keys on these (compile-time exhaustive via `Record<ClaimTypeValue, number>`).
- **Display surfaces:** the score is shown on **two** surfaces — Gorgias sidebar as **plain text fields** (Iteration 8) and an **in-app React `EvidenceScoreBadge`** on the dashboard identity detail page (Iteration 9). A styled/collapsible React badge is impossible in the Gorgias sidebar.
- **Signals wired from source:** the recompute reads claim-type severity from real data and treats "any merchant has `on_watchlist = true`" as the network flag (computed server-side with service-role access; the widget stubs are separate and handled in Iteration 7).
- **Support-intake vocabulary is out of scope:** `lib/support/intake/classifyClaim.ts` emits its own `INR`-style vocabulary, but the createClaim Zod schema (`lib/claims/store.ts:4`) rejects `INR`, so `claims.claim_type` is always clean DB-enum values. Aligning that layer is a separate hygiene ticket.

---

## 5. Work completed (commits on `feat/evidence-scoring-engine`)

All verified green (typecheck + build + `verify:rules` + the relevant unit suite) before each commit.

| Iter | Commit | Summary | Key files |
|---|---|---|---|
| 0.5 | `4db5a54` | Standardise claim-type taxonomy on the DB enum; migrate `merchant_rules.conditions` (`INR→item_not_received`, `refund→refund_request`, idempotent); regression test vs generated enum | `lib/claims/claimTypes.ts`, `lib/rules/fields.ts`, `supabase/migrations/20260617150000_remap_rule_claim_types.sql`, `tests/unit/claimTypeTaxonomy.test.ts` |
| 1 | `3979ddf` | `identity_evidence_scores` table (service-role-only RLS + grant, no `merchant_id`) + `TABLES.IDENTITY_EVIDENCE_SCORES` | `supabase/migrations/20260617160000_identity_evidence_scores.sql`, `lib/supabase/tables.ts` |
| 2 | `24d5c28` | Pure `computeEvidenceScore()` + versioned config; `verify:evidence` | `lib/engine/evidence/config.ts`, `lib/engine/evidence/score.ts`, `tests/unit/evidenceScore.test.ts` |
| 3 | `6c30072` | Recompute orchestration: `getIdentityEvidenceSignals`, `recomputeIdentityEvidenceScore`, batch helper; `TABLES.IDENTITY_PROFILES`; `verify:evidence:recompute` | `lib/engine/evidence/recompute.ts`, `tests/unit/evidenceRecompute.test.ts` |
| 4 | `0d3ebb6` | Nightly cron `POST /api/cron/recompute-evidence-scores` (paginated identity scan past the 1000-row cap); `vercel.json` 04:00 | `app/api/cron/recompute-evidence-scores/route.ts`, `tests/api/recomputeEvidenceScoresCron.test.ts` |
| 5 | **uncommitted** (pending approval) | Recompute hook in `refreshIdentityProfile()` — dynamic-import, `try/catch`, strictly non-fatal | `lib/identity/resolver.ts`, `tests/unit/resolverEvidenceHook.test.ts` |

### Scoring model (config in `lib/engine/evidence/config.ts`, `EVIDENCE_SCORING_CONFIG_VERSION = 'v1.0'`)
Five capped factors → 0–100:
- Claims across network (35): 0→0, 1→8, 2→18, 3→27, 4+→35
- Distinct merchants (25): 1→0, 2→12, 3→20, 4+→25
- Recency of last claim (20): ≤7d→20, ≤30→16, ≤90→10, >90→4, null→0
- Severity, max-not-additive (15): chargeback 15, return_abuse 12, refund_request 9, item_not_received 9, not_as_described 6, damaged 4, wrong_item 4, other 2; unknown→0
- Network watchlist flag (5)

Levels: ≤19 `minimal`, ≤44 `some`, ≤69 `substantial`, ≤100 `extensive`.
`has_sufficient_data = network_claim_count > 0 || is_network_flagged`; when false, `evidence_level` is forced to `minimal` (distinct from a genuine low score). Recency is always sourced from `max(claims.submitted_at)` — **never** `identity_profiles.last_seen_at`. Failure policy: on any aggregation/upsert error, **log and leave the prior cached row** (never write a failure-zero); a real 0 (no claims, no flag) is still cached.

### Not yet applied to prod
Both migrations (`…150000_remap_rule_claim_types`, `…160000_identity_evidence_scores`) are **pending** — verified via `supabase db push --dry-run --linked` but **not pushed**. Live `merchant_rules` had **0 rows**, so the remap is a confirmed no-op today.

---

## 6. Remaining work (Iterations 6–11)

Sequential; each ends in a green verification gate; one commit per iteration; report before committing.

- **6 — Rules-engine wiring** (depends on 1). Additively extend `IdentitySignals` + `FIELD_LABELS` (`lib/rules-engine.ts`) with `evidence_score: number`, `evidence_level: 'minimal'|'some'|'substantial'|'extensive'`, `has_sufficient_data: boolean`. Extend the Zod `evaluateSchema.signals` (`lib/rules/store.ts`) with the three fields (**don't forget this** — the route strips/rejects otherwise). Add an `'evidence'` category in `lib/rules/fields.ts` (`RuleFieldCategory`, `CATEGORY_LABELS.evidence = 'Evidence'`, three `RULE_FIELDS`: `evidence_score` integer/numeric ops, `evidence_level` enum ops, `has_sufficient_data` boolean `eq` only) and prepend `'evidence'` to `CATEGORY_ORDER` in `components/rules/ConditionBlock.tsx`. `evaluateRules()`/`validateConditions()` are generic — no logic change.
- **7 — Widget data build + un-stub signals** (depends on 6 + the recompute). In `lib/gorgias/widgetData.ts` build path, fetch the cached `identity_evidence_scores` row via the service client and attach it to `ClaimWidgetData`, **applying the k-anon gate** (`identities.merchant_count >= K_ANONYMITY_MIN` OR querying merchant has own signals). In `widgetDataToSignals`: map the three evidence fields; **replace** `claim_types: []` and `is_network_flagged: false` with real values. Distinguish "not enough evidence" from "not disclosable (k-anon)".
- **8 — Gorgias sidebar text fields** (depends on 7). Add plain-string fields to `GorgiasWidgetJsonPayload` + `type: 'text'` rows in `lib/support/gorgias/registerSidebarWidget.ts` (e.g. `evidence_summary` "Evidence: 62 · Substantial" / "Not enough evidence yet" / "Not enough network coverage to share"; `evidence_breakdown` flattened). Keep "Identity confidence" in its own field. No "risk"/"fraud".
- **9 — In-app React `EvidenceScoreBadge`** (depends on 1 + 2). New `components/identity/EvidenceScoreBadge.tsx` on the dashboard single-identity detail page (under `app/(app)/customers/[id]/`). Collapsed (score + level colour-coded grey→amber→orange→red, confidence grade as a separate pill via `confidenceStyles`), expanded (breakdown factors), `has_sufficient_data === false` → "Not enough evidence yet", `weak` grade → caveat line. Fetch server-side / via a service-role server action (table is service-role only).
- **10 — New default templates** (depends on 1 + 6). New migration, `sort_order` 4–6: *Standard Review Threshold* (`evidence_score >= 45` → manual_review), *High Confidence Deny* (`evidence_score >= 75` AND `confidence_grade in [definite,probable]` → deny), *Clean Identity Fast-Track* (`evidence_score <= 19` AND `has_sufficient_data = true` → approve). Do **not** edit the existing templates migration.
- **11 — Global end-to-end verification.** Full typecheck/lint/tests + a seeded multi-merchant identity through recompute → cached row → `/api/rules/evaluate` with the new fields → Gorgias rows (above/below k-anon) → in-app badge → cron 401 check.

### Open item — watchlist trigger (decision needed)
The plan called for recompute-on-watchlist-flip, but **no `on_watchlist = true` write path exists** in the codebase, so there is nothing to hook and `is_network_flagged` is always false today. `recomputeIdentityEvidenceScore(identityId)` is the ready-made hook for whenever a watchlist-toggle feature is built. **Recommendation:** defer until that feature exists (do not fabricate a toggle endpoint).

---

## 7. How to work (loop + verification)

**Per iteration:** orient (read the real files) → implement the smallest change → verify (below) → if green, commit; if red, fix (max 3 attempts on the same failure, then stop and report). Do not batch iterations.

**Verification commands** (discover/confirm in `package.json`):
```bash
npm run typecheck                  # tsc --noEmit
npm run build                      # next build
npm run verify:rules               # rules engine: 101 checks + unit suite
npm run verify:evidence            # tests/unit/evidenceScore.test.ts
npm run verify:evidence:recompute  # tests/unit/evidenceRecompute.test.ts
npx jest <path> --runInBand        # targeted suites
supabase db push --dry-run --linked   # validate a new migration WITHOUT applying
```

**Known gotchas:**
- `tests/identity/pagination.test.ts › duplicate upload warning…` fails **pre-existing** (upload-dedup guard, unrelated to this feature; the broader v2 test suite is known-not-ready). Don't chase it.
- Running `npm run test:identity` can regenerate `tests/fixtures/generated/large_merchant_scale_PERFORMANCE.json` — a test artifact; revert it, never commit it.
- `scripts/.salt-rotation-backup-*.json` is pre-existing untracked noise — never stage it.
- The service client (`createServiceClient()`) is typed `any`; recompute/orchestration accept an injected client + `nowMs` for deterministic, prod-data-free tests (see `tests/unit/evidenceRecompute.test.ts` for the chainable Supabase fake pattern).
