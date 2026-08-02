# PC-00 preflight — authorised fixture validated

- Initial run: `2026-07-31T23:27:22Z`
- Completion run: `2026-08-01` (`Europe/London`)
- Commit: `bc04901cecbe8da9a6cd1f55b04c419ba28d8058`
- Node: `v22.14.0`
- Next: `16.2.7`
- Playwright: `1.59.1`
- Chromium: revision `1217` (`147.0.7727.15`)
- Evidence locale / timezone / DPR: `en-GB` / `Europe/London` / `2`
- Deterministic clock: `2026-07-26T12:00:00.000Z`
- Visual QA server: development, isolated dist directory, `http://localhost:3300`
- Fixture: bounded marketing story, merchant fixture prefix `aa000000`, 773 validated records

## Authority and fixture resolution

The first validation found a stopped local stack. After the stack was started,
the validator reported drift (`merchant_users` expected 4/found 5 and
`domain_events` expected 2/found 31). Malik then explicitly authorised the
existing loopback fixture, all implementation work, and completion of the
programme. `npm run seed:marketing` was run against that local fixture and
`npm run validate:marketing-seed` passed with 773 records. This was a deliberate
local data reset under that approval; it is not represented as a no-mutation
audit.

The authenticated browser pass used only the deterministic local E2E auth
endpoint and read-only route navigation. It did not open provider verification
controls or submit product mutations. The temporary evidence server used
`.next-premium-craft-dev` and was stopped after QA; that generated directory
was removed.

## Dirty tree

The tree was materially dirty before this pass: 314 tracked status entries and
169 untracked entries (483 total). Existing changes were preserved. This pass
did not stage, commit, reset, or revert user work.

## Preflight and completion gates

| Command | Result |
| --- | --- |
| `node scripts/visual-rebuild/check-coverage-ledger.mjs` | pass — 65 pages, 7 layouts, 95 route states, 53 named nested views, 21 stateful owners, 4 embedded surfaces, 34 additional visual owners, 279 required entries |
| `npm run verify:decision-ledger` | pass — 24 checks |
| `npm run lint:authenticated-design` | pass — 506 files, zero ratchets |
| `npm run test:decision-ledger:components` | pass — 27 suites, 128 tests |
| `npx tsc --noEmit --incremental false` | pass |
| `npm run lint` | pass |
| `npm run verify:ui-parity` | pass — 209 committed destinations represented |
| `npm run validate:marketing-seed` | pass — 773 deterministic records |
| Impeccable detector on changed UI targets | one advisory found and resolved by replacing a literal 22px KPI value with the canonical KPI type role |

## Browser evidence

One bounded desktop/mobile verification batch was run against the deterministic
fixture:

- `/dashboard` at `1440x900` and `390x844`: correct headings and controls,
  zero document-level horizontal overflow;
- `/claims` at `1440x900`: populated registry/detail composition, zero
  document-level horizontal overflow;
- `/dev/design-system` at `1440x900`: qualified status fixture present, zero
  document-level horizontal overflow, and no captured console warnings/errors.

The temporary viewport override was reset and all QA tabs were released after
the run.
