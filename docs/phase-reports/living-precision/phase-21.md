# Phase 21 — Core settings

Status: implemented; Route-pack visual proof and production-build completion
pending. Scope per §12.4/§12.6 of
`docs/IMPL_living_precision_product_ui.md` (R37, R41, R49–R51).

## Scope and implementation

- `/settings/account`, `/settings/billing`, and `/settings/platform` now put
  their sections inside one dominant working surface. Sections are joined by
  dividers, not re-stacked as independent cards. Account saves/password changes
  and Defaults saves retain local success/error feedback; account deletion and
  billing cancellation remain isolated and explicitly confirmed. Billing plan
  controls now bind their saving state to the exact plan action that started it.
- `/settings/team` removes the manufactured metrics row. Its compact summary,
  member controls/table, and role audit form one joined working surface while
  preserving invitation, role, removal, ownership-transfer, export, and audit
  behavior.
- Shared Settings navigation now follows the specified groups: Workspace; Data
  & access; Operations; Commercial. The external Connected apps destination
  remains the existing `/integrations` route. `/settings` still performs the
  direct server redirect to `/settings/account`.
- Platform defaults now has route-owned loading and error states; its client
  loading state reserves the resolved form geometry rather than leaving a text
  loader in the form column.

## Verification

| Command/check | Result |
|---|---|
| `npm test -- --runInBand tests/components/phase21CoreSettings.test.tsx` | Pass — grouped current navigation, Connected apps destination, direct settings redirect, joined Account anatomy, and disabled destructive control before confirmation |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run lint:authenticated-design` | Pass — 469 files checked; all ratchets within baseline |
| Route-pack visual review | Pending — no authenticated local browser was available for populated 1440×900 and 1024px inspection |
| `npm run build` | Did not complete in the local tool session after `Creating an optimized production build …`; no build-pass claim |

## Regression and scope review

No mutation endpoint, permission predicate, billing-plan/credit calculation,
membership/role rule, password change, deletion confirmation, or redirect target
changed. The Platform route additions are presentation-only loading/error
boundaries. The Phase-05 settings shell remains the shared dependency; no new
reusable production module was added.

## File and module budget

- New reusable production modules: 0
- Production files changed: 12
  - `app/(app)/settings/layout.tsx`
  - `app/(app)/settings/account/page.tsx`
  - `app/(app)/settings/platform/loading.tsx`
  - `app/(app)/settings/platform/error.tsx`
  - `components/billing/BillingSettingsClient.tsx`
  - `components/settings/AccountProfileSection.tsx`
  - `components/settings/AccountPasswordSection.tsx`
  - `components/settings/AccountDangerSection.tsx`
  - `components/settings/AppearanceSettings.tsx`
  - `components/settings/PlatformSettingsClient.tsx`
  - `components/settings/TeamManagementClient.tsx`
  - `components/settings/TeamAuditTrailSection.tsx`

The focused test and phase evidence do not count toward the production-file
budget.
