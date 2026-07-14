# Authenticated craft-completion evidence

Captured on 14 July 2026 from the safe local E2E merchant with Playwright at controlled CSS viewports. Customer names, email addresses, and customer headings are masked. The capture command is `npm run evidence:redesign`; the implementation is `tests/current/authenticated-redesign-evidence.spec.ts`.

## Populated product surfaces

| Evidence | Surface / state | Viewport |
|---|---|---|
| `01-shell-overview.png` | Overview, mixed GBP/USD, empty and populated reporting states | 1440×900 |
| `02-work.png` | Work queue with counted views and populated rows | 1440×900 |
| `03-payout-control.png` | Payout Control queue | 1440×900 |
| `04-case-detail.png` | Populated case, evidence, recommendation, payout exposure and decision rail | 1440×900 |
| `05-exceptions.png` | Integration-exception Work view | 1440×900 |
| `06-losses.png` | Loss ledger | 1440×900 |
| `07-recovery.png` | Recovery workspace | 1440×900 |
| `08-customers.png` | Customer directory | 1440×900 |
| `09-customer-detail.png` | Customer profile | 1440×900 |
| `10-rules.png` | Rules list | 1440×900 |
| `11-flows.png` | Flows list | 1440×900 |
| `12-reports.png` | Reports with the reconciled chart contract | 1440×900 |
| `13-integrations.png` | Integration health and capability catalogue | 1440×900 |
| `14-settings.png` | Account settings and appearance control | 1440×900 |
| `15-notifications.png` | Notification centre | 1440×900 |
| `16-setup-progress.png` | Asynchronous setup state | 1440×900 |
| `17-object-detail.png` | Connected-object detail | 1440×900 |

## Overlays, states and responsive variants

| Evidence | Surface / state | Viewport |
|---|---|---|
| `18-customer-drawer.png` | Loaded customer drawer | 1440×900 |
| `19-command-modal.png` | Command palette | 1440×900 |
| `20-empty-state.png` | Filtered customer empty state | 1440×900 |
| `21-error-state.png` | Unknown integration error state | 1440×900 |
| `22-tablet-overview.png` | Tablet Overview | 1024×900 |
| `23-mobile-overview.png` | Mobile Overview | 390×844 |
| `24-mobile-navigation.png` | Mobile navigation overlay | 390×844 |
| `25-laptop-overview.png` | Laptop Overview | 1280×900 |
| `26-dark-overview.png` | Overview after selecting the real Dark appearance control | 1440×900 |

The separate authenticated route-matrix run verified all 67 manifest route patterns and seeded real case/customer/loss/recovery/rule/flow/integration destinations at 1440×900, 1024×900, and 390×844. `16-setup-progress.png` provides the controlled asynchronous state; the semantic route-transition skeleton was additionally verified during the in-app browser walkthrough, where the transition duration was long enough to inspect it without test-only delay injection.
