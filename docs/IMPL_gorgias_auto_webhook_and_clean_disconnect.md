# Implementation Doc — Gorgias: Auto-register Webhook + Clean Disconnect

**Status:** Ready to implement
**Audience:** Implementer (follow exactly; do not redesign)
**Scope:** Two changes only. **OAuth is explicitly out of scope** — do not build it.

---

## 0. Context (read first)

The Gorgias integration is **credential-based**, not OAuth. A merchant enters their Gorgias
REST API email + key. On connect we already auto-register the **sidebar widget** in Gorgias
via REST. Two problems remain:

1. **The inbound ticket webhook is NOT auto-registered.** The merchant must manually create an
   HTTP Integration in Gorgias (6 steps, see `GorgiasSupportSyncClient.tsx:336-361`). A merchant
   can "successfully connect" and **zero tickets ingest** because they skipped this. This is the
   #1 blocker.
2. **Disconnect is a soft `status='disabled'` only.** Encrypted API credentials, the webhook
   secret hash, and Gorgias-side resources all remain. This is a liability and leaves stale
   widgets/webhooks in the merchant's Gorgias account.

This doc fixes both. **Follow the project rules in `CLAUDE.md`**: no `as any`, no
`eslint-disable`, access env only via `lib/utils/env.ts`, do not touch scoring/matching logic.

### Two key facts that make this simple

- **Inbound webhooks resolve by domain, not just account ID.** `matchGorgiasSupportConnection`
  in [`lib/support/gorgias/resolveConnection.ts`](../lib/support/gorgias/resolveConnection.ts)
  matches on `provider_base_url`/domain (`matchesDomain`, line 69). So the auto-registered
  webhook should send the **`x-gorgias-domain`** header with the domain we already know
  (`identity.domain`). This removes the manual "paste your numeric account ID" step entirely.
  The header name constant is `GORGIAS_DOMAIN_HEADER = 'x-gorgias-domain'` in
  [`accountIdentity.ts:2`](../lib/support/gorgias/accountIdentity.ts).
- **`decryptGorgiasApiCredentials` already exists** but is currently dead code
  ([`credentialCrypto.ts:26`](../lib/support/gorgias/credentialCrypto.ts)). Disconnect and
  rotate-secret will finally use it to make outbound Gorgias cleanup calls.

### A pattern to copy

The webhook registration mirrors the **existing** sidebar registration in
[`lib/support/gorgias/registerSidebarWidget.ts`](../lib/support/gorgias/registerSidebarWidget.ts).
Reuse its helpers — do **not** reinvent HTTP/auth/error handling. Specifically reuse:
`gorgiasApiBaseUrl`, `basicAuthHeader` (currently private — export it), `gorgiasApiRequest`
(currently private — export it), and `GorgiasSidebarRegistrationError`.

