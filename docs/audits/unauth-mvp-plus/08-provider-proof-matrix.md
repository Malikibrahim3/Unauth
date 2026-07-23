# 08 — Provider Proof Matrix

**Verification date:** 2026-07-21
**Build under review:** `8f943e03ae5002506b6efa33f61f78ed7b0a47b8` plus the uncommitted Task 1 / Task 1A worktree
**Outcome:** truthful downgrade complete; **no provider currently derives to Live**
**Release requirements:** REL-001 remains Partial, REL-010 is not claimed globally satisfied, and QAT-005 remains **NOT PASS**

## Evidence contract

`IntegrationProvider.lifecycle` is the canonical ten-capability maturity model. Each capability records two independent facts:

- applicability: `applicable` or `not_applicable`;
- highest evidence achieved: `unavailable`, `implemented`, `automated_tested`, or `controlled_runtime_verified`.

These levels are not aliases. Located source is not a passing test, a passing test is not a controlled runtime run, and a current merchant connection health result is not build-maturity proof.

`deriveProviderDisplayStage()` applies these rules:

1. `slot_only` is always **Planned** and remains non-connectable.
2. **Live** requires every applicable capability to have a complete, passing controlled-runtime record containing environment, controlled account, date, build, scenario, result, limitations, and an artifact reference.
3. Controlled proof older than 90 days, dated in the future, failed, incomplete, or missing its artifact is invalid.
4. **Beta** requires at least automated evidence for an applicable ongoing webhook or incremental-pull path, without complete controlled proof.
5. **Partial** means at least one applicable implementation exists but no automated ongoing-sync path qualifies it for Beta.
6. `manual_upload` grants no shortcut. Per-merchant connection health is not an input.

Every non-Planned, non-Live provider exposes **Runtime verification pending** and enumerates each applicable capability without valid controlled proof on its detail page.

## Verification environment and safety decision

| Field | Exact value |
|---|---|
| Date | 2026-07-21 |
| Commit/build | `8f943e03ae5002506b6efa33f61f78ed7b0a47b8` + dirty Task 1 / Task 1A worktree |
| Automated environment | Local macOS checkout; repository Jest/TypeScript toolchain; provider and database calls mocked or in-memory where the named tests do so |
| Local application/database runtime | Unavailable: Docker is not installed (`docker info` exit 127); no isolated local Supabase stack |
| Configured remote application | `https://unauth-pi.vercel.app` with a hosted Supabase project; no evidence identifies these as a safe non-production build for Task 1A writes |
| Controlled external-account execution | **Not run**. No OAuth install, source mutation, secret rotation, write-back, reconnect, disconnect, provider sync, upload, or database write was triggered |
| Limitation | Environment variables and historical scripts show that credentials/tooling exist, but that is not proof of a safe controlled environment or of an executed scenario |

The remote configuration looks production-facing and was not used for mutating validation. This follows the task boundary: do not mutate production or trigger real provider actions merely to manufacture proof.

## Evidence actually executed

