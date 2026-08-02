# Phase 22 — Governance settings

Status: implemented; Route-pack visual proof pending. Scope per §12.4/§12.6
of `docs/IMPL_living_precision_product_ui.md` (R38–R40, R42, R48).

## Scope and implementation

- Agreements now loads the merchant-scoped document list on the server before
  rendering the upload task. The status summary names whether terms are active,
  archived, or still require merchant verification. Uploading remains separate
  from approving a verified recovery term; the existing upload and rule
  endpoints, permissions, and audit behaviour are unchanged.
- API access retains its existing scoped creation/revoke dialogs and one-time
  secret handling. It already leads with named credentials, usage metadata, and
  explicit revoke confirmation, so no workflow change was required.
- Audit trail now uses the canonical registry surface. Its structured detail
  disclosure presents readable labels and nested values rather than leading
  with JSON or internal field names; export and resource filters keep their
  existing server scope.
- Data & privacy now uses a readable ordered data-flow composition, followed by
  joined retention/removal, erasure, and audit/legal sections. The existing
  destructive confirmation, erasure receipt, and audit route remain intact.
- Notification preferences now use compact, grouped joined sections. A failed
  optimistic toggle restores the previous value and announces the recovery;
  a successful save acknowledges only the initiating preference.
- Agreements and notification preferences gained route-owned loading and error
  states matching the Settings form geometry.

## Verification

| Command/check | Result |
|---|---|
| `npm test -- --runInBand tests/components/phase22GovernanceSettings.test.tsx` | Pass — server-loaded agreement status precedes the upload task; grouped notification preferences recover from a failed save |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run lint:authenticated-design` | Pass — 474 files checked; all ratchets within baseline |
| `git diff --check` | Pass |
| `npm run build` | Did not complete in the local tool session after `Creating an optimized production build …`; no build-pass claim |
| Route-pack visual review | Pending — the local app at `localhost:3000` returned `ERR_CONNECTION_REFUSED`, so populated 1440×900 and 1024px inspection could not run |

## Regression and scope review

No API-key secret, revoke, permission, audit immutability, privacy/erasure,
agreement verification, notification preference, export, or route behaviour
changed. The one new client component is route-owned and keeps browser state
only for the existing Agreement upload/term-approval workflow.

## File and module budget

- New reusable production modules: 0
- New route-owned production modules: 1 —
  `components/settings/AgreementSettingsClient.tsx`
- Production files changed: 9
  - `app/(app)/settings/agreements/page.tsx`
  - `app/(app)/settings/agreements/loading.tsx`
  - `app/(app)/settings/agreements/error.tsx`
  - `components/settings/AgreementSettingsClient.tsx`
  - `components/settings/AuditTrailClient.tsx`
  - `app/(app)/settings/data-privacy/page.tsx`
  - `components/settings/NotificationPreferencesForm.tsx`
  - `app/(app)/settings/notifications/loading.tsx`
  - `app/(app)/settings/notifications/error.tsx`

The focused test and phase evidence do not count toward the production-file
budget.
