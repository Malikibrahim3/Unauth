# Phase 18 — Connector settings and provider setup

Status: implemented; Route-pack visual proof pending. Scope per §12.4/§12.6
of `docs/IMPL_living_precision_product_ui.md` (R43–R47).

## Scope and implementation

- Added `ConnectorSetupShell` as the shared settings-connector anatomy for
  requirements, the `Requirements → Connect → Verify` sequence, provider
  identity, and provider-owned setup content. Chrome, Freshdesk, Gorgias,
  Shopify, and Zendesk all use it without changing their authentication,
  credentials, webhook, test/save, or disconnect contracts.
- Kept prerequisites contextual: each provider names only the required account
  access, credentials, and webhook/installation permission. Provider marks are
  identity-only inside the neutral setup frame.
- Corrected Chrome download, Shopify authorization, sync, webhook, form
  validation, and disconnect failure feedback so no failure is green or styled
  as a successful connection. Zendesk ticket-sync failures now share the same
  critical alert treatment and a recovery instruction. The Shopify disconnect
  confirmation uses the canonical final destructive action while the initial
  action remains secondary.

## Verification

| Command/check | Result |
|---|---|
| `npm test -- --runInBand tests/components/phase18ConnectorSetup.test.tsx` | Pass — shared progress/requirements anatomy, semantic connection failure alert, and Shopify authorization failure treatment |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run lint:authenticated-design` | Pass — 462 files checked; all ratchets within baseline |
| Diff-scope review | Pass — no provider endpoint, OAuth, credential, webhook, permission, or disconnect semantics changed |

## Route-pack visual evidence

No populated 1440×900 or 1024px browser capture is claimed. The local
application was not available for an authenticated route inspection in this
environment. The focused DOM test covers the shared setup geometry and Shopify
authorization failure; the remaining changed failure markup was typechecked,
linted, and diff-reviewed. Existing provider clients retain their connection,
loading, secret, retry, and disconnect state owners.

Prior-phase pack: N/A — the new shared shell has no existing consumer before
this phase.

## File and module budget

- New reusable production modules: 1 — `components/settings/ConnectorSetupShell.tsx`.
- Production files changed: 12
  - `components/settings/ConnectorSetupShell.tsx`
  - five R43–R47 route modules
  - `components/settings/ChromeSetupClient.tsx`
  - `components/settings/ZendeskSupportSyncClient.tsx`
  - `components/shopify/ShopifyIntegrationBannerInner.tsx`
  - `components/shopify/SyncStatusConnectedView.tsx`
  - `components/shopify/SyncStatusConnectModal.tsx`
  - `components/shopify/ShopifyDisconnectClient.tsx`

The focused test, phase report, and §12.10 update do not count toward the
production-file budget.
