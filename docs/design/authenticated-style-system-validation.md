# Authenticated style-system validation

Date: 2026-07-14 · Branch: `ui-craft-overhaul`

> Craft-pass addendum: Sections below document the earlier token-consolidation baseline. The current component and route result is recorded in `authenticated-component-consistency-validation.md`, `authenticated-chip-badge-audit.md`, `authenticated-chart-audit.md`, and `authenticated-component-defect-register.md`. Where this historical baseline says a primitive was deferred, treat the addendum and defect register as authoritative.

## Craft-pass changes

- Replaced cobalt action/selection aliases with ink and warm-neutral selected surfaces.
- Made the four-radius and shared-height contracts explicit in `tokens.css` and `contracts.ts`.
- Added canonical `IconButton`, `FilterChip`, `SegmentedControl`, `Tabs`, `MetadataChip`, `MetricGroup`, `EvidenceChecklist`, and `RecommendationBlock` primitives.
- Migrated Payout Control filters, sorting, KPI/empty states, queue rows, workflow and recovery presentation.
- Migrated dashboard/reports period controls, notifications filters/metadata, and loss filters to shared primitives.
- Removed duplicated status/recommendation pills from the migrated claims surfaces and added the raw enum render-path test.
- Added chart token names and disabled animation/smoothing in shared analytics charts.

## 1. Files created

- `styles/authenticated/{index.css,tokens.css,typography.css,foundations.css,controls.css,status.css,surfaces.css,tables.css,overlays.css,states.css,responsive.css,README.md,contracts.ts}`
- `docs/design/authenticated-style-system-audit.md`
- `docs/design/authenticated-component-migration-register.md`
- `docs/design/authenticated-style-system-validation.md` (this file)
- `app/(app)/dev/design-system/{page.tsx,DesignSystemGalleryClient.tsx}`
- `.cursor/rules/authenticated-design-system.mdc`

## 2. Existing style sources inspected

`app/(app)/authenticated.css` (454 lines, relocated in full), `app/globals.css` (4,743 lines — read the token-layering sections, not modified), `tailwind.config.ts`, `components/ui/tokens.ts`, `components/ui/pageShellStyles.ts`, `scripts/check-authenticated-design.mjs`, `docs/design/authenticated-component-system.md`, `docs/design/old-theme-eradication-report.md`, `docs/internal/design/TOKENS.md` (found stale), `eslint.config.js`, the 14 migrated `components/ui/*` source files, `app/(app)/layout.tsx` and the other two `authenticated.css` import sites.

## 3. Token sources consolidated

