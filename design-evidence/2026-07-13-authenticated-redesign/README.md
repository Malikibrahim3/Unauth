# Authenticated redesign visual evidence

Captured: 2026-07-13 from the safe E2E merchant against the optimized production build.

Account email, customer email, and customer-name fields that could identify a person are masked in the committed images. Operational records shown by the safe E2E merchant are synthetic test data. The capture runner is `npm run evidence:redesign`.

| Evidence | Surface |
|---|---|
| `01-shell-overview.png` | Shell, navigation, Overview, chart/empty chart states |
| `02-work.png` | Work queue, view tabs, dense table |
| `03-payout-control.png` | Payout Control queue |
| `04-case-detail.png` | Case review workspace and decision rail |
| `05-exceptions.png` | Integration exceptions view |
| `06-losses.png` | Loss ledger |
| `07-recovery.png` | Recovery board |
| `08-customers.png` | Customer directory with identifying cells masked |
| `09-customer-detail.png` | Customer detail with identifying heading/email masked |
| `10-rules.png` | Rules list/builder entry |
| `11-flows.png` | Flows list/builder entry |
| `12-reports.png` | Financial reporting and drill-downs |
| `13-integrations.png` | Compact grouped connection tables |
| `14-settings.png` | Settings rail and account form |
| `15-notifications.png` | Notification inbox |
| `16-setup-progress.png` | Authenticated setup/backfill state with masked address |
| `17-object-detail.png` | Related operational object/error-safe detail |
| `18-customer-drawer.png` | Loaded customer preview drawer with identity masked |
| `19-command-modal.png` | Global command modal |
| `20-empty-state.png` | Filtered, actionable empty state |
| `21-error-state.png` | Authenticated not-found/error-safe state |
| `22-tablet-overview.png` | Tablet Overview |
| `23-mobile-overview.png` | Critical mobile Overview |
| `24-mobile-navigation.png` | Critical mobile navigation overlay |

The completed merchant correctly redirects `/onboarding` to its permitted default route. The incomplete-setup presentation is covered by the shared `.ua-auth-surface` implementation and setup-progress evidence without mutating merchant setup state for a screenshot.
