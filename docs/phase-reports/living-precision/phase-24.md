# Phase 24 — Product entry, signup, reset, and onboarding

Status: implemented; incomplete-workspace onboarding-resume Route-pack proof
pending. Scope per §12.4/§12.6 of
`docs/IMPL_living_precision_product_ui.md` (R52–R54, R62–R63).

## Scope and implementation

- `/login`, `/reset`, `/reset/update`, and `/signup` now use the same violet
  `--ua-*` entry grammar. Their forms reserve inline error space, announce
  errors, retain safe entered values after a recoverable failure, and clear only
  the changed field's error. The reset request/success surface has a stable
  minimum height; the password-update form exposes its length requirement while
  typing.
- Signup keeps the existing Supabase signup, fallback sign-in, server-owned
  placeholder-workspace bootstrap, and `/onboarding` redirect. The patch only
  adds client-side validation and replaces the stale public token references
  with the existing product entry tokens.
- `/onboarding` now has one dominant task surface and a quiet checklist. Its
  progress bar reports actual completed steps, profile validation is field-local
  plus one concise alert, a failed Shopify OAuth return has an explicit recovery
  message, and the existing saved profile/connection state still selects the
  resume step.
- Route-owned onboarding loading and error boundaries mirror the resolved task
  geometry. They do not expose server errors or imply that setup work was
  completed.

## Verification

| Command/check | Result |
|---|---|
| `npm test -- --runInBand tests/components/phase24EntryOnboarding.test.tsx tests/unit/onboardingReducer.test.ts tests/unit/signupWorkspaceBootstrap.test.ts` | Pass — announced/reserved errors, truthful zero-completion progress, inline profile errors, existing resume reducer, and signup bootstrap contract |
| Focused `npx eslint` on the 10 Phase 24 source/test files | Pass |
| `npm run typecheck` | Pass |
| `npm run lint:authenticated-design` | Pass — 476 files checked; all ratchets remain at baseline |
| `npm run lint` | Retains the pre-existing `components/dashboard/DashboardOverview.tsx:206` React Compiler `preserve-manual-memoization` error; no Phase 24 file is reported |
| `npm run build` | Pass — production compilation, TypeScript, and onboarding server artifacts complete |
| Local entry review | At 1440×900, reset and signup show one calm task surface and announce blank-submit validation; reset-update updates its password requirement while typing. At 1024×900, `/reset` has `scrollWidth === clientWidth` and no console errors. A completed workspace correctly redirects `/onboarding` to its permitted app default. |

## Regression and scope review

No auth provider request shape, reset redirect, signup bootstrap request,
onboarding persistence request, OAuth handoff URL, integration return path,
permission check, or app redirect changed. The only new route behaviour is
rendering the existing Shopify OAuth query failure in its current onboarding
step. Public landing tokens remain isolated; signup uses the existing product
entry shell instead of importing landing components.

## File and module budget

- New reusable production modules: 0
- New route-owned production modules: 2
  - `app/onboarding/loading.tsx`
  - `app/onboarding/error.tsx`
- Production files changed: 9
  - `app/(auth)/AuthShell.tsx`
  - `app/(auth)/login/page.tsx`
  - `app/(auth)/reset/page.tsx`
  - `app/(auth)/reset/update/page.tsx`
  - `app/(public)/signup/page.tsx`
  - `components/Onboarding/onboardingReducer.ts`
  - `components/OnboardingClient.tsx`
  - `app/onboarding/loading.tsx`
  - `app/onboarding/error.tsx`

The focused test and phase evidence do not count toward the production-file
budget.
