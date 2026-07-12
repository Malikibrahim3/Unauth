# Phase 12 defect register

Application defects and validation-infrastructure defects are intentionally separate. Obsolete tests are not classified as application failures.

## Application defects

| ID | Severity | Workflow | Reproduction / actual behavior | Expected behavior and impact | Fix status | Tests added | Remaining risk |
|---|---|---|---|---|---|---|---|
| APP-VAL-001 | High | Reconciliation | Force any detector to throw; sweep logged the error but returned an apparently successful result | Partial detector failure must be named, counted, observable, and fail the cron request; otherwise missed changes can be silently ignored | Fixed | Detector continuation/failure test; four cron-route cases; direct smoke | Deployed monitoring still unverified |
| APP-VAL-002 | High | Integration readiness | Make verify endpoint fail/inconclusive or inspect stale canonical health; gate still showed Shopify/Gorgias ready | Readiness must fail closed and require current, healthy canonical connections; stale data could mislead merchant decisions | Fixed | Connection-status and gate-readiness tests; Playwright current UI assertion | External recovery of credentials remains operational |
| APP-VAL-003 | Medium | Type/build contract | Run standalone `tsc --noEmit` with current Next.js generated types; two route contexts rejected Promise-or-object params | Route handlers/pages must match Next.js 16 async param contracts; degraded CI/type confidence | Fixed | Updated affected API test; full typecheck/build | None known |
| APP-VAL-004 | Medium | Case customer context | Open a source-linked case and inspect server requests; the workbench passed canonical `identity_id` to an API that requires merchant `source_customers.id`, producing a 404 and silently dropping customer/order context | Resolve the source customer from the case order while retaining the canonical identity for case queries; missing context creates avoidable investigator work | Fixed | Two source-customer resolution tests; current case/browser regression | Identity-less or order-less cases intentionally omit the customer fetch |
| APP-VAL-005 | High | Audit integrity | Open the repaired customer context and inspect runtime logs; `view_customer` attempted to insert `metadata = null` into live `user_action_log.metadata`, which is non-null, so the audit event was lost | Callers that omit optional metadata must write `{}` and preserve the immutable audit event | Fixed | Two audit-logger regression tests; live browser request verification | Fire-and-forget delivery still depends on database availability |

## Validation-infrastructure and validation-data defects

| ID | Severity | Workflow | Reproduction / actual behavior | Expected behavior and impact | Fix status | Tests added | Remaining risk |
|---|---|---|---|---|---|---|---|
| INFRA-VAL-001 | High | Playwright setup | Original global setup wrote removed merchant columns and targeted obsolete UI/workflows | E2E must authenticate a safe current merchant and validate the current product | Fixed/replaced | 34 current desktop/tablet checks | Legacy specs remain in repo but are not release scripts |
| INFRA-VAL-002 | Medium | Test-account cleanup | Setup failure after auth-user creation could leave an orphan; one orphan was found | Persist cleanup metadata early and remove merchant/user on failure/teardown | Fixed; orphan removed | Setup/teardown exercised by E2E | Old unused hook is retained only for compatibility |
| INFRA-VAL-003 | Medium | Generated DB types | Fresh generator output differed by 591 lines | Checked-in types must match linked schema or validation compiles against stale contracts | Fixed | Generator comparison + typecheck | Depends on linked schema availability |
| INFRA-VAL-004 | Low | Playwright reporting | Relative reporter path resolved to `tests/tests/reports`; stale generated reports were committed | Reports belong under ignored `tests/reports` and must not create tracked churn | Fixed | Critical suite rerun after correction | None known |
| INFRA-VAL-005 | Low | Replacement E2E locators | First current-suite run hit strict-locator ambiguity where duplicate visible text existed | Locators must be scoped to current semantic regions | Fixed | Full 34-test rerun | None known |
| DATA-VAL-001 | High validation-data issue | Recovery proof | Retained `verify_seed` recovery has no loss, uses GBP on a USD case, and was inserted outside normal invariants | Validation data used for financial proof must be created through current services and reconcile source/case/loss/recovery currencies | Retained and excluded from proof | Read-only trace documented | Blocks use of this merchant for final recovery evidence |

No critical defect was discovered. All application High defects found in this pass are fixed. `DATA-VAL-001` is not classified as an application failure because it is intentional validation data that bypassed application services.
