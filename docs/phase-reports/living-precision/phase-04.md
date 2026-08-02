# Phase 04 — Registries, tables, statuses, filters, and route states

Status: closed. Scope per §12.4/§12.5 of `docs/IMPL_living_precision_product_ui.md`
(LP2, LP-CMP-04, LP-CMP-09–11, LP-MOT-07–08).

## 1. Scope and baseline

Predecessor Phase 03 is closed (`phase-03.md`, ledger §12.10). Phase 02 landed
LP-MOT-07 (`ResourceSnapshot`) and LP-MOT-08 (transport/activity/freshness/live
grammar) as **provisional pre-work**; §12.10 assigns verifying and formally
closing them to Phases 04/05 at their first real consumer. Phase 04 owns that
plus the registry/table/status/filter/route-state consolidation IDs above.

Owned surfaces before editing:

- new canonical primitive: `components/ui/RegistrySurface.tsx`;
- refined existing owner: `components/ui/DataTable.tsx` (new `flush` mode);
- shared CSS: `styles/authenticated/tables.css`;
- barrel: `components/ui/index.ts`;
- proof surfaces: `/dev/design-system` (R08 primitive gallery — the
  representative registry fixture) plus the existing real consumers already
  exercising the pre-work (`useFetchJson` across ~20 call sites; `/losses`
  `FreshnessIndicator`).

Complexity budget (≤2 new reusable modules, ≤12 production files) respected:
**1 new module** (`RegistrySurface`) and **4 production files** (`RegistrySurface`,
`DataTable`, `tables.css`, `ui/index.ts`). The dev-only gallery harness, two
focused test files, and the doc do not count per §12.2. **No production
registry was redesigned and no fetch call site was migrated** — the regression
lock forbids it; production-registry migration is owned by the route phases
(07–26).

## 2. Delivered

**LP-CMP-04 — one registry surface** (`components/ui/RegistrySurface.tsx`)

§8.3 rule 1 ("toolbar, result count, table, bulk action, and pagination belong
to one surface") had no owning primitive: registries stacked a bordered filter
panel, a loose result-count row, a bordered `DataTable`, and a loose pagination
row — several bordered cards inside one working panel, which §8.2 forbids.
`RegistrySurface` is a single §8.2 `working` `Surface` that owns the frame and
splits its interior with dividers: a toolbar row (`toolbar`/`bulkActions` lead +
`resultCount`), the table body, and a `pagination` footer. `bulkActions`
replaces the toolbar lead when a selection is active so there is one contextual
bar, not two. The result count is a polite `role="status"` live region.

**LP-CMP-11 — table density/alignment + `DataTable flush`** (`components/ui/DataTable.tsx`)

`DataTable` already right-aligned numeric columns (`align:'right'`), kept quiet
neutral sentence-case headers, carried the keyboard-reachable
opacity/`:focus-within` `RowActionsMenu` (never `display:none`), and offered
`compact|default|relaxed` density; the whole table inherits `tabular-nums`. The
one gap for §8.3 "one surface" was that `.ua-data-table` drew its own
border/radius/background, so embedding it produced a bordered card inside the
registry's bordered card. The new `flush` prop drops that frame (the surface
owns it) while keeping bounded horizontal overflow inside the body. Default
behaviour is unchanged, so the two existing `DataTable` consumers
(`CustomersTableClient`, `TeamMembersTable`) are untouched.

**LP-CMP-10 — status / filter / metadata anatomy stays distinct; selection is never semantic**

The anatomy primitives are already separate owners — `StatusBadge`
(five semantic tones, accent explicitly excluded), `FilterChip` (accent
selection language via `filterChipContract`: accent-100 fill / accent-200
border / accent-800 text), `MetadataChip` (quiet neutral, no action/status
role). Phase 04 adds the missing proof: a focused test asserts a selected
`FilterChip` carries the accent selection tokens and **no** semantic tone or
status-badge class, and that a selected `DataTable` row uses the
`--selected` accent marker, never a status colour. A "Selection vs. status"
gallery row shows the two idioms side by side.

**LP-CMP-09 — loading/empty/error consolidation (primitive level)**

The geometry-aware state primitives already exist and are canonical:
`OperationalState` (`zero | empty | filtered-empty | partial | stale |
disconnected | unavailable | permission | locked | error`, alert vs. status
role by kind), `OperationalRouteSkeleton` (registry vs. detail geometry), and
`OperationalRouteError` (critical treatment, no data changed). The gallery
covers every `OperationalState` kind and shows one inside a `RegistrySurface`
as a **filtered-empty** body that preserves the toolbar + pagination and offers
"Clear filters" (§6.6). Per-route "geometry matches every page family" is proven
per route in Phases 07–26, not swept here.

**LP-MOT-07 — stale-while-refresh, verified and closed**

`lib/react/useFetchJson.ts` implements the §7.5 `ResourceSnapshot` discriminated
union: `reload()` refreshes in place (status → `refreshing`, data preserved,
never blanks), a refresh failure retains stale data with `hasStaleData`, initial
vs. refresh are distinct, `dataAsOf` comes from the domain payload (never
fetch-completion time), and response ordering is guarded by a generation counter
+ single-in-flight-per-key. `tests/lib/useFetchJson.test.ts` covers initial
load, populated refresh, refresh failure, retry, and old/new ordering (5 tests).
A live gallery demo drives the real `useAsyncResource` hook — Refresh keeps the
table populated, flips to `refreshing`, and advances `dataAsOf` only when the
new result lands.

