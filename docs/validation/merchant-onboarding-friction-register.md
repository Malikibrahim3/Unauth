# Merchant onboarding friction register

Updated: 2026-07-15 (Europe/London)

| Step | Provider/scope | Required owner action | Why it remains | Avoidable | Outcome |
|---|---|---|---|---:|---|
| Create account and workspace | Any | Enter ordinary signup and profile details | Establishes user and tenant ownership | No | Server-owned bootstrap now creates the merchant membership; clean Merchant C passed without database repair. |
| Choose first connector | Any | Select the desired supported connector | Merchant intent | No | Completed profiles are no longer forced through Shopify; ShipBob-first passed live. |
| Authorize store | Shopify | Sign in and approve the platform application | Provider-owned OAuth consent | No | Verified reusable flow with tenant-bound, one-time state. |
| Authorize fulfilment account | ShipBob | Sign in and approve the platform application | Provider-owned OAuth consent | No | Verified reusable flow for Merchant A and clean Merchant C. |
| Select channel | ShipBob | Select a channel when discovery returns several | Prevents silent attachment to the wrong provider account | No | Explicit expiring selection is implemented and passed live. |
| Connect carrier | UPS | Enter the merchant's provider-issued client credentials and environment | UPS uses merchant-owned credentials in this product | No | Encrypted per connection and validated against production OAuth. |
| Connect carrier | FedEx | Enter the merchant's provider-issued client credentials and environment | FedEx uses merchant-owned credentials in this product | No | Encrypted per connection and validated against sandbox OAuth. |
| Connect helpdesk | Gorgias | Enter account and API credentials | Provider credential model | No | Excluded from this completion pass by user instruction. |
| Use legacy helpdesk | Zendesk/Freshdesk | Use founder-assisted settings | Not in the primary catalogue | Yes | Truthfully classified as founder-assisted pending a product decision. |
| Use backend-only commerce | BigCommerce/WooCommerce | Use unavailable backend routes | No normal merchant settings flow | Yes | Truthfully classified as unavailable for normal onboarding. |
| Configure deployment | Any merchant connector | Add merchant IDs, account IDs, channels, or merchant tokens to Vercel | Hidden tenant default | Yes | Prohibited. Eight obsolete variables were removed from Production and Preview. |
| Prepare source rows | Any | Ask an administrator to insert connection/source records | Missing onboarding | Yes | Prohibited. Clean Merchant C created every row through normal product flows. |
| Disconnect/reconnect | OAuth providers | Reapprove provider consent after revocation where required | Provider security lifecycle | No | Shopify and ShipBob passed live; ShipBob retained history and isolated the other tenant. |
| Supply a real correlated order | Shopify/ShipBob/carriers | Use a merchant order present in every provider | Needed only for same-order cross-provider business proof | No | Not available. Official carrier samples validate adapters but not one-order correlation. |
| Rotate test credentials | Test accounts | Rotate credentials after testing | Operational preference, not architecture evidence | No | Not performed, per user instruction that these are non-critical test accounts. |

No merchant onboarding step requires a database edit or merchant-scoped deployment variable. The unavoidable steps are identity/profile input, provider consent, explicit account/channel selection, and entry of merchant-owned carrier credentials.