> ⚠️ **One thing you MUST verify before writing code** — see [§5](#5-gorgias-api-contract-to-verify).
> Gorgias may require an HTTP Integration with `triggers` to fire POSTs on its own, **or** it may
> require a companion Rule. The manual UI steps (`GorgiasSupportSyncClient.tsx:336`) only ever tell
> the merchant to create an HTTP Integration (no Rule), which strongly implies the Integration
> fires on its own — but confirm against the Gorgias API docs / a real test account first.

---

## CHANGE 1 — Auto-register the inbound ticket webhook

### Goal
At connect time, after the sidebar widget is registered, also register an HTTP Integration in
Gorgias that POSTs ticket events to our webhook endpoint, with the secret + domain headers
pre-filled. The merchant does **nothing manual**. If auto-registration fails, gracefully fall
back to the existing manual-secret panel (so we never regress).

### 1.1 New file: `lib/support/gorgias/registerSupportWebhook.ts`

Create a module that registers (and can delete) the inbound-webhook HTTP Integration. Model it
on `registerSidebarWidget.ts`.

```ts
// Reuse the shared Gorgias REST helpers from registerSidebarWidget.ts
// (export basicAuthHeader + gorgiasApiRequest from that file first — see 1.2).
import {
  gorgiasApiBaseUrl,
  gorgiasApiRequest,
  GorgiasSidebarRegistrationError, // reuse the same error type
} from '@/lib/support/gorgias/registerSidebarWidget';
import {
  GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME, // 'x-unauth-gorgias-secret'
} from '@/lib/support/gorgias/supportConnectionShared';
import { GORGIAS_DOMAIN_HEADER } from '@/lib/support/gorgias/accountIdentity'; // 'x-gorgias-domain'
import { buildGorgiasSupportWebhookUrl } from '@/lib/support/gorgias/settingsConnection';
//  ^ NOTE: buildGorgiasSupportWebhookUrl lives in settingsConnection.ts. To avoid a circular
//    import (settingsConnection will import THIS module), move buildGorgiasSupportWebhookUrl
//    and GORGIAS_SUPPORT_WEBHOOK_PATH usage into a tiny leaf module OR pass webhookUrl in as a
//    param. PREFERRED: pass `webhookUrl` and `secret` and `domain` as params — keep this module
//    pure and free of circular deps.

export type GorgiasSupportWebhookRegistrationResult = { integrationId: number };

export async function registerGorgiasSupportWebhook(input: {
  providerBaseUrl: string;          // e.g. https://acme.gorgias.com
  credentials: { email: string; api_key: string };
  webhookUrl: string;               // from buildGorgiasSupportWebhookUrl()
  webhookSecretPlaintext: string;   // passed straight to Gorgias as a header value
  domain: string;                   // identity.domain — sent so inbound resolves by domain
  previousIntegrationId?: number | null; // delete after new one is live (re-register)
}): Promise<GorgiasSupportWebhookRegistrationResult> {
  const apiBaseUrl = gorgiasApiBaseUrl(input.providerBaseUrl);

  const integration = await gorgiasApiRequest<{ id: number }>(
    apiBaseUrl,
    '/integrations',
    input.credentials,
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'Unauth Support Webhook',
        description: 'Pushes Gorgias ticket events to Unauth for fraud/claim intelligence',
        type: 'http',
        http: {
          url: input.webhookUrl,
          method: 'POST',
          headers: {
            [GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME]: input.webhookSecretPlaintext,
            [GORGIAS_DOMAIN_HEADER]: input.domain,
          },
          triggers: {
            'ticket-created': true,
            'ticket-updated': true,
            'ticket-message-created': true,
          },
          request_content_type: 'application/json',
          response_content_type: 'application/json',
        },
      }),
    }
  );

  // Best-effort removal of a previous webhook integration on re-register (mirror the
  // deleteGorgiasSidebarWidget best-effort pattern: swallow 404/errors, never throw).
  if (input.previousIntegrationId) {
    await deleteGorgiasSupportWebhook(apiBaseUrl, input.credentials, input.previousIntegrationId);
  }

  return { integrationId: integration.id };
}

export async function deleteGorgiasSupportWebhook(
  apiBaseUrl: string,
  credentials: { email: string; api_key: string },
  integrationId: number
): Promise<void> {
  // Copy the body of deleteGorgiasSidebarWidget exactly: DELETE /integrations/{id},
  // treat 404 as success, swallow all other errors. Never throw.
}
```

**Important details:**
- The webhook **payload shape** Gorgias sends must match what `ingestWebhook.ts` /
  `accountIdentity.ts` expect. The existing manual setup works today, so the default Gorgias
  HTTP Integration body is already compatible — **do not** add a custom body template unless §5
  verification shows the default payload omits the ticket. If a body template is needed, ensure
  it includes the ticket object and an account identifier; but prefer the default.
- We send `x-gorgias-domain` (not the numeric account ID) because we know the domain and
  `matchesDomain` resolves on it. This is the whole point — no manual account-ID step.

### 1.2 Edit `lib/support/gorgias/registerSidebarWidget.ts` — export two helpers

Currently `basicAuthHeader` (line 71) and `gorgiasApiRequest` (line 91) are module-private.
Add `export` to both so the new module reuses them. Do not change their behavior.

### 1.3 Edit `lib/support/gorgias/supportConnectionShared.ts` — add a scope entry type

Add a new scope-entry kind alongside `GorgiasSidebarScopeEntry` (after line 39):

```ts
export type GorgiasSupportWebhookScopeEntry = {
  kind: 'gorgias_support_webhook';
  integration_id: number;
  registered_at: string;
};
```

Also add two fields to `GorgiasSupportConnectionSettings` (after `sidebar_widget_id`, line 56)
so the UI can show webhook auto-registration status:

```ts
  support_webhook_registered: boolean;
  support_webhook_integration_id: number | null;
```

### 1.4 Edit `lib/support/gorgias/settingsConnection.ts`

This is the orchestration hub. Several edits:

**(a) Add a scope reader** next to `readSidebarScopeEntry` (line 59). Returns the
`gorgias_support_webhook` entry from the `scopes` array (validate `integration_id` is a number).

**(b) Surface it in `toGorgiasSupportConnectionSettings`** (line 119). After computing
`sidebarScope`, also compute `webhookScope` and add to the returned object:

```ts
    support_webhook_registered: Boolean(webhookScope),
    support_webhook_integration_id: webhookScope?.integration_id ?? null,
```

**(c) Register the webhook inside `registerGorgiasSidebarForConnection`** (line 287) OR in a
sibling step in `createMerchantGorgiasSupportConnection`. **Recommended placement:** do it in
`createMerchantGorgiasSupportConnection` (line 387) right after the sidebar registration
succeeds and right before `upsertGorgiasSupportConnection`, because that's where the plaintext
`webhookSecretPlaintext` already exists (line 400). Sequence:

```ts
// after sidebarRegistration, after the auth-error hard-fail check (line ~420):
let webhookScope: GorgiasSupportWebhookScopeEntry | null = null;
let webhookAutoRegistered = false;
if (identity.provider_base_url && identity.domain && sidebarRegistration.accessTokenEncrypted) {
  try {
    const { integrationId } = await registerGorgiasSupportWebhook({
      providerBaseUrl: identity.provider_base_url,
      credentials: { email: parsed.gorgias_api_email, api_key: parsed.gorgias_api_key },
      webhookUrl: buildGorgiasSupportWebhookUrl(),
      webhookSecretPlaintext,
      domain: identity.domain,
      previousIntegrationId: null,
    });
    webhookScope = {
      kind: 'gorgias_support_webhook',
      integration_id: integrationId,
      registered_at: new Date().toISOString(),
    };
    webhookAutoRegistered = true;
  } catch {
    // Graceful fallback: leave webhookScope null. The merchant still gets the one-time
    // secret panel + manual steps (existing behavior). DO NOT throw — connect still succeeds.
    webhookAutoRegistered = false;
  }
}
```

Then merge `webhookScope` into the `scopes` array passed to `upsertGorgiasSupportConnection`
(line 422). The scopes array currently holds only the sidebar entry — make it hold both:

```ts
const scopes = [
  ...(sidebarRegistration.scopes ?? []),
  ...(webhookScope ? [webhookScope] : []),
];
// ...pass `...(scopes.length ? { scopes } : {})` to upsert
```

**(d) Conditionally hide the manual panel.** Add `support_webhook_auto_registered: boolean` to
`CreateGorgiasSupportConnectionResult` (line 240) and set it from `webhookAutoRegistered`. The
client uses this to decide whether to show the manual setup panel (see 1.6).

**(e) Update path (`updateMerchantGorgiasSupportConnectionMetadata`, line 453):** do **NOT**
re-register the webhook here. The metadata-update path has no fresh plaintext secret (we only
store the hash, and it cannot be recovered). The existing webhook integration keeps working
because its secret still validates against the unchanged stored hash. Leave it untouched.
(Re-registration with a new secret happens only in rotate-secret — see Change 1.7.)

### 1.5 Rotate-secret must re-register the webhook (`rotateMerchantGorgiasWebhookSecret`, line 521)

When the secret rotates, the old webhook integration in Gorgias still sends the **old** secret,
which will start failing auth against the new hash. So rotate must update Gorgias too:

1. Load existing connection (already done, line 525).
2. Decrypt stored credentials via `decryptGorgiasApiCredentials` (you'll need to read
   `access_token_encrypted` — extend `getMerchantGorgiasSupportConnection`'s row, or do a small
   direct read; the encrypted blob is already selected in `CONNECTION_SETTINGS_SELECT`, line 56,
   but stripped in `toGorgiasSupportConnectionSettings`. Add an internal helper that returns the
   raw blob, or thread it through. Do **not** expose the blob in any API response.)
3. If creds + `provider_base_url` + domain are available, call `registerGorgiasSupportWebhook`
   with the **new** plaintext secret and `previousIntegrationId` = the stored webhook scope's
   `integration_id`. Update the webhook scope entry with the new integration id.
4. Best-effort: if the Gorgias call fails, still rotate the local secret and fall back to
   showing the manual panel (existing behavior). Don't throw.

### 1.6 Edit `components/settings/GorgiasSupportSyncClient.tsx` — only show manual steps on fallback

Today the create flow **always** pops the one-time secret panel + 6 manual steps
(`setShowSetupInstructions(true)`, line 161). Change so that when the server reports the webhook
was auto-registered, we show a clean success message and **skip** the manual panel.

- Read `body.support_webhook_auto_registered` in `createConnection` (line 123).
- If `true`: do **not** call `setShowSetupInstructions(true)`; do **not** set `ephemeralSecret`.
  Show success copy: "Gorgias connected. Tickets will now sync automatically and Unauth appears
  in every ticket sidebar." (Reuse/adjust `GORGIAS_CONNECT_SUCCESS_MESSAGE`.)
- If `false` (fallback): keep current behavior exactly (show secret + manual steps).
- Add the webhook status to the connected-state `<dl>` (around line 578, next to "Sidebar
  widget"): a row "Ticket webhook" → `connection.support_webhook_registered ? 'Registered in
  Gorgias' : 'Manual setup required'`.
- Fix the misleading copy at lines 529-532 and the success branches at 171-185: when
  auto-registered, stop saying "Complete the webhook steps below."

### 1.7 Update the shared success/auto-note copy

In `supportConnectionShared.ts`, `GORGIAS_CONNECT_SUCCESS_MESSAGE` (line 26) and
`GORGIAS_SIDEBAR_AUTO_NOTE` (line 22) should reflect that tickets sync automatically. Keep the
manual-fallback copy available for the fallback branch.

---

## CHANGE 2 — Clean disconnect (deregister remote + delete credentials)

### Goal
"Disable connection" becomes a clean break: deregister the sidebar widget **and** the webhook
integration in Gorgias, then wipe credentials, the webhook secret hash, and scope metadata from
our DB. Historical `support_case_intake` rows are retained (separate table, untouched).

### 2.1 Edit `lib/support/gorgias/settingsConnection.ts` — `disableMerchantGorgiasSupportConnection` (line 564)

New sequence:

1. Load the existing connection **including the encrypted credential blob and scopes** (the
   public settings type strips them — add an internal read that returns
   `access_token_encrypted` + `scopes`, reusing `CONNECTION_SETTINGS_SELECT`).
2. **Best-effort remote cleanup** (never throw; failures must not block local cleanup):
   - If credentials decrypt successfully and `provider_base_url` is present:
     - Delete the sidebar widget + integration via the existing `deleteGorgiasSidebarWidget`
       helper in `registerSidebarWidget.ts` (it's currently private — export it, or add a thin
       exported wrapper `deregisterGorgiasSidebarWidget(providerBaseUrl, credentials, {integrationId, widgetId})`).
       Use the sidebar scope's `integration_id`/`widget_id`.
     - Delete the webhook integration via `deleteGorgiasSupportWebhook` (Change 1.1) using the
       webhook scope's `integration_id`.
   - Wrap each in try/catch and swallow — mirror the best-effort pattern already in
     `deleteGorgiasSidebarWidget` (line 134).
3. **Local wipe** — single `.update()` on the row (extend the existing update at line 575):
   ```ts
   .update({
     status: 'disabled',
     access_token_encrypted: null,
     webhook_secret_hash: null,
     webhook_secret_created_at: null,
     webhook_secret_rotated_at: null,
     scopes: [],
     last_error: null,
     updated_at: now,
   })
   ```
   This is the "clean break": credentials gone, secret gone, Gorgias-side resources gone. We keep
   the **row** (status `disabled`) for audit history rather than hard-deleting — this preserves
   the `logAction` audit trail reference and avoids orphaning. **Do not** hard-delete the row.

   > If the product owner instead wants a full row delete, that's a one-line swap to
   > `.delete().eq('id', ...).eq('merchant_id', ...)` — but the default and recommendation is the
   > wipe-in-place above. Flag this choice; don't silently hard-delete.

4. Return the updated connection settings (creds/secret now show as not-configured in the UI,
   which is correct).

### 2.2 Reconnect after clean disconnect

After the wipe, the row exists with `status='disabled'` and no credentials. The existing
reconnect form (`GorgiasSupportSyncClient.tsx:679-707`) already handles `disabled` state and
re-submits credentials, which goes through the **update** path
(`updateMerchantGorgiasSupportConnectionMetadata`). **Problem:** the update path does not
register the webhook (Change 1.4e), so a reconnect after a clean disconnect would re-register the
sidebar but **not** the webhook.

**Fix:** make reconnect-from-disabled behave like a fresh create. Simplest reliable option: in
the POST route (`app/api/settings/gorgias/support-connection/route.ts:64`), when the existing
connection's `status === 'disabled'` (i.e. credentials were wiped), route to
`createMerchantGorgiasSupportConnection` instead of the update path. But `create` throws
`gorgias_connection_already_exists` when a row exists (line 396). So either:
- (Preferred) Add a `reactivate` branch: a dedicated function that regenerates the secret +
  registers sidebar + webhook + writes creds on the existing row. Reuse the create logic but skip
  the "already exists" guard. Factor the create body into a shared helper used by both.
- Or relax the create guard to allow proceeding when the existing row is `disabled` with null
  credentials.

Document whichever you pick. The acceptance test (§4) covers this path — it must pass.

---

## 3. Env / schema check

- No new env vars required. The webhook URL is built from `NEXT_PUBLIC_APP_URL`
  (`buildGorgiasSupportWebhookUrl`, `settingsConnection.ts:114`). Confirm `NEXT_PUBLIC_APP_URL`
  is correct in the target environment — a wrong value mis-registers every merchant's webhook.
- No DB migration required. `scopes` (jsonb), `access_token_encrypted`, and the
  `webhook_secret_*` columns all already exist (see
  `supabase/migrations/20260528140000_support_case_intake.sql` and
  `20260528160000_support_provider_webhook_secrets.sql`). We are only writing different values.
- `upsertSupportProviderConnection` in `lib/support/intake/store.ts` already accepts `scopes` and
  `access_token_encrypted`. Confirm it passes `null` through for clearing (Change 2). If it
  strips `null`/`undefined`, the disconnect wipe uses a direct `.update()` anyway (Change 2.1),
  so this is fine — but verify.

---

## 4. Tests to add / update

Existing tests live in `tests/api/gorgiasSupportConnectionSettings.test.ts`,
`tests/api/gorgiasSupportWebhook.test.ts`, and `tests/support/gorgias-sync-walkthrough.spec.ts`.
Mock Gorgias REST calls (the existing tests already mock `fetch` for the sidebar API — follow
that style; do **not** hit real Gorgias).

Add coverage for:

1. **Auto-register success:** create connection with a resolvable domain → asserts
   `registerGorgiasSupportWebhook` POSTed `/api/integrations` with method `POST`, the secret
   header, and `x-gorgias-domain`; response has `support_webhook_auto_registered: true`; no
   ephemeral secret panel triggered.
2. **Auto-register fallback:** Gorgias `/integrations` POST for the webhook fails (non-auth) →
   connection still persists, `support_webhook_auto_registered: false`, one-time secret returned
   (manual fallback preserved).
3. **Auth failure still hard-fails create** (existing behavior unchanged — sidebar auth error
   throws `GorgiasCredentialsError`).
4. **Inbound webhook resolves by domain:** a POST to `/api/gorgias/support-webhook` with only the
   `x-gorgias-domain` header (no `x-gorgias-account-id`) + correct secret resolves to the merchant
   and ingests. (Confirms the auto-registered header path works end-to-end — this is the
   acceptance-critical test the audit flagged.)
5. **Rotate re-registers webhook:** rotate-secret deletes the old webhook integration and creates
   a new one with the new secret; old secret stops validating, new secret validates.
6. **Clean disconnect:** disable → asserts DELETE called for sidebar widget+integration and
   webhook integration; row afterward has null `access_token_encrypted`, null
   `webhook_secret_hash`, empty `scopes`, status `disabled`; an inbound webhook with the old
   secret now fails (401) because the hash is gone and the connection is no longer `active`.
7. **Reconnect after clean disconnect** (Change 2.2): re-submit creds on a wiped/disabled row →
   sidebar AND webhook both re-registered; webhook secret regenerated.

Update the walkthrough spec so it no longer asserts the manual 6-step panel on the happy path.

---

## 5. Gorgias API contract to verify (DO THIS BEFORE CODING)

The whole of Change 1 assumes that a Gorgias **HTTP Integration** with `http.method='POST'` and
`http.triggers` will, on its own, POST ticket events to our URL. Verify this is true:

- The manual UI steps (`GorgiasSupportSyncClient.tsx:336-361`) only ever create an HTTP
  Integration (no Rule), which strongly implies the Integration fires by itself. Treat that as
  the expected design.
- Confirm against current Gorgias REST API docs (`POST /api/integrations`, `type: http`, the
  `http.triggers` keys, headers shape) and/or a real test account: create the integration via
  API, fire a test ticket, confirm our `/api/gorgias/support-webhook` receives a POST with the
  ticket payload and both headers.
- **If** Gorgias requires a companion **Rule** to actually dispatch on triggers: also create one
  via `POST /api/rules` referencing the integration, store its id in a `rule_id` field on the
  webhook scope entry, and delete it in `deleteGorgiasSupportWebhook` / disconnect. Add this only
  if verification proves it's needed — don't speculatively build it.
- Confirm the default POST payload Gorgias sends includes the ticket object and that
  `extractGorgiasAccountIdentity` (`accountIdentity.ts:76`) can read an identifier from it (we
  also send `x-gorgias-domain`, so domain resolution is the primary path regardless).

If verification contradicts any assumption here, **stop and report** rather than forcing the
design.

---

## 6. Explicit non-goals (do NOT do these)

- ❌ **No OAuth.** No authorize/callback/state/code-exchange/refresh. API-key auth stays.
- ❌ Do not change any scoring/weighting/matching algorithm (`CLAUDE.md` rule 1). The
  `matchGorgiasSupportConnection` logic is read-only here — you rely on it, you don't change it.
- ❌ No `as any`, no `eslint-disable` (`CLAUDE.md` rules 2-3). Type the Gorgias responses.
- ❌ Do not hard-delete the connection row on disconnect (wipe-in-place; see 2.1) unless the
  product owner explicitly requests a hard delete.
- ❌ Do not remove the manual-secret panel code — it's the graceful fallback. Just stop showing
  it on the auto-registered happy path.

---

## 7. Definition of done

- [ ] Connecting Gorgias with a resolvable domain auto-registers BOTH the sidebar widget and the
      inbound ticket webhook; the merchant performs **zero** manual Gorgias steps.
- [ ] If webhook auto-registration fails, the merchant falls back to the one-time secret + manual
      steps (no regression).
- [ ] An inbound ticket webhook resolves to the merchant via the `x-gorgias-domain` header alone.
- [ ] Rotating the secret updates the Gorgias-side webhook integration with the new secret.
- [ ] "Disable connection" deregisters the sidebar widget + webhook integration in Gorgias and
      wipes credentials, webhook secret hash, and scopes locally (clean break).
- [ ] Reconnecting after a clean disconnect re-registers sidebar + webhook and regenerates the
      secret.
- [ ] All new + existing tests pass; lint/typecheck clean; no `as any` / `eslint-disable`.
- [ ] UI copy no longer tells merchants to do manual webhook setup on the happy path.
```