**LP-MOT-08 — transport/activity/freshness/live grammar, verified and closed**

`lib/design/liveness.ts` keeps the four §7.4 axes independent
(`TransportState`/`ActivityState`/`FreshnessState`/`LiveHeartbeat`); `isLive`
requires a domain `heartbeatExpiresAt` and never invents a heartbeat, and the
recency copy follows the just-now/minute/hour/day grammar. `LivenessIndicator`
+ `Recency` compose the axes (spinner only for updating/syncing; the breathing
Live dot only after mount when genuinely live; snapshot data reads "As of …").
The freshness axis already has a real route consumer at `/losses`
(`FreshnessIndicator`, whose universal 24h threshold was made caller-supplied in
the pre-work). New `tests/lib/liveness.test.ts` proves the pure axes (8 tests);
the gallery shows every axis. `LivenessIndicator`'s own route wiring lands with
the route that first needs verified live/updating state (route phases).

## 3. Verification

| Command | Result |
|---|---|
| `npm run lint:authenticated-design` | Pass — 448 files; ratchet unchanged (arbitraryDesignValue 0/0, upperCaseEyebrow 0/0, handRolledTable 9/10 — no new `<table>`; `RegistrySurface` wraps `DataTable`, it does not hand-roll a grid) |
| `npx tsc --noEmit` | Pass (exit 0), covering all edits incl. the gallery |
| `npx jest registrySurface liveness useFetchJson` | Pass — 3 suites, **21 tests** |
| Diff-scope review | 1 new module, 4 production files; no route-content rewrite, no fetch-call migration, no charts, no unrelated files |

**Focused test coverage (Focused pack):**

- `tests/components/registrySurface.test.tsx` (jsdom, real component mount):
  toolbar + result count + flush table + pagination compose inside one labelled
  region; result count is a polite `role="status"`; the flush table drops its
  frame (`.ua-data-table--flush`); the row action stays a focusable `<button>`,
  never `aria-hidden`, and its menu item fires `onSelect` (keyboard/SR);
  the selected row uses the accent marker and **no** semantic status class;
  an active `FilterChip` uses the accent tokens and **no** semantic tone.
- `tests/lib/useFetchJson.test.ts` (LP-MOT-07): initial load, refresh preserves
  data, refresh failure retains stale, retry clears error, no duplicate in-flight.
- `tests/lib/liveness.test.ts` (LP-MOT-08): `isLive` heartbeat rules, recency
  granularity + future-clamp + unknown handling, snapshot "As of …" copy.

**Static/structural proof (Primitive pack):** `RegistrySurface` is a thin
composition over the Phase-03 browser-verified `Surface working`
(10px radius / 1px border / `#fff` / no shadow). `.ua-working-surface` carries
**no** intrinsic padding, so the toolbar (bottom divider), flush table, and
pagination (top divider) render edge-to-edge; `overflow: hidden` clips the
flush table's bounded horizontal scroll to the rounded card. The new CSS
references only existing `--ua-*` tokens already verified light and dark in
Phases 01–03; no new token, theme value, focus value, or motion value was
introduced, so the Primitive pack does not require dark/reduced-motion
recapture ("only when that aspect changed").

## 4. Browser verification blocker (not a Phase 04 regression)

Live gallery capture could **not** be taken this session. `/dev/design-system`
sits behind the authenticated `(app)` layout, and this session's browser is a
fresh, unauthenticated context; the safety rules prohibit entering a password to
authenticate. The running dev server (`localhost:3000`) is owned by another chat
session and its browser holds that session's cookie, not this one's — and, as
recorded in phase-03 §5, a second Next dev server cannot bind the shared `.next`,
so a private authenticated instance cannot be started here. This is the same
environment constraint Phase 03 documented and closed against. The change is a
composition of an already-browser-verified surface plus existing verified
primitives, and it is proven by 21 focused tests (including a real DOM mount of
`RegistrySurface`), typecheck, and design lint. A route phase (07–26) that
migrates a production registry onto `RegistrySurface` will capture it live at
1440×900 and 1024px in its own Route pack.

## 5. Changed files

New: `components/ui/RegistrySurface.tsx`,
`tests/components/registrySurface.test.tsx`, `tests/lib/liveness.test.ts`.

Modified: `components/ui/DataTable.tsx`, `styles/authenticated/tables.css`,
`components/ui/index.ts`,
`app/(app)/dev/design-system/DesignSystemGalleryClient.tsx` (dev harness),
`docs/IMPL_living_precision_product_ui.md` (§12.10 ledger).

## 6. Remaining follow-ups (not introduced by this phase)

- **Production registry migration.** No production registry was moved onto
  `RegistrySurface` (regression lock). Each registry route (Cases 10, Customers
  14, Rules 15, Flows 16, Reports 09, etc.) migrates its own toolbar + result
  count + table + pagination into the surface — and folds its deprecated
  `KeyInsightCallout`/`SummaryRail` composition — in its owning route phase.
- **LP-CMP-09 per-family geometry.** The state primitives are canonical; the
  "geometry matches every page family" claim is verified per route (07–26).
- **`LivenessIndicator` route wiring.** The full transport/activity/freshness/
  live component has no production route consumer yet (freshness alone is live
  at `/losses`); wiring lands with the first route needing verified live state.