| Evidence type | Environment | Date | Build | Scenario | Result | Limitations |
|---|---|---|---|---|---|---|
| TypeScript contract | Local checkout | 2026-07-21 | `8f943e03` + Task 1A worktree | `npm run typecheck` after schema/provider/UI conversion | PASS | Static only; no runtime behavior |
| Lifecycle regression | Local Jest | 2026-07-21 | `8f943e03` + Task 1A worktree | `tests/unit/providerCatalogueConsistency.test.ts` + `tests/unit/integrations.test.ts` | PASS — 2 suites, 33 tests | Mocked/in-memory; not controlled provider/runtime proof |
| Shopify/Gorgias/CSV targeted automation | Local Jest | 2026-07-21 | `8f943e03` + Task 1A worktree | 15 named suites covering OAuth/settings, account-probe logic, import/backfill, webhook, reconciliation, repair/disconnect/write-back logic, CSV validation/partial failure/idempotency construction | PASS — 15 suites, 136 tests | Provider responses and/or persistence are mocked/in-memory; not a live provider, deployed app, or isolated DB workflow |
| Controlled Shopify workflow | Unavailable | 2026-07-21 | Current worktree | Account identity, import, source update, reconciliation, failure/repair, reconnect, disconnect | NOT RUN | No safely identified staging account/build; no provider action triggered |
| Controlled Gorgias workflow | Unavailable | 2026-07-21 | Current worktree | Account identity, import, source update, reconciliation, failure/repair, reconnect, disconnect, bounded note/tag write | NOT RUN | Historical README is not an artifact for this account/build; no provider action triggered |
| Controlled CSV workflow | Unavailable | 2026-07-21 | Current worktree | Preview, provenance, merchant scope, partial failure, idempotent retry, correction, canonical downstream visibility | NOT RUN | No isolated local DB; configured hosted project was not mutated |
| Controlled document workflow | Unavailable | 2026-07-21 | Current worktree | Type/size/magic checks, storage isolation, quarantine/scan, correction/approval, canonical visibility | NOT RUN | No isolated storage/DB/scanner; configured hosted project was not mutated |
| Controlled self-fulfilment workflow | Unavailable | 2026-07-21 | Current worktree | Signed access, merchant scope, photo safety, single-use/idempotent retry, correction, canonical visibility | NOT RUN | No isolated storage/DB; configured hosted project was not mutated |

The exact targeted Jest command is preserved in the Task 1A completion record. Expected warning/error logs from deliberately incomplete in-memory fixtures did not fail a suite; they are another reason not to misclassify the run as controlled runtime proof.

## Current merchant-facing stages

| Provider/path | Derived stage | Implementation located | Automated contract/integration test passed | Controlled local/staging workflow | Runtime gaps shown to merchants |
|---|---|---|---|---|---|
| Shopify | **Beta** | Yes | Yes | Unavailable / not run | All 9 applicable lifecycle capabilities |
| Gorgias | **Beta** | Yes | Yes | Unavailable / not run | All 10 applicable lifecycle capabilities |
| ShipBob | **Beta** | Yes | Yes | No acceptable current artifact | All 9 applicable lifecycle capabilities |
| WooCommerce | **Beta** | Yes | Yes | Unavailable / not run | Connect, account verification, import, incremental pull, webhook, reconciliation, reconnect, disconnect, health |
| BigCommerce | **Beta** | Yes | Yes | Unavailable / not run | Same applicable lifecycle set as WooCommerce |
| Zendesk | **Beta** | Yes | Yes | Unavailable / not run | Connect, account verification, import, incremental pull, webhook, reconciliation, reconnect, disconnect, health |
| Freshdesk | **Beta** | Yes | Yes | Unavailable / not run | Same applicable lifecycle set as Zendesk |
| UPS tracking/evidence | **Partial** | Yes | Yes | Unavailable / not run | Connect, token-only account check, reconnect, disconnect, token-only health |
| FedEx tracking/evidence | **Partial** | Yes | Yes | Unavailable / not run | Same applicable lifecycle set as UPS |
| CSV/manual import | **Partial** | Yes | Yes | Unavailable / not run | Feature access and initial import |
| Document upload | **Partial** | Yes | No route-level automated workflow | Unavailable / not run | Feature access and initial import |
| Self-fulfilment confirmation | **Partial** | Yes | No route-level automated workflow | Unavailable / not run | Feature access and initial import |
| Stripe disputes/evidence | **Planned** | No | No | Not applicable | Non-connectable |
| UPS/FedEx Claims API | **Planned** | No | No | Not applicable | Non-connectable |

There are no remaining Live labels to justify. A future Live upgrade must add capability-level `runtimeEvidence` records that pass the canonical freshness/completeness validator; editing `buildStatus`, choosing `manual_upload`, or connecting a merchant cannot upgrade the stage.

## Detailed evidence — paths previously shown Live

### Shopify — Beta

