# Phase 25 — Demo, landing, pricing, and real product proof

Status: implemented; Phase 28 deterministic release-capture proof pending.
Scope per §12.4/§12.6 of `docs/IMPL_living_precision_product_ui.md`
(R55–R56, R61, R64).

## Scope and implementation

- `/demo` is a real, versioned fictional merchant case rendered with the
  shipping `Surface`, `JoinedSection`, `InsetGroup`, `Button`, and
  `StatusBadge` primitives. Its incoming, evidence, recommendation, decision,
  and recovery states use deterministic fixture values. Decisions remain local
  to the browser and the route states explicitly do not call a provider, issue
  a refund, deny a case, or execute recovery.
- `/landing` now uses two legible WebP captures taken from the shipping `/demo`
  route. The active composition contains no iframe or separately drawn product
  interface. Its product proof, process, integrations, and calls to action
  describe routes and capabilities that exist, and violet owns the interactive
  identity.
- `/pricing` keeps the existing merchant-controlled signup and Billing path
  while presenting the shipped Free, Pro, Growth, and Enterprise limits. It no
  longer claims an unsupported trial, exports on Free, or API access below
  Enterprise. Pro is the recommended plan and plan cards reflow from one to two
  to four columns.
- `/` retains its exact server redirect to `/landing`; no client shell or
  intermediate marketing frame was added.

## Verification

| Command/check | Result |
|---|---|
| `npm test -- --runInBand tests/components/phase25PublicProductProof.test.tsx tests/unit/demoFixture.test.ts tests/api/merchantIsolation.test.ts` | Pass — 3 suites, 29 tests |
| Focused `npx eslint` on the 11 Phase 25 production source files and focused test | Pass |
| `npm run typecheck` | Pass |
| `npm run lint:authenticated-design` | Pass — 476 files checked; all ratchets remain at baseline |
| `npm run build` | Pass — compilation, TypeScript, static generation, and route output complete; CSS optimisation emitted one non-fatal generated Tailwind arbitrary-value warning |
| `npm run lint` | Retains the unrelated pre-existing `components/dashboard/DashboardOverview.tsx:206` React Compiler `preserve-manual-memoization` error plus four warnings outside Phase 25; no Phase 25 file is reported |
| `npm run verify:ui-parity` | Retains the documented pre-existing `/partners`, `/`, and router-push baseline false positives; Phase 25 adds no authenticated route or navigation change |
| `npm run verify:merchant-copy` | Reports four unrelated existing violations in `ReconciliationSummaryCard.tsx` and `CanonicalCsvImportClient.tsx`; no Phase 25 file is reported |
| Public Route pack | At 1440×900, `/demo?step=evidence`, `/landing`, and `/pricing` preserve their intended hierarchy. At 1024×768/900, all three reflow without horizontal overflow. Demo decision-to-recovery interaction stays local, `/` returns 307 and resolves to `/landing`, and the browser console has no warning or error |

## Product-proof assets

| Asset | Shipping route state | Encoded size | SHA-256 |
|---|---|---:|---|
| `public/product-proof/case-evidence.webp` | `/demo?step=evidence` | 1520×950 | `a8213d30bcc5e6a5e035f42e3a7c3706f99b82f094aef9a72ad3a338971b2b13` |
| `public/product-proof/case-recommendation.webp` | `/demo?step=recommendation` | 1240×776 | `40376cc7ace9ebd3f37b53ec81e810a2fa62efce8d79e86b69e7523833cfc6c3` |

These are privacy-safe local route captures of the versioned fictional
`merchant-case-v1` fixture. They establish that the landing page depicts the
shipping route rather than a mock. They are not claimed as final §13.2 release
captures: Phase 28 owns the pinned Linux image and browser build, DPR 2, frozen
clock, font and animation gates, seed revision, capture manifest, and two-run
byte-identical proof.

## Regression and scope review

No authentication request, provider request, billing mutation, permission
check, merchant-data query, or application redirect changed. Public and product
styling remain isolated: the marketing page frames the captures, while the
captured case itself uses product tokens and primitives. Demo decisions only
advance local fixture state. Pricing changes presentation and claims only; plan
selection still starts with the existing signup path and remains
merchant-controlled in Billing.

The obsolete standalone HTML artifacts were deleted only after their active
landing references were removed and the shipping-route replacements were
verified. No authenticated shared primitive was modified, so no prior-phase
authenticated route pack was triggered.

## File and module budget

- New reusable production modules: 0
- New route-owned production modules: 0
- Production source files changed: 11
  - `app/(public)/demo/page.tsx`
  - `components/demo/OperationalCaseDemo.tsx`
  - `lib/demo/merchantCaseV1.ts`
  - `app/(public)/landing/page.tsx`
  - `app/(public)/landing/_components/foundation/FoundationHero.tsx`
  - `app/(public)/landing/_components/foundation/FoundationHero2.tsx`
  - `app/(public)/landing/_components/foundation/FoundationFinalCta.tsx`
  - `app/(public)/landing/_components/foundation/FoundationPricingTiers.tsx`
  - `app/(public)/landing/_components/foundation/foundation.module.css`
  - `app/(public)/landing/_lib/foundationContent.ts`
  - `lib/billing/landingTierChart.ts`
- Public assets removed: 2 obsolete HTML imitations
- Public assets added: 2 WebP captures from the shipping `/demo` route

The focused regression test and phase evidence do not count toward the
production-file budget.
