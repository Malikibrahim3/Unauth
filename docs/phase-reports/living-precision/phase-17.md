# Phase 17 — Integrations hub, catalogue, imports, and provider entry

Status: implemented; Route-pack visual proof pending. Scope per §12.4/§12.6
of `docs/IMPL_living_precision_product_ui.md` (R27–R31).

## Scope and implementation

- Kept the integrations hub's existing one-summary, one-toolbar composition
  and dominant connection/catalogue surface. Provider names now wrap in both
  the connected list and catalogue cards, so provider identity is never
  visually truncated.
- Reworked the CSV task into a calm three-step workspace. Source-column mapping
  and validation errors use merchant-facing record-detail labels before a
  canonical value is sent to the API; the transport mapping values, validation,
  provenance, independent valid-row commits, and deduplication semantics are
  unchanged. Raw job IDs no longer lead the confirmation or history UI.
- Made the provider entry task explicit with contextual connection controls and
  correct alert semantics for failed actions. Connected, disconnected, retry,
  and disconnect behaviour remains owned by the existing connection contract.
- Added the truthful ShipBob no-channel state and its recovery link, and fixed
  the internal development preview so its reused connector rows remain valid
  list markup. Its production `notFound()` guard is unchanged.

## Verification

| Command/check | Result |
|---|---|
| `npm test -- --runInBand tests/components/phase17Integrations.test.tsx` | Pass — merchant-facing mapping labels and validation boundary |
| `npx eslint app/(app)/integrations components/integrations components/imports/CanonicalCsvImportClient.tsx tests/components/phase17Integrations.test.tsx` | Pass |
| `npm run typecheck` | Pass |
| `npm run lint:authenticated-design` | Pass — 461 files checked; all ratchets within baseline |
| Diff-scope review | Pass — no provider contract, import API, permission, or audit behaviour changed |

## Route-pack visual evidence

The in-app browser could not navigate to the local application at
`localhost:3000/integrations`, so populated 1440×900 and 1024px inspection is
not claimed. No screenshot was produced. The focused DOM test covers the
changed import interaction; the existing implementation retains explicit
connected, browse, import, provider, development-preview, ShipBob selection,
loading, and error-state owners.

Prior-phase pack: N/A — no shared primitive API or CSS contract changed.

## File and module budget

- New reusable production modules: 0.
- Production files changed: 6
  - `components/integrations/IntegrationsWorkspace.module.css`
  - `components/integrations/ConnectionActions.tsx`
  - `components/imports/CanonicalCsvImportClient.tsx`
  - `components/imports/CanonicalCsvImportClient.module.css`
  - `app/(app)/integrations/dev-preview/page.tsx`
  - `app/(app)/integrations/shipbob/select/ShipBobAccountSelectionClient.tsx`

The focused test, phase report, and §12.10 update do not count toward the
production-file budget.