| Applicable capability | Implementation located | Automated test passed on 2026-07-21 | Controlled runtime | Limitation / missing scenario |
|---|---|---|---|---|
| Connect | `app/api/shopify/install`, callback/OAuth modules | `tests/api/shopifyOAuth.test.ts` | Unavailable | No controlled install for this build |
| Account identity | `verifyShopifyConnection` (`shop.json`) | `tests/api/shopifyVerifyRoute.test.ts`; `tests/unit/liveConnectionVerification.test.ts` | Unavailable | No controlled shop/account observation |
| Initial import | Shopify backfill modules | `tests/lib/shopifyBackfillV2.test.ts` | Unavailable | No deployed-app + isolated-DB backfill |
| Incremental pull | webhook/reconcile jobs | `tests/api/reconcileCron.test.ts`; `tests/lib/reconcileMerchant.test.ts` | Unavailable | No controlled source update observed |
| Webhook | `app/api/shopify/webhooks` | `tests/api/shopifyWebhookP0.test.ts` | Unavailable | No real Shopify delivery observed |
| Reconciliation | reconcile cron/service | `tests/api/reconcileCron.test.ts`; `tests/lib/reconcileMerchant.test.ts` | Unavailable | No controlled drift/repair run |
| Reconnect | OAuth install can be rerun | No dedicated reconnect test | Unavailable | Reconnect-no-dup not executed |
| Disconnect | disconnect service/route | `tests/unit/connectors/disconnect.test.ts` | Unavailable | No provider/store disconnect executed |
| Freshness/health | live verification service | `tests/api/shopifyVerifyRoute.test.ts`; `tests/unit/liveConnectionVerification.test.ts` | Unavailable | No controlled probe result for this build |

Bounded write-back is not applicable: automatic refund issuance is outside the MVP+ boundary.

### Gorgias — Beta

| Applicable capability | Implementation located | Automated test passed on 2026-07-21 | Controlled runtime | Limitation / missing scenario |
|---|---|---|---|---|
| Connect | support-connection settings routes | `tests/api/gorgiasSupportConnectionSettings.test.ts` | Unavailable | No controlled connection creation for this build |
| Account identity | `GET /users/me` verification path | `tests/api/gorgiasVerifyConnectionRoute.test.ts` | Unavailable | No controlled account observation |
| Initial import | `lib/support/gorgias/backfill.ts` | `tests/lib/gorgiasBackfill.test.ts` | Unavailable | No controlled backfill |
| Incremental pull | support webhook ingestion | `tests/api/gorgiasSupportWebhook.test.ts` | Unavailable | No provider-delivered update |
| Webhook | connection-secret verification and ingestion | `tests/api/gorgiasSupportWebhook.test.ts` | Unavailable | No real provider delivery |
| Reconciliation | deleted-ticket reconciler | `tests/lib/shopifyGorgiasProductBridge.test.ts` | Unavailable | No controlled delete/drift repair |
| Reconnect | secret rotation/settings path | `tests/api/gorgiasSupportConnectionSettings.test.ts` | Unavailable | No controlled reconnect/no-dup run |
| Disconnect | disable/credential-clearing path | `tests/api/gorgiasSupportConnectionSettings.test.ts` | Unavailable | No provider disconnect executed |
| Freshness/health | live probe + last-ticket signal | route/unit catalogue tests | Unavailable | No controlled freshness observation |
| Bounded write-back | internal-note/tag action adapter | `tests/lib/gorgiasExecuteAction.test.ts` | Unavailable | Provider responses mocked; no real note/tag written |

The prior `scripts/e2e/README.md` description and a dated hand-written `controlledProof` object do not identify an executed controlled account, environment, commit, per-scenario results, limitations, and persisted artifact. They were removed as Live evidence.

### CSV/manual import — Partial

