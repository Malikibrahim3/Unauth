# Runtime troubleshooting and approved Supabase repair

The configured app and Supabase CLI both target project `lquvbikyvmbjbfffrlky`.
The user approved these five migrations. They passed a rollback-only transaction test, then were applied and recorded atomically in migration history:

- `20260823100000_mr0_commercial_authority.sql`: billing intents and usage receipts; updates the shared plan catalogue.
- `20260823130000_mr3_work_and_external_actions.sql`: canonical work queue and audited external actions.
- `20260823160000_mr4_recovery_money_truth.sql`: observed provider credits, settlement transitions, reconciliation and financial aggregates.
- `20260823190000_mr5_merchant_administration.sql`: API scopes and administration controls.
- `20260902120000_loss_desk_durable_capabilities.sql`: persisted period closure, report snapshots and loss-desk operations.

The Asterlane seed and subsequent independent `--verify-only` run now pass. The database repair generated observed and matched synthetic provider credits through the canonical RPCs. The missing scale-one write-off entries were appended, and the featured operational deadline was aligned with the existing fixture. Historical records and immutable ledger entries were retained. The login password is unchanged.

Only the five approved migrations were applied. An unrestricted `supabase db push` was not run; older local and remote migration identifiers still diverge. The five schema changes affect all project workspaces, while demo data updates were scoped to the synthetic Asterlane tenant.

## Completed local repairs

- Shared shell fills `100dvh`; content and navigation scroll within the browser window.
- Full navigation rows and icon-rail destinations are canonical Next links.
- Compact desktop navigation can open the complete menu; Escape dismisses it.
- Sidebar labels show pending navigation feedback while a cold route loads.
- Provider-setup step navigation and its progress panel remain usable in short windows.
- Cases and Work replace complete reference text nodes once, preventing runtime counts and amounts from being rewritten by later digit substitutions.
- Removed unsupported reference-only customer/queue summaries from the shared chrome.
- Demo seeding preserves historical records, reconciles customer aggregates against persisted orders, uses stable ticket identities, and waits for actual completion before printing success.

## Current evidence and limits

- TypeScript: pass. ESLint for the changed UI files: pass.
- 28 focused tests passed across shell permissions/runtime/readiness and text-replacement regression coverage.
- Browser: sidebar Customers navigation, rail Cases navigation, compact menu, and Shopify provider-to-permissions step transition confirmed.
- Browser: at 1280x600 the shell is 600px tall; customer scroll position reaches 184px in a 209px viewport over 392px content. Setup permissions has 707px content in a 458px scroll region.
- Existing demo login succeeds as `demo@asterlane-demo.test`; password unchanged.
- Read-back confirms all 50,489 current fixture orders plus 120 retained historical orders; 489 current cases plus 120 historical cases; 6,595 current evidence rows plus 1,680 historical rows. 23 current work tasks were persisted. Historical rows were retained, not deleted to force counts to match.
- Independent read-only demo verification passes: August has 218 entries, £41,208.42 gross exposure, £18,940.50 observed and matched recovery, £22,267.92 absorbed, £2,412.00 written off, and £19,855.92 net unrecovered. The 23 current work items total £10,006.00. Matched credits are not presented as reconciled settlement.
- Read-only preflight: zero existing API keys violate the proposed 1–120 rate-limit constraint. The approved schema changes and their migration history records were committed together.
- The local development server was restarted after the freeze. Cold Next.js compilations still take time; warm navigation and visible loading feedback were checked. No production build or deployment claim is made.

## Additional runtime repairs verified after schema application

- Cases no longer sends a 23,859-character request containing every case ID. Bounded 100-ID batches restore its opened/closed flow data; the populated page now renders without the header-overflow failure.
- Work actions describe their actual behavior: review opens the linked object; snooze is only offered for permitted task actions. The header distinguishes tasks from the exceptions included in the list.
- Recovery no longer discards cards after the fifth entry. Every loaded card renders inside a scrollable column. Previous/Next preserve stage, currency, and search scope; browser navigation reached page 2 of 15 with different records.
- Recovery scroll was physically exercised: 2,584px of content in a 425px viewport reached scrollTop 1,440px.
- Recovery money cards use the shown recovery records and explicitly label their page scope. Customer payout amounts are not used as received provider recovery, and reconciliation requires the reconciled state. Regression tests cover paging, all loaded cards, and distinct received/reconciled amounts.
- Remaining boundary: this is targeted runtime and demo repair, not certification of every route or provider integration. Existing unsupported filters remain disabled or report their limitation. Historical demo cases and exceptions remain visible where the query includes them.

- Reconciliation retains unknown-currency exceptions returned by the server instead of hiding them behind an inferred GBP filter. Browser navigation reached page 2 of 45, preserving August period context. Its former false empty-state display is covered by a regression test.
