# Phase 01 — Authority, audit, and regression harness

Status: closed. Scope per §12.5 of `docs/IMPL_living_precision_product_ui.md`:
active repository UI rules, §12.10 as-built truth, route inventory and
representative visual baselines, and the authenticated-design guardrails and
design-system gallery. No product route redesign and no product-behaviour
change were made, per the phase's regression lock.

## 1. Authority alignment (verified, not reimplemented)

`CLAUDE.md`, `.codex/rules/authenticated-product.md`,
`.cursor/rules/authenticated-design-system.mdc`, and
`styles/authenticated/README.md` were already rewritten (uncommitted, prior to
this phase) to defer all authenticated visual and numbered-phase authority to
`docs/IMPL_living_precision_product_ui.md`. This phase verified rather than
redid that work:

- `git grep -n "Quiet Precision"` across the four rule/loader files returns
  only "replaces the earlier Quiet Precision rule" / "superseded" framing —
  no active rule cites Quiet Precision as an implementation authority.
- `grep` across `app`, `components`, `lib`, `styles`, `scripts` for
  `quiet-precision`/`quietPrecision` tokens returns no matches — no active
  code depends on the superseded token namespace.
- `docs/IMPL_quiet_precision_product_ui.md` and
  `docs/IMPL_product_polish_and_screenshot_readiness.md` are already marked
  historical/evidence-only in their own text (uncommitted diff).

Gate: **no active rule points to Quiet Precision as the implementation
authority.** Met.

## 2. Route-to-phase mapping completeness (§12.4 gate)

Programmatically parsed the §12.4 phase-map table: every ID `R01`–`R64`
resolves to exactly one phase row, with zero duplicates and zero gaps
(64/64 covered, 0 duplicates).

Gate: **each R01–R64 route is mapped to exactly one owning numbered phase in
§12.4.** Met.

## 3. Guardrail and regression-harness commands

Run from repository root, in the order given by the mandatory phase execution
contract (§12.2) and `docs/TESTING.md`:

| Command | Result |
|---|---|
| `npm run lint:authenticated-design` | **Pass** — "440 files checked; ratchet: arbitraryDesignValue 0/0, upperCaseEyebrow 0/0, handRolledTable 9/10." |
| `npm run typecheck` | **Pass**, after removing a stale `.next/` build cache (see §4). Failed before that with a corrupted generated `.next/dev/types/routes.d.ts` — a gitignored build artifact from an interrupted `next dev`, not a source defect. |
| `npm run verify:ui-parity` | **Fails** on a pre-existing false positive in the checker itself (see §4) — not a real navigation regression. |
| `npx jest --runInBand` | 339 of 349 suites pass, 2661 of 2677 tests pass. 9 pre-existing failing suites, all non-visual (see §4). |

## 4. Known blockers recorded separately from visual defects

Per the phase deliverable to record runtime/schema blockers separately from
visual work, none of the following were fixed in this phase — they are out of
Phase 01's edit scope (rules, §12.10, route inventory, guardrails, gallery)
and are not visual defects:

