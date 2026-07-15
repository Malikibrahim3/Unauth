# Authenticated responsive validation

Date: 2026-07-14

## Required width matrix

| Width | Evidence/state | Status |
|---:|---|---|
| 1440 | Full curated authenticated route/state evidence; dark overview | Verified |
| 1280 | Dashboard overview | Verified |
| 1024 | Dashboard tablet overview | Verified |
| 768 | No final screenshot or full route walk | Not verified |
| 390 | Dashboard overview and mobile navigation open | Verified |

## What was checked

The responsive pass checks the authenticated shell, stacked metrics, action wrapping, table-local overflow, drawer/modal containment, mobile navigation, chart minimum heights, and document-width containment. The evidence README maps the 26 captures to their route/state and viewport.

The intended behavior is page-level width containment with local horizontal scrolling only for genuinely wide operational tables. Tables do not widen the document; cards and chart regions use the authenticated min-width rules and collapse into one-column layouts at narrow widths.

## Limitations

This is not a claim of every route at every width. In particular, 768px is still unverified, and the browser plugin could not initialize; the final captures were produced by the repository Playwright harness. The full 66-route inventory and remaining legacy loading/native-control systems are tracked in `authenticated-final-migration-register.md`.
