# Gorgias sidebar widget — template refresh (internal)

Use this when deployed unlock links or preview copy change and merchants still see an old Gorgias HTTP card.

## Where the helpers live

| Helper | File | What it does |
|--------|------|----------------|
| `buildGorgiasSidebarWidgetTemplate()` | `lib/support/gorgias/registerSidebarWidget.ts` | Canonical widget JSON template (three unlock links + field layout). |
| `refreshGorgiasSidebarWidgetTemplate()` | same | `PUT /widgets/{id}` with the latest template. |
| `refreshGorgiasSidebarWidgetIntegrationUrl()` | same | Rebuilds HTTP integration URL (cache-bust `_cb`, ticket placeholders). |
| `refreshMerchantGorgiasSidebarWidgetUrlBestEffort()` | `lib/support/gorgias/settingsConnection.ts` | Runs both refreshes for an active merchant connection. |

Unlock URLs are built in `lib/gorgias/widgetUnlockUrls.ts` and returned from `GET /api/gorgias/widget` when `ticket_id`, `order_id`, or `claimId` is present.

## Environment variables

- `NEXT_PUBLIC_APP_URL` — base URL embedded in widget HTTP integration and unlock links.
- `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_URL` — required for server routes and scripts that load merchant Gorgias credentials from `support_provider_connections`.
- Merchant Gorgias API credentials are stored encrypted on the connection row (not in env).

## How to refresh (no dedicated CLI today)

**Automatic (preferred):** Open **Settings → Integrations → Gorgias** while connected. `refreshMerchantGorgiasSidebarWidgetUrlBestEffort()` runs on settings load and updates the remote widget template + integration URL when `sidebar_integration_id` and `sidebar_widget_id` are set.

**Reconnect:** Disable and re-enable the Gorgias support connection (or complete a fresh connect flow). Registration calls `registerGorgiasSidebarWidget()` with the current template.

**Gap:** There is no `package.json` script that refreshes all merchants. To refresh one merchant manually you need Gorgias API access for that shop (from the connection row) and either trigger settings load or call the refresh helpers from a one-off script patterned on `scripts/inspect-widget-integration.ts`.

## Verify the live template

1. **Read-only inspect** (redacts tokens):

   ```bash
   npx ts-node --project tsconfig.scripts.json --transpile-only -r tsconfig-paths/register scripts/inspect-widget-integration.ts
   ```

   Edit `MERCHANT_ID` and `WIDGET_INTEGRATION_ID` in that script for the target shop. Confirm the HTTP integration URL includes `ticket_id={{ticket.id}}` and points at `/api/gorgias/widget`.

2. **Widget JSON** (with a valid widget token and ticket scope):

   ```bash
   curl -sS "https://<app>/api/gorgias/widget?widget_token=<token>&email=test@example.com&ticket_id=123" | jq '{basic_unlock_url, full_unlock_url, evidence_unlock_url, identity, claims}'
   ```

   Expect:

   - `basic_unlock_url` contains `contextType=basic_context`
   - `full_unlock_url` contains `contextType=full_context`
   - `evidence_unlock_url` contains `contextType=evidence_summary`
   - Preview fields are credit-gated copy (no order/claim counts) when `ticket_id` is set

3. **Gorgias UI:** Open a ticket sidebar → use the three unlock links → confirm each opens `/api/gorgias/widget/unlock/action` in a new tab.

## Rollback if a merchant widget breaks

1. In Gorgias, disable or delete the broken HTTP integration/widget if the sidebar errors block agents.
2. In Unauth, reconnect Gorgias from **Settings → Integrations** (re-registers widget + webhook).
3. If only the template is wrong but the integration still loads, redeploy the previous app version and open Gorgias settings once to push the prior `buildGorgiasSidebarWidgetTemplate()` output.
4. Use `scripts/inspect-widget-integration.ts` to confirm `http.url` and widget `template` before re-enabling for agents.

Do not paste live widget tokens or API keys into tickets or docs.
