# Living Precision Phase 28 — deterministic release gate

**Status:** Implementation complete; release evidence and independent review
pending. This report does **not** claim `LIVING-PRECISION COMPLETE /
CAPTURE-READY`.

**Date:** 29 July 2026

## Scope delivered

- A canonical R01–R64 capture manifest owns every App Router page exactly once:
  58 production renderables, two development harnesses, and four redirects.
- The dedicated marketing fixture now supplies every dynamic object route, an
  incomplete onboarding workspace, and a populated bounded ShipBob selection
  handoff. All visible identities use `.invalid` email domains.
- Capture mode is installed before hydration. The validated server clock is
  shared with the browser, capture-owned fetches are counted, fonts and visible
  images must settle, shared resources and transient overlays must reach zero,
  active animations must stop, and two identical animation-frame fingerprints
  are required before `data-capture-ready="true"`.
- Redirects preserve non-consumed query context and fragments while retaining
  their exact canonical destination.
- The exact Playwright 1.59.1 Noble image is pinned by tag and manifest digest.
  The runner records source commit, fixture fingerprint, clock, locale,
  timezone, Chromium version, image digest, viewport, DPR, crop, checksums,
  runtime failures, and privacy results.
- Run A captures every renderable at 1440×900, production 404 proof for the two
  development routes, development visual proof, redirect proof, authenticated
  family coverage at 1024px, and flagship 1280/dark/reduced-motion/
  forced-colour variants.
- Run B compares raw pixels with threshold 0.2 and a maximum 0.1% changed-pixel
  ratio, verifies byte-identical encoded slots, re-runs runtime/privacy/
  transient checks, and requires approved §14 scorecards plus named human
  privacy, benchmark, and engineering reviews.
- The two landing slots use explicit §13.2 source crops, display sizes, encoded
  dimensions, and checked-file checksum comparison. The release runner never
  mutates checked artwork. The implementation pass promoted the reviewed
  deterministic candidates to the two checked public slots.
- Eight remaining hand-rolled product tables were folded onto `DataTable` or
  `DataTableServer`. The hand-rolled-table ratchet is now 0/0; obsolete fake
  artwork and superseded chart/motion primitives are absent.
- Both development harnesses return an actual HTTP 404 from the production
  proxy before authentication or rendering, while remaining captureable from
  the isolated development server.
- The capture runner distinguishes intentional RSC cancellations and recovered
  GETs from unrecovered required-resource failures, scopes intentional loading
  specimens in the development gallery, and still fails closed on screenshot,
  readiness, response, privacy, runtime, and product-slot failures.
- The five §15 named commands are present and non-overlapping.

## Primary implementation

- `scripts/living-precision/manifest.mjs`
- `scripts/living-precision/environment.mjs`
- `scripts/living-precision/capture.mjs`
- `scripts/living-precision/Dockerfile`
- `scripts/living-precision/README.md`
- `scripts/verify-living-precision.mjs`
- `components/system/RouteReadySignal.tsx`
- `app/layout.tsx`
- `lib/time/clock.ts`
- `lib/navigation/preservedRedirect.ts`
- `scripts/marketing-seed/manifest.mjs`
- `scripts/marketing-seed/fixture.mjs`
- `scripts/seed-marketing.mjs`
- `scripts/validate-marketing-seed.mjs`
- `scripts/marketing-seed/local-database.mjs`
- `scripts/check-authenticated-functional-parity.mjs`
- `proxy.ts`
- `next.config.js`
- `public/product-proof/case-evidence.webp`
- `public/product-proof/case-recommendation.webp`

## Automated evidence

| Command | Result |
|---|---|
| `npm run lint -- --max-warnings=0` | Pass — zero warnings |
| `npm run typecheck` | Pass |
| `npm run lint:authenticated-design` | Pass — 486 files; all three ratchets 0/0 |
| `npm run verify:ui-parity` | Pass — 209 committed destinations |
| `npm run verify:living-precision` | Pass — 25 checks; 64 routes; 58/2/4 classification; exact product-slot dimensions |
| `npm run seed:marketing` | Pass — deterministic two-merchant graph |
| `npm run validate:marketing-seed` | Pass — 773 records |
| fixture-bound `next build --webpack` | Pass — 93 static pages generated |
| `npm run test:living-precision:components` | Pass — 26 suites, 123 tests |
| `npm run test:living-precision:a11y` | Pass — 67/67 |
| `npm run capture:living-precision` with `LIVING_PRECISION_ALLOW_HOST=1` | Pass — `host-evidence-only`, zero failed checks; all routes, redirect proofs, development contracts, 1024px edges, flagship variants, and checked slots |
| release capture without required environment inputs | Expected fail-closed preflight |

## Release evidence still required

The exact-container Run A/Run B proof has not been produced in this workspace.
The local Supabase stack and simultaneous fixture-bound production/development
servers produced a complete, zero-failure **host-only** Run A. That run is
useful implementation evidence but is explicitly marked `host-evidence-only`
and cannot substitute for the pinned Linux container, second run, approved
scorecard file, or two independent reviewers. Consequently:

- no release-authority R01–R64 screenshot/contact-sheet pack is claimed here;
- no §14 route score is claimed here;
- no exact-container two-run pixel/encoded-byte result is claimed here;
- no independent privacy/design/engineering approval is claimed here; and
- §12.10 remains **IN PROGRESS — not screenshot-ready**.

The generated `review-scorecards.template.json` is intentionally evidence
input, not an auto-approved score. `capture:living-precision:verify` fails
closed until every applicable route/capture score, human review, runtime check,
privacy check, and second-run comparison passes.
