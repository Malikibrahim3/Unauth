# Authenticated final craft evidence

Captured by `tests/current/authenticated-redesign-evidence.spec.ts` on 2026-07-14 with the seeded authenticated Playwright storage state. Screenshots mask account/customer identifiers where they appear.

| File | Route/state | Viewport |
|---|---|---:|
| `01-shell-overview.png` | `/dashboard` light overview | 1440×900 |
| `02-work.png` | `/work` work queue | 1440×900 |
| `03-payout-control.png` | `/claims` payout control | 1440×900 |
| `04-case-detail.png` | First available `/claims/[id]` case detail | 1440×900 |
| `05-exceptions.png` | `/work?view=integration-exceptions` | 1440×900 |
| `06-losses.png` | `/losses` loss ledger | 1440×900 |
| `07-recovery.png` | `/recoveries` recovery queue | 1440×900 |
| `08-customers.png` | `/customers` directory | 1440×900 |
| `09-customer-detail.png` | First customer full profile | 1440×900 |
| `10-rules.png` | `/rules` rules index | 1440×900 |
| `11-flows.png` | `/flows` flows index | 1440×900 |
| `12-reports.png` | `/reports` intelligence reports | 1440×900 |
| `13-integrations.png` | `/integrations` connection catalogue | 1440×900 |
| `14-settings.png` | `/settings/account` | 1440×900 |
| `15-notifications.png` | `/notifications` notification centre | 1440×900 |
| `16-setup-progress.png` | `/audit-running?email=masked@example.test` | 1440×900 |
| `17-object-detail.png` | First order/shipment/refund/return link, or controlled fallback | 1440×900 |
| `18-customer-drawer.png` | Customer preview drawer opened from `/customers` | 1440×900 |
| `19-command-modal.png` | Command palette opened from `/dashboard` | 1440×900 |
| `20-empty-state.png` | `/customers?q=ZZZ_NO_MATCH_REDESIGN_EVIDENCE` | 1440×900 |
| `21-error-state.png` | `/integrations/example` | 1440×900 |
| `22-tablet-overview.png` | `/dashboard` | 1024×900 |
| `23-mobile-overview.png` | `/dashboard` | 390×844 |
| `24-mobile-navigation.png` | `/dashboard?evidence=mobile-nav`, navigation open | 390×844 |
| `25-laptop-overview.png` | `/dashboard` | 1280×900 |
| `26-dark-overview.png` | `/dashboard` after selecting Dark in Settings | 1440×900 |

This is visual evidence for the listed routes and states, not a claim that all 66 authenticated route files were manually walked at every target width. See `docs/design/authenticated-final-browser-validation.md` and `docs/design/authenticated-responsive-validation.md`.
