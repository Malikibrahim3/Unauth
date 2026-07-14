# Merchant onboarding friction register

Updated: 2026-07-14 (Europe/London)

| Step | Provider | Merchant action | Why required | Avoidable | Fix or accepted limitation |
|---|---|---|---|---:|---|
| Authorize store | Shopify | Sign in to Shopify and approve the platform app | Provider-owned consent | No | Accepted owner-only provider step. |
| Select workspace | Shopify | Choose the intended Unauth workspace before starting OAuth | Prevent cross-workspace attachment | No | Repair callback state so the choice is protected and retained. |
| Authorize fulfilment account | ShipBob | Sign in and approve the platform app | Provider-owned consent | No | Accepted owner-only provider step. |
| Select channel | ShipBob | Select a channel when the token exposes several | Prevent silent attachment to the wrong source account | No | Replace first-channel behavior with an explicit selection step. |
| Connect carrier | UPS | Enter provider-issued client ID/secret and, where needed, account number/environment | UPS credentials are merchant-owned and no platform OAuth flow is implemented | No | Keep encrypted per connection; persist environment/account metadata and validate immediately. |
| Connect carrier | FedEx | Enter provider-issued client ID/secret and, where needed, account number/environment | FedEx credentials are merchant-owned and no platform OAuth flow is implemented | No | Keep encrypted per connection; persist environment/account metadata and validate immediately. |
| Connect support desk | Gorgias | Enter account subdomain and API credentials | Provider credential model | No | Existing self-service form; verify scoped discovery/import/webhook flow. |
| Connect support desk | Zendesk/Freshdesk | Use a legacy provider settings surface | Not represented in the primary catalogue | Yes | Either register as supported connectors or label/remove from merchant-ready claims. |
| Connect commerce store | BigCommerce/WooCommerce | Use backend routes without a reachable normal settings flow | Merchant UI redirects away | Yes | Restore reusable onboarding or classify as unsupported. No database insertion is acceptable. |
| Configure deployment | Any merchant connector | Ask an administrator to add a merchant ID, account ID, channel ID, or merchant token to Vercel | Hidden tenant default | Yes | Prohibited. Remove application fallbacks; only platform OAuth app credentials may be shared deployment configuration. |
| Prepare new merchant | Any | Ask an administrator to insert connection/source rows manually | Missing onboarding path | Yes | Prohibited. Normal connect/discovery must create all owned records. |
| Reuse controlled ShipBob account | ShipBob | Keep the existing merchant-owned connection for read-only proof, or authorize through the canonical OAuth flow for a reconnect test | The controlled account already has a valid merchant-scoped encrypted credential | No | Never expose or convert the credential into deployment configuration; the reusable OAuth path remains the normal onboarding path. |
| Validate current UPS test account | UPS | Enter the provider-issued client secret in the visible merchant-scoped connect form | Secret entry is owner-only | No | Safari verified the reusable form and existing developer application without opening its credentials. Pause for this one action only when live carrier validation begins. |
| Validate current FedEx test account | FedEx | Sign back in to the developer portal, then enter provider-issued credentials in the merchant-scoped connect form | The developer session timed out and login/secret entry are owner-only | No | Safari verified the reusable form; request login first and secret entry only after the session is restored. |
| Remove legacy deployment credentials | Vercel | Authorize deletion after the replacement production build is verified | Secret values cannot be recovered by the programme and the serving revision must first be proven independent | No | Remove the legacy Gorgias, ShipBob, intake-merchant, and AfterShip variables from Production and Preview without viewing their values. |
