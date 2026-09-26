# Landing forensic implementation

Date: 23 September 2026  
Status: historical presentation; superseded by the owner’s polished landing restoration  
Source: owner-supplied `Unauth_Landing_Forensic_Implementation_Spec.md`

### Landing presentation restoration — 23 September 2026 (current)

The owner requests the earlier polished landing from this conversation, fitted
to the current information. Restore the composition archived in
`artifacts/landing-v3/2026-09-23/before/`: full-frame genuine Asterlane hero,
light typography, open evidence-to-gate diagram, separate case chapter, recovery
folder, light receipt and conditional outcome, shared team panels, supporting
strip and configuration. This supersedes later v3, LCR and forensic presentation
choices only. Current supervised handoffs, pre-launch AI, on-demand courier
records, claimant eligibility and verified-money distinctions remain binding.
Do not restore obsolete execution claims. No backend, release, subscription,
permission or provider capability changes are authorised by this restoration.
Evidence: `artifacts/landing-restoration/2026-09-23/receipt.md`.

## Historical authority and scope

The owner's request to implement the supplied specification adopts its LOCK-01–12 presentation decisions for `/landing`. `GLOBAL_RULES.md` still owns product truth, money, provider action, safety and release. `PRODUCT.md` owns positioning and the current supervised capability boundary. `DESIGN.md` and `components/public/public.module.css` own the scoped visual system. `lib/demo/merchantCaseV1.ts` owns fictional facts; the landing reads them without persisting domain progress.

The current instruction keeps the genuine Asterlane Overview. It supersedes the LCR case-capture replacement, the prior five-step tool strip, repeated provider panels and the always-blurred landing header. The PDF's grey hero was an export observation; the live browser baseline did not reproduce it. Print/export verification remains separate.

## Change ledger

| Requirements | Owner/file | Local result | Status |
|---|---|---|---|
| HERO-01–06 | `app/(public)/landing/page.tsx`, `components/public/LandingProductStage.tsx`, `components/public/public.module.css` | Retained 1920×1080 fictional Overview and full-size route; separated copy from an inset warm image stage; removed hero-wide pattern and header blur. | Implemented; live browser reviewed at desktop and phone; native export review pending. |
| GATE-01–04, ART-01 | `components/public/LandingScenes.tsx`, `PublicInteractions.tsx`, `lib/demo/merchantCaseV1.ts`, CSS owner | Source facts lead into a named graphite gate and merchant-review route. SAMPLE-248 uses an honest policy-review fallback. £150 assessment and claimant/route action stay separate. Case selection and presentation-only replay are local. | Implemented; all three case views and replay checked in the local browser. |
| REC-01–02, ART-02 | `components/public/LandingOutcomeVisuals.tsx`, CSS owner | Native raised evidence pack uses SAMPLE-248, WH-DEMO-01, the eligible ceiling, unsubmitted state, owner and merchant-set review date. Later stages remain neutral. | Implemented; desktop and phone reviewed. |
| FIN-01–02, ART-03 | `components/public/LandingOutcomeVisuals.tsx`, `LandingScenes.tsx`, CSS owner | One graphite section keeps current pending case visible; receipt review and conditional reconciliation are separate tab views. The latter retains £248 − £150 = £98 and its narrow label. | Implemented; both views rendered and selected in browser. |
| INT-01–02, ART-04 | `components/public/LandingProductGrid.tsx`, landing route, CSS owner | Five-step strip and duplicate provider grid replaced by source families feeding SAMPLE-248 and three short team responsibilities. Coverage is disclosed under four merchant-readable headings. | Implemented; rendered review completed. |
| CTA-01–03 and copy | Landing route | Original headline, product walkthrough, pricing route and monthly offer remain. Execution and submission wording reflects the current merchant-completed handoff; FAQ answers agree. | Implemented; commercial publication claim still needs owner verification. |

## Data and route decisions

- Demo entry remains `/demo?case=recoverable&step=inspect`; pricing remains `/pricing`; full-size hero uses the existing image URL.
- SAMPLE-248, COAT-01, £248 requested, WH-DEMO-01, £150 maximum, Amelia Reed, the merchant-set date, RECEIPT-248 and the £98 conditional balance derive from `merchantCaseV1.ts` and its pure presentation calculations.
- The fixture exposes no specific wrong-item policy condition. The gate therefore says “Merchant policy review” and does not present the recommendation as a rule.
- The current public action mode is supervised: Unauth records a decision and prepares handoffs; the merchant completes external actions in existing tools. Participating AI remains pre-launch.

## Local verification receipt

Revision: working tree based on `640739df` on `codex/deployment-readiness-20260826` (uncommitted); local Next development server and Codex in-app Chromium browser, 23 September 2026. These are development observations, not a production build or release decision.

- **Pass — QA-01–03, 09–12, 13, 16–28, 50 (bounded visual/content checks):** inspected the retained hero and redesigned gate, recovery, finance and source composition at 1440, 1280, 1024, 768, 390 and 320 CSS pixels. No page-level horizontal overflow was seen. Inspected all three case selections; each displayed its own reference, amount, evidence and recommendation. Selected both financial views; the current pending case remained distinct. The first hero image remains the existing 1920×1080 Asterlane Overview JPEG, 151,480 bytes. Browser screenshots were reviewed live but not persisted as baseline artifacts.
- **Pass — QA-24 and part of QA-33/34/37:** the finance selector and case selector changed only local presentation state in browser and component tests; replay exposed the same selected case. Arrow and End keys selected matching labelled panels; Enter opened the coverage disclosure. Full keyboard and screen-reader paths remain untested.
- **Pass — code/build checks:** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`; targeted ESLint; `npx jest tests/components/publicTransformation.test.tsx tests/components/landingProductStage.test.tsx --runInBand` (15/15); scoped `git diff --check`; isolated `UNAUTH_NEXT_DIST_DIR=.next-landing-forensic UNAUTH_DISABLE_WEBPACK_CACHE=1 npm run build` (all 110 static pages generated, `/landing` static). The build's two generated `tsconfig.json` entries and isolated output directory were removed after verification; earlier unrelated `tsconfig.json` edits were preserved. The Impeccable design detector reported no findings for the edited UI files.
- **Fail — repository authority gate:** `npm run verify:authority` found five issues: the `.impeccable/design.json` projection is stale after `DESIGN.md` changed; four links/headings in historical `MERCHANT_CLARITY_IMPLEMENTATION.md` do not resolve. The design sidecar requires an intentional `impeccable document` refresh; historical links are outside this landing scope.
- **Not run — QA-04–08, remaining 32–49, 51–52:** native print/PDF recreation, image failure/fallback, complete keyboard and screen-reader audit, forced colours, reduced-motion/zoom, no-JS, three-browser comparison, formal visual regression artifacts, lab/field performance, external request inspection, merchant research and named sign-offs. QA-35's modal checks do not apply: the preserved full-size control is a native link to the original image, not a dialog. No changed bundle comparison is available from this development session. The supplied grey PDF collision was not reproduced on the live browser baseline; export status remains unresolved.

## Publication and handoff

The fixed-monthly offer requires reconciliation with the current billing catalogue before publication. Public capability wording must receive product/release owner review; merchant comprehension and accessibility require their named reviews. This work does not establish provider execution, receipt reconciliation in production, legal approval or release clearance. A presentation rollback is limited to the landing route and its visual components; it must retain the corrected current-action and financial-truth wording.
