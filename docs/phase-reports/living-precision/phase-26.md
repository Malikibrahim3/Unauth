# Phase 26 — Legal and editorial routes

Status: implemented. Scope per §12.4/§12.6 of
`docs/IMPL_living_precision_product_ui.md` (R57–R60).

## Scope and implementation

- `/legal/data-handling`, `/legal/dpa`, `/legal/pilot-terms`, and
  `/legal/privacy` now use one calm public editorial composition. It provides
  a consistent public header, a visible-on-focus skip link, explicit document
  metadata, limited reading measure, linked section contents, related-document
  navigation, responsive reflow, and print treatment.
- Existing legal prose, contact destinations, retention statements, and DPA
  content remain unchanged. The Pilot terms prose is now grouped under
  descriptive headings only; no term or claim was added.
- `/legal/not-found` provides a small public legal 404, so a missing legal URL
  never falls through to the authenticated `EmptyState` or product shell.
- The shared legal files use public global tokens and the public logo only;
  they do not import authenticated composition, controls, or token styles.

## Verification

| Command/check | Result |
|---|---|
| `npm test -- --runInBand tests/components/phase26LegalEditorial.test.tsx` | Pass — 1 suite, 7 tests covering all four documents, metadata, anchored contents, skip target, shared navigation, and public legal 404 |
| `npm run typecheck` | Pass |
| `npm run lint:authenticated-design` | Pass — 476 files checked; ratchets remain at baseline |
| `npm run lint` | Pass |
| Focused `npx eslint` on all Phase 26 source/test files | Pass |
| `npm run build` | Pass — all four legal documents prerender as static routes; one existing generated Tailwind arbitrary-value optimisation warning remains outside this phase |
| Public Route pack | Pass — `/legal/privacy` inspected at 1440×900 and `/legal/dpa` at 1024×768: no horizontal overflow, full heading/content navigation, consistent public chrome, and no console warnings/errors. The shared responsive composition and focused DOM test cover the remaining two documents and public legal 404. |

## Regression and scope review

No legal prose, approved claim, authentication behavior, provider request,
permission check, route destination, or authenticated product composition
changed. The only new route behavior is a scope-owned public legal 404 for
unknown `/legal/*` paths. No authenticated shared code was changed, so the
Prior-phase pack is N/A.

## File and module budget

- New reusable production modules: 1
  - `components/public/LegalDocument.tsx`
- New route-owned production modules: 1
  - `app/(public)/legal/not-found.tsx`
- Production files changed: 8
  - `components/public/LegalDocument.tsx`
  - `components/public/legalDocument.module.css`
  - `components/public/LegalHeader.tsx`
  - `app/(public)/legal/data-handling/page.tsx`
  - `app/(public)/legal/dpa/page.tsx`
  - `app/(public)/legal/pilot-terms/page.tsx`
  - `app/(public)/legal/privacy/page.tsx`
  - `app/(public)/legal/not-found.tsx`

The focused test and phase evidence do not count toward the production-file
budget.