| Applicable capability | Implementation located | Automated test passed on 2026-07-21 | Controlled runtime | Limitation / missing scenario |
|---|---|---|---|---|
| Feature access (`connect`) | authenticated import page plus validate/commit routes | No route-level end-to-end auth/permission test cited | Unavailable | No running app/isolated DB workflow |
| Initial import | parse, mapping, row processor, durable job, canonical upsert | `canonicalCsvMapping`, `canonicalCsvCommit`, `csv/magicBytes` | Unavailable | Preview, row-level partial failure, duplicate handling and idempotency-key construction are automated; merchant-scoped persistence, retry/correction, and downstream visibility were not runtime-observed. Refund rows are currently reported unsupported by `commitCsvImport` |

Account verification, incremental pull, webhook, reconciliation, reconnect, disconnect, freshness probe, and write-back are not applicable to a discrete first-party upload.

### Document upload — Partial

| Applicable capability | Implementation located | Automated test passed on 2026-07-21 | Controlled runtime | Limitation / missing scenario |
|---|---|---|---|---|
| Feature access (`connect`) | `/settings/agreements`, `/api/agreements/upload`, and `/api/integrations/documents/upload` | No dedicated route workflow | Unavailable | Two active upload route families use different records and safety checks; no canonical end-to-end path was runtime-proven |
| Initial import | merchant-prefixed storage paths, 10 MB cap, integration-route magic checks, quarantine/approval/evidence mapping | No dedicated route workflow | Unavailable | No isolated storage/DB/malware scanner. The agreements UI route accepts PDF by MIME/extension without a magic-byte check; no correction/idempotent retry/downstream-visibility run |

The remaining lifecycle capabilities are not applicable to a discrete first-party upload. Source-file inspection is classified only as `implemented`.

### Self-fulfilment pack confirmation — Partial

| Applicable capability | Implementation located | Automated test passed on 2026-07-21 | Controlled runtime | Limitation / missing scenario |
|---|---|---|---|---|
| Feature access (`connect`) | signed, expiring public confirmation route | No dedicated route workflow | Unavailable | No running app/isolated DB workflow |
| Initial import | signature/expiry check, merchant/order/fulfilment-scoped single-use lookup, merchant-prefixed storage, canonical evidence mapping | No dedicated route workflow | Unavailable | Photo MIME, magic bytes, and size are not validated; no correction path or controlled idempotent retry/downstream-visibility run |

The remaining lifecycle capabilities are not applicable to a discrete first-party confirmation.

## Other providers and paths

- **ShipBob — Beta:** real adapter and broad automated coverage exist, but `validate-controlled-live-connectors --sync-shipbob` is a command, not proof it ran for this build. No artifact records environment/account/build/scenario results. Dedicated deleted/cancelled-order reconciliation is also absent.
- **WooCommerce / BigCommerce — Beta:** connect/import/webhook implementation and automated coverage exist; account probe, dedicated reconciliation, freshness health, and controlled lifecycle evidence do not.
- **Zendesk / Freshdesk — Beta:** connect/backfill/webhook paths are real and tested. Current account-health probes, deleted-ticket reconciliation, and controlled lifecycle artifacts are absent. Read-only catalogue scope makes bounded write-back not applicable rather than silently required.
- **UPS / FedEx tracking — Partial:** OAuth and on-demand evidence logic are implemented/tested, but health only refreshes a token rather than probing the tracking API. No sync/webhook lifecycle exists by design, and no controlled tracking scenario was run.
- **Stripe disputes / carrier claims — Planned:** these are reserved, non-connectable slots. `assertLiveProvider` rejects them and stage derivation cannot be upgraded by connection state.

## Requirement disposition

- **REL-001:** **PARTIAL**. Sources are connectable and the catalogue is now truthful, but controlled current import/update/reconciliation/repair evidence and truthful health are not complete for every advertised path.
- **REL-010:** the provider build-maturity overclaim fixed by Task 1/1A is corrected. Do **not** mark the broader requirement PASS solely from this matrix; it also covers other routes, metrics, and actions.
- **QAT-005:** **NOT PASS**. No current provider has complete controlled evidence for every advertised applicable lifecycle capability.

The release-readiness gate proves repository health only. It cannot promote any of these requirement dispositions or substitute for controlled runtime evidence.