- **`verify:ui-parity` false positive.** `scripts/check-authenticated-functional-parity.mjs`
  reports a phantom missing destination (`"/\n *"`, a literal embedded
  newline). Root cause is two independent bugs in the script: its
  `normaliseSignature` replaces the two literal characters `\`+`n`
  (`/\\n/g`) instead of an actual newline, and its baseline source is built
  from `git grep -h` (which drops non-matching blank lines) while its current
  source is built from whole-file reads (which keep them) — the resulting
  line-adjacency mismatch produces a cross-line regex match that doesn't
  correspond to any real `href`. Confirmed unrelated to this session: the
  only files touched by the outstanding diff in `components/` are comment-only
  renames (`ComboBarLineChart.tsx`, `dashboardPilot.module.css`,
  `pageShellStyles.ts`), none of which touch navigation strings.
- **9 pre-existing failing Jest suites**, all non-visual: `tests/polish/phase01/verifyPolishRunner.test.ts`,
  `tests/components/caseFinancialHistoryCard.test.tsx`,
  `tests/api/routeSecurity.test.ts`, `tests/lib/gorgiasWidgetJson.test.ts`,
  `tests/unit/claimDecision.test.ts`, `tests/lib/claimsQueueCounts.test.ts`,
  `tests/lib/customerSemanticsDeprecation.test.ts`,
  `tests/lib/demoSeedCanonicalContract.test.ts`,
  `tests/utils/formatCurrency.test.ts`. These cover claim-decision copy,
  currency-locale formatting, customer semantics, demo-seed ordering, and
  route security — logic/content, not Living Precision visual work.
- **`/claims` and `/claims/[id]` console errors** (real, backend): `Claims
  investigation summary query failed` (server-side) and `[data-quality]
  label.enum_unmapped subject=recoveryStatus.open` — a persisted enum value
  with no merchant-facing label in `lib/ui/labels.ts`. The case detail page
  still resolves past its `Loading case evidence…` state and is usable; this
  is a data-quality/label-mapping gap, not a rendering hang.
- **`.next/` build-cache corruption.** A stale `.next/dev/types/routes.d.ts`
  from an earlier interrupted `next dev` process broke `tsc --noEmit` with
  syntax errors in a generated (gitignored) file. Removing `.next/` and
  rerunning fixed it. Not a source defect; noted here so a future phase does
  not misdiagnose a real typecheck regression.
- **LP-TRU-01** (`/api/work/views` 500, blocked on an undecided migration
  strategy) and the landing-imitation / capture-infrastructure gaps in
  §12.10 remain open exactly as already recorded; this phase did not touch
  them.

## 5. Representative visual baseline (Foundation pack)

Authenticated via the seeded demo merchant (Elara & Co Apparel) at
`localhost:3000`, light and dark, 1280×720:

| Route | Result |
|---|---|
| `/dev/design-system` (R08) | Renders the canonical gallery (surfaces, §3.2 accent scale 50–800, etc.); confirmed dev-only via `page.tsx`'s `NODE_ENV !== 'development'` → `notFound()` guard (code-level production-404 proof; a full `next build && next start` request-level proof was not run in this phase). No console errors. |
| `/dashboard` (Overview, R07) | Renders cleanly, light and dark. No console errors. |
| `/work` (R21) | Renders cleanly: metrics, due-band visual, saved views, table. No console errors. |
| `/claims` (Cases registry, R02) | Renders cleanly: KPIs, filters, master-detail preview. Two console errors — see §4 (data-quality/backend, not visual). |
| `/claims/[id]` (Case detail, R01) | Resolves past a transient "Loading case evidence…" state to a working decision workspace; same two console errors as above. |
| `/settings/account` (R37) | Renders cleanly; located and exercised the Light/Dark `Color theme` toggle — confirmed dark mode repaints the shell, sidebar, tables, and form surfaces correctly and is restored to Light afterward. |

No uncaught error, hanging loader, or broken internal destination was found
in this representative set. The full Route-pack sweep across all 64 routes
belongs to Phases 07–26, not Phase 01.

## 6. Changed files

Only documentation/rule files were edited in this phase:

- `docs/IMPL_living_precision_product_ui.md` (§12.10 updated — see diff)
- `docs/phase-reports/living-precision/phase-01.md` (this file, new)

No application code, styles, or tests were modified. The pre-existing
uncommitted rewrite of `CLAUDE.md`, the two rule loaders,
`styles/authenticated/README.md`, and the comment-only renames in
`app/global-error.tsx`, `components/charts/authenticated/cartesian/ComboBarLineChart.tsx`,
`components/dashboard/dashboardPilot.module.css`, and
`components/ui/pageShellStyles.ts` predate this phase and were verified, not
authored, here.

## 7. Regression evidence

- `npm run lint:authenticated-design` — pass (baseline, above).
- `npm run typecheck` — pass (baseline, above, after cache clear).
- No route composition, chart design, or domain behaviour was changed.

## 8. Open issues / follow-ups for later phases

- Fix `scripts/check-authenticated-functional-parity.mjs`'s two bugs (regex
  typo, baseline/current source-construction asymmetry) whenever a phase
  next touches shared verification tooling — Phase 01 recorded it rather than
  fixing it, since it is outside this phase's rules/audit/gallery scope.
- Map `recoveryStatus.open` (and any sibling unmapped enum values) in
  `lib/ui/labels.ts` — owned by the phase that next touches Cases/Case-detail
  labels (Phase 10/11), not Phase 01.
- A full `next build && next start` request-level 404 proof for
  `/dev/design-system` and `/integrations/dev-preview` (R08/R28) is still
  owed to the Release pack (Phase 28); this phase relied on the code-level
  guard instead.