Three competing authenticated token sources were found (see the audit for full detail):
- `app/(app)/authenticated.css` — the actual rendered source, fully relocated into `styles/authenticated/{tokens,status,typography,foundations,controls,surfaces,tables}.css`, zero values changed.
- `app/globals.css`'s "AUTHENTICATED APP UI REBUILD" `:root` block — investigated as a deletion candidate, but found to still be live for `ToastProvider`'s notification container and `RouteProgressBar` (both render as DOM siblings of `.ua-app`, not descendants). **Not deleted** — deleting it would have visibly changed toast colours. Documented as a found defect and spun off as a separate follow-up task rather than fixed in this pass.
- `components/ui/tokens.ts` `uiTokens.app.*` (consumed via `LandingPrimitives.tsx`'s `PanelCard`) — confirmed to be load-bearing in the authenticated app despite being documented "landing-only." Left untouched; fully documented in the migration register as the largest single duplication (39 call sites).

A new `--ua-*` alias layer was added in `tokens.css`/`status.css`/`typography.css`, forwarding to the existing values (verified exact-name equivalence, not coincidental value-matches) so nothing changed visually.

## 4. Shared primitives migrated

14 `components/ui/*` files (`Button`/`buttonStyles`, `Input`, `Select`, `Card`, `SectionCard`, `ModuleCard`, `MetricCard`, `DataTable`/`dataTableStyles`, `Modal`, `Drawer`, `Toast`, `EmptyState`, `StatusBadge`, partially `Badge`) had their internal token references swapped to the new `--ua-*` names. Scope was deliberately narrow: radius, shadow, control dimensions, z-index, and the brand/accent colour, plus `StatusBadge`'s four tones that were verified to have exact light+dark equivalence. `var(--space-N)` references (N≥7) and `Badge.tsx`/`badgeStyles.ts`'s idiosyncratic tone map were explicitly left alone — see the migration register's "what was NOT swapped, and why" section for the exact reasoning (a same-numeral spacing swap would have silently changed real pixel values above 24px).

## 5. Deprecated primitives identified

`PanelCard`'s `app`/`appMuted`/`appInset` variants (vs. `Card.tsx`), `claimReviewStyles.ts`'s `btnStyle()`/`STATUS_COLOUR_MAP` (vs. `Button.tsx`/`StatusBadge.tsx`), and the two duplicate claims-specific `StatusPill`/`SlaBadge` wrapper pairs. None were touched — all are either high-call-count (PanelCard, 39 sites) or inside `components/claims/**`, which has uncommitted in-flight work from a parallel effort on this branch.

## 6. Remaining unmigrated call sites

Full detail in the migration register: 9 hand-rolled `<table>` implementations bypassing `DataTable`, 3 unrelated skeleton/loading systems, no canonical `IconButton`/`FilterChip`/`Tabs`/`Textarea`/`Combobox` (contracts drafted for the latter two in `contracts.ts`, components not built), `Badge.tsx`'s tone map, and everything inside `components/claims/**`.

## 7. Hardcoded values removed

None removed from existing code (out of scope — this pass didn't touch production values, only relocated/aliased them). The lint's new hardcoded-colour and arbitrary-radius rules found genuine pre-existing violations while being built; rather than silently ignore them, they're explicitly grandfathered by exact file path in `scripts/check-authenticated-design.mjs` (10 files for hardcoded colour, 6 for arbitrary radius — see the script's comments), logged here as remaining cleanup:
- Hardcoded colour: `app/(app)/help/integrations/{siena,yuma}/page.tsx`, `app/(app)/recoveries/[id]/page.tsx`, `components/collaboration/CaseComments.tsx`, `components/connections/ConnectionPromptStrip.tsx`, `components/losses/LossLedger.tsx`, `components/rules/{RuleBuilderDrawer,ConditionBlock}.tsx`, `components/sources/{FreshnessIndicator,SourceBadge}.tsx`.
- Arbitrary radius: `app/(app)/customers/CustomersOverviewFilterChip.tsx`, `app/(app)/partners/PartnerRulebookClient.tsx`, `app/(app)/claims/ClaimsPageView.tsx`, `components/apply/FoundingMerchantApplicationForm.tsx`, `components/claims/ClaimReviewHeader.tsx`, `components/nav/SidebarNavItem.tsx`.

New code introducing any of these is **not** grandfathered — the lint will fail on it.

## 8. Documented exceptions

`50%` is allowed as a `borderRadius` value (circles — avatars, dots — not a design-token radius). `boxShadow: 'none'` is allowed (a legitimate "no shadow," not a hardcoded shadow). `styles/authenticated/{tokens,status,foundations,controls}.css` are excluded from the hardcoded-colour scan (they're the token definitions). Data-visualisation and third-party brand-mark exceptions are documented in the README but no such literal was newly introduced in this pass to test against.

## 9. Lint checks added

`scripts/check-authenticated-design.mjs` extended (not replaced) with: hardcoded hex/rgb/rgba/hsl/hsla + inline colour styles, arbitrary Tailwind `rounded-[...]` and inline `borderRadius` (excluding `var()` and `50%`), arbitrary inline `boxShadow` (excluding `var()` and `none`), and a `deprecatedImports` mechanism (currently empty — nothing is cleanly deprecated enough to retroactively enforce without breaking the in-flight claims work; the mechanism and its usage syntax are documented inline for future entries). `styles/authenticated` added to `scanRoots`. All three new mechanisms were deliberately trip-tested (a hardcoded hex, an arbitrary radius, and a temporary `deprecatedImports` entry pointing at `claimReviewStyles.ts`'s `btnStyle`) and confirmed to fail the guard with correct file:line:message, then reverted and confirmed to pass again.

## 10. Component-gallery route

`app/(app)/dev/design-system` — gated by `process.env.NODE_ENV !== 'development'` → `notFound()`. Verified by direct render: loaded correctly in the dev server (tab title confirmed, no console errors), showing live token swatches (values read from actual CSS custom properties, not hardcoded), the full type scale, radius scale, all Button variants, Input/Select, the draft filter-chip/segmented-control contracts, StatusBadge tones, all Card variants, a DataTable sample, EmptyState, and working Modal/Drawer/Toast triggers (Modal confirmed rendering correctly with the migrated radius/shadow tokens). The production-mode 404 gate was verified by code inspection (the standard, well-established Next.js `notFound()`-on-`NODE_ENV` pattern) plus an isolated production build+start that confirmed the route compiles and is subject to the same auth-gate as every other `(app)` route; a live authenticated production request was **not** attempted, as obtaining a session for the isolated production port would have required the same credential-materialization step that the environment's safety classifier correctly declines to permit outside a normal browser login. This is a known, disclosed gap, not a silent skip.

## 11. Landing-page isolation result

Confirmed by direct browser render: `/landing` shows its own distinct rust/warm-neutral palette, completely unaffected by any change in this pass. No file under `app/(public)/**` or the landing-only portions of `app/globals.css`/`components/ui/tokens.ts`/`LandingPrimitives.tsx` was touched.

## 12. Typecheck result

`npm run typecheck` → passed, zero errors (run twice: once immediately after all edits, once after final cleanup).

## 13. Lint result

`npm run lint` (ESLint) → passed, zero warnings/errors.

## 14. Design lint result

`npm run lint:authenticated-design` → passed, 388 files checked (up from 374 before `styles/authenticated` was added to the scan roots).

## 15. Build result

`npm run build` → succeeded, `/dev/design-system` compiled as a route alongside every other authenticated route. **Caveat**: this build ran against the repo's shared `.next/` directory while another session's `next dev` server (a separate, unrelated Claude Code session working on this same repo) was actively running against that same directory. That server was confirmed still alive afterward (still listening on port 3000), but its compiled artifacts may now be stale until it's restarted — flagged here transparently rather than silently. All subsequent verification (typecheck/lint/second build) used an isolated `NEXT_VERIFY_DIST_DIR`/port-3100 setup specifically to avoid repeating this collision; that scaffolding was fully reverted before completion (see `git status` — clean except for this pass's intended files).

`npm test` (Jest) → 266 of 267 suites passed (1 intentionally skipped), 2028 of 2031 tests passed (3 intentionally skipped), 1 snapshot passed. Jest mutated `tests/fixtures/generated/large_merchant_scale_PERFORMANCE.json` as a side effect of running the suite (a pre-existing, documented behaviour, not caused by this pass) — that file is **not** staged.

`npm run test:critical`/`test:redesign`/`test:compliance`/`evidence:redesign` (Playwright) were **not** run in this pass — they require a live browser/server harness beyond what was exercised here, and this pass's changes are alias-relocation, not the kind of redesign work those suites gate. Flagged as not run, not claimed as passing.

## 16. Browser verification result

Verified in the Browser pane against an isolated dev server (port 3100, separate build dir), authenticated as the seeded demo merchant:
- `/dashboard` (Overview) — light and dark
- `/claims` (Payout Control list + detail split view) — confirms zero regression in an area this pass deliberately did not touch
- `/customers` (list, DataTable)
- Customer drawer (opened from the list) and the full `/customers/[id]` profile page
- `/rules`
- `/settings/account`
- `/dev/design-system` (full gallery, all sections, Modal trigger confirmed working)
- `/landing` (public page, isolation confirmed)

Not individually captured in this pass: `/work`, `/losses`, `/recoveries`, `/flows`, `/reports`, `/integrations`, one `/claims/[id]` detail page in isolation (the split view was seen via `/claims`), and mobile/tablet breakpoints. Given the change surface (CSS variable relocation/aliasing + a handful of already-consistent-looking components), the routes captured are the ones most likely to surface a regression (heaviest users of Card/Button/Input/StatusBadge/DataTable/Modal/Drawer/dark-mode), and none showed any. No console errors were observed on any visited route beyond a pre-existing, unrelated `[labels] humanise() fallback` warning.

## 17. Remaining risks

- The shared `.next/` build-directory collision noted in §15 — the other session's dev server may need a manual restart.
- The globals.css "dead" rust/espresso block is not actually fully dead (Toast/RouteProgressBar depend on it); a follow-up task was filed (chip visible to the user) to reparent those two components under `.ua-app` scope, after which that block becomes genuinely deletable.
- 10 pre-existing hardcoded-colour files and 6 pre-existing arbitrary-radius files are grandfathered in the lint, not fixed — real but pre-existing debt, exact paths logged in §7.
- `Badge.tsx`, the 9 hand-rolled tables, the 3 skeleton systems, and everything in `components/claims/**` remain unmigrated by design (see the migration register) — not silently dropped, each has an explicit next step.
- Production-mode authenticated verification of the `/dev/design-system` 404 gate was not runtime-tested (see §10) — verified by code inspection and dev-mode positive-path testing only.

## Status

**Authenticated style system established with documented limitations.**
