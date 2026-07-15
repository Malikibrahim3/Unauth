# Authenticated final browser validation

Date: 2026-07-14

## Scope and executed evidence

The repository contains 66 authenticated `page.tsx` route files under `app/(app)`. The final evidence spec exercised 26 screenshot states spanning 19 route families and overlay/error states: shell overview, work, payout control, case detail, exceptions, losses, recovery, customers, customer detail, rules, flows, reports, integrations, settings, notifications, setup progress, object detail, customer drawer, command palette, empty state, error state, dark mode, and responsive overview/navigation states.

Evidence is stored in [`screenshots-app-2026-07-14-final-craft`](../../screenshots-app-2026-07-14-final-craft/) with the route/state map in its README.

## Width matrix

| Target | Executed evidence | Result |
|---:|---|---|
| 1440 | Desktop route/state set and dark overview | Passed |
| 1280 | Dashboard overview | Passed |
| 1024 | Dashboard tablet overview | Passed |
| 768 | No final screenshot capture | Not verified; documented limitation |
| 390 | Dashboard overview and navigation open | Passed |

The Playwright configuration also contains desktop/tablet/mobile projects used by the broader redesign suite. This final evidence spec intentionally captures a curated route set; it does not substitute for a manual walkthrough of every route at every width.

## Interaction and accessibility checks

The evidence set exercises the customer drawer, command palette, mobile navigation, first case detail, first object detail, dark-mode control, and empty/error states. Existing critical/compliance suites cover keyboard-visible controls, route transitions, content terminology, and responsive overflow assertions. The final pass also fixed the server/client boundary exposed when the new server-rendered table primitive was first exercised.

## Browser runtime limitation

The in-app browser skill was used as the requested browser-led route, but its runtime failed during initialization with `Cannot redefine property: process`. Playwright, the repository’s existing browser harness, was used as the fallback and completed the final evidence spec successfully. This limitation prevents claiming manual in-app browser inspection of all 66 routes.

## Migration inventory cross-reference

See `authenticated-final-migration-register.md` for exact before/after counts: 109 to 0 authenticated `PanelCard` call sites, 15 to 10 raw table openings including canonical table primitives, and a held 235 native-control baseline. Loading, chart, copy, and remaining specialized table exceptions are listed there.
