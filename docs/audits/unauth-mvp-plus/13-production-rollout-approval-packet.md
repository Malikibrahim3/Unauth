# Consolidated production rollout and approval packet

Prepared after the authoritative local gate completed at
`2026-07-23T05:26:38.485Z`.

## 1. Status and authorization boundary

Local remediation is complete. This packet is a runbook, not authorization:
none of its staging, production, deployment, provider, secret, backup, or
migration-history actions has been executed.

The known production database target is Supabase project
`lquvbikyvmbjbfffrlky`. The exact staging Supabase project, deployment-provider
project/environment IDs, controlled provider accounts, change owner, and
rollback owner must be written into the change record before execution. Stop if
any target is blank or differs from the approved record. Never run fixture,
browser, reset, seed, or destructive provider commands against either remote
environment.

This batch asks for one approval covering only:

1. a reviewed release commit/artifact for the current remediation diff;
2. backup/checkpoint creation and redaction-safe metadata reads;
3. migration-history reconciliation and six forward migrations, staging first;
4. deployment of that exact artifact, staging first;
5. controlled-account provider verification and helpdesk secret rotation;
6. bounded monitoring, stop gates, application rollback, and forward database
   repair if required.

It does **not** authorize reading customer rows, copying Auth/Vault/Storage
objects, running production E2E/fixtures, sending customer communications, or
performing refunds, payouts, replacements, denials, claims, recoveries, or any
other monetary/destructive provider action.

## 2. Immutable local release evidence

| Checkpoint | Required value |
|---|---|
| Active migrations | Eight files, in the order listed in §5 |
| Archived legacy migrations | 223 files; `legacy-migration-sha256.txt` passes |
| Captured production history | 222 applied versions, `0001` through `20260719090000` |
| Canonical normalized public-schema hash | `268f248ddb10d292172af9adc559e96b8e5f227723ee775ba985f0ba765f236d` |
| Fresh replay | Two independent official local Supabase PostgreSQL 17.6 replays pass |
| Jest | 315 passed suites; 2,389 passed tests; 1 live-only suite / 3 tests skipped |
| Browser | 105/105 authoritative desktop checks; 9/9 focused desktop/tablet/mobile regressions |
| Performance | Warmed primary-route p75 628 ms; maximum 717 ms in the final local run |
| Final gate | `status=ready`, `failedChecks=0`, remote migrations excluded |

The source artifacts are `11-production-schema-manifest.md`,
`12-migration-provenance-register.md`/`.json`, the immutable archive, and the
single remediation ledger. No raw production capture or credential is retained.

## 3. Mandatory people, targets, and checkpoints

Before the window, the change record must name:

- change owner and independent migration-history reviewer;
- database backup/PITR owner and verified restore point ID for staging and
  production;
- staging Supabase project ref and deployment project/environment ID;
- production Supabase ref `lquvbikyvmbjbfffrlky` and the exact deployment
  project/environment ID;
- exact release commit SHA/artifact digest and last-known-good deployment ID;
- controlled, non-customer Shopify/Gorgias/ShipBob/WooCommerce/BigCommerce/
  Zendesk/Freshdesk/carrier accounts actually available for proof;
- provider-configuration owner and rollback owner;
- approved retention decisions from §9, or an explicit decision to leave every
  unset policy disabled.

Create and record these recoverable checkpoints before any history write:

1. provider-managed database backup/PITR checkpoint and a completed restore
   verification in a disposable project;
2. `supabase_migrations.schema_migrations` version/name snapshot;
3. redaction-safe schema/policy/grant/publication/bucket/cron metadata snapshot;
4. current deployment ID and environment-variable-name inventory (names only,
   never values);
5. current helpdesk webhook IDs, public URLs, enabled state, and last delivery
   timestamp/event ID, without recording secret values or payloads.

If a backup cannot be named and restore-tested, stop. A database export is not
a substitute for provider PITR, and application-row data must not be copied into
this repository.

## 4. Read-only preflight and parity gate

Run first against an isolated staging clone, then repeat against production.
Use a dedicated CLI profile and verify the target after linking:

```zsh
set -euo pipefail
TARGET_REF='lquvbikyvmbjbfffrlky' # replace only for the approved staging pass
supabase link --project-ref "$TARGET_REF"
test "$(tr -d '\n' < supabase/.temp/project-ref)" = "$TARGET_REF"
supabase migration list --linked --output json
```

The independent reviewer must confirm the remote list is exactly the 222
`in_prod=true` versions in `12-migration-provenance-register.json`: first
`0001`, last `20260719090000`, with no extra/missing version. Re-run the same
read-only, metadata-only capture method documented in
`11-production-schema-manifest.md`; do not query application/Auth/Vault/Storage
object rows. Resolve the retained external parity gap by confirming the exact
six production `storage.objects` policy definitions and exact relation/default
ACLs, and compare the public schema to the captured baseline before applying any
delta.

Stop on any schema/history/policy/ACL drift. Regenerate the candidate locally,
replay it twice, and reissue this packet; never repair around unexplained drift.

## 5. Exact migration-history reconciliation and forward order

The active history is:

1. `20260720000000_canonical_production_baseline.sql`
2. `20260720100000_canonical_environment_supplement.sql`
3. `20260721120000_durable_sensitive_audit.sql`
4. `20260722100000_tenant_authorization_hardening.sql`
5. `20260722200000_webhook_event_safety.sql`
6. `20260722300000_privacy_erasure_retention.sql`
7. `20260722400000_source_to_recovery_integrity.sql`
8. `20260722500000_ownership_transfer_integrity.sql`

The first two reconstruct already-existing production state and must be marked
applied; they must never be pushed into production. The remaining six are
forward migrations. The following exact zsh sequence was rehearsed locally
against the captured 222-version history by
`scripts/verify-local-rollout-rehearsal.mjs`:

```zsh
set -euo pipefail
REGISTER='docs/audits/unauth-mvp-plus/12-migration-provenance-register.json'
legacy_versions=("${(@f)$(jq -r '.[] | select(.in_prod == true) | .version' "$REGISTER")}")
test "${#legacy_versions[@]}" -eq 222
test "$legacy_versions[1]" = '0001'
test "$legacy_versions[-1]" = '20260719090000'

# History-only reconciliation. This changes migration metadata, not schema.
supabase migration repair --linked --status reverted --yes "${legacy_versions[@]}"
supabase migration repair --linked --status applied --yes \
  20260720000000 20260720100000

# This must list exactly the six forward migrations above, in order.
supabase db push --linked --dry-run --yes
```

The reviewer must compare the dry run byte-for-byte by version/order. If it
lists either baseline, omits a forward migration, includes anything else, or
shows unexplained remote drift, use the pre-DDL rollback in §8 and stop.

After the staging deployment and all staging gates pass, repeat the read-only
preflight and the history-only sequence on production. Only then apply:

```zsh
supabase db push --linked --yes
supabase migration list --linked --output json
```

Do not use `--include-all`, do not push either baseline, do not edit an applied
migration, and do not run `db reset`, `db pull`, seed, fixture, or browser E2E
against a remote target.

## 6. Deployment and provider ordering

Use the same immutable artifact in staging and production.

1. Pause scheduled jobs and the three helpdesk webhook registrations at the
   provider edge; record the pause time and last delivery ID. Do not delete the
   registrations. Other signed providers may continue only if the staging
   rehearsal proves compatibility; otherwise pause them too and rely on their
   documented retries.
2. Wait for in-flight requests/jobs to drain. Confirm no active migration,
   erasure, reconciliation, or financial projection worker remains.
3. Perform §5 history reconciliation and apply the six migrations.
4. Run the metadata invariants in §7 before application promotion.
5. Promote the exact reviewed deployment artifact; do not build a fresh,
   unpinned production artifact.
6. For each Gorgias, Freshdesk, and Zendesk controlled connection, rotate the
   one-time connection secret, remove retired `unauth_whsec` URL-secret
   parameters, and configure the primary headers exactly as follows:
   `x-unauth-gorgias-secret`, `x-unauth-freshdesk-secret`, and
   `x-unauth-zendesk-secret`. The URL may retain only the public account locator
   (`gorgias_domain`, `freshdesk_domain`, or `zendesk_subdomain`). Never log or
   paste the secret into the change record.
7. Send one provider-controlled synthetic event, then one exact replay and one
   newer update per enabled controlled account. Confirm one canonical effect,
   stored-response replay, ordering, and no cross-account collision before
   resuming that registration.
8. Resume jobs and webhooks gradually, one provider/account at a time. Observe
   at least one full reconciliation interval before widening traffic.

Zendesk remains Beta/Partial until its native timestamped HMAC signing secret
and configuration path are supplied and proven. Gorgias/Freshdesk custom-header
authentication also remains Partial without provider-native freshness proof.
No provider may be relabelled Live merely because this rollout succeeds.
Controlled proof must record environment, account, date, build, every applicable
lifecycle scenario, result, limitation, and artifact as required by
`08-provider-proof-matrix.md`.

## 7. Post-migration gates and monitoring

Immediately after migration, run metadata-only invariants. Expected values:

```sql
select count(*) from pg_index where not indisvalid or not indisready;
-- 0

select count(*)
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
where t.tgname = 'trg_durable_audit' and c.relkind = 'r';
-- 26

select count(*) from pg_policies where schemaname = 'public';
-- 147
```

Then, using only the isolated staging/controlled production merchant:

- authenticated `GET /api/rollout/health` returns HTTP 200, `healthy`, and zero
  failed checks;
- login, selected workspace, viewer denial, owner access, and cross-merchant
  direct-ID attempts fail/allow exactly as rehearsed;
- one non-monetary case/evidence/decision/recovery/report path reconciles across
  case, ledger, loss, recovery, drill-down, and export;
- webhook invalid/modified/stale/replay cases return the expected status and do
  not duplicate effects;
- audit events, delivery attempts, dead letters, privacy cleanup, job backlog,
  source freshness, 4xx/5xx rates, latency, and database resource pressure remain
  within the pre-recorded staging baseline;
- no secrets/PII appear in sampled logs, URLs, errors, notifications, or traces.

Hold the production window for at least one provider retry/reconciliation cycle.
Continue heightened monitoring for 24 hours, with named review points at 15
minutes, 1 hour, 4 hours, and 24 hours.

Stop traffic expansion immediately for any target mismatch, backup failure,
history/parity drift, invalid index, missing audit trigger, unexpected policy
count, tenant leak, role escalation, financial mismatch, duplicate side effect,
signature-authentication spike, dead-letter growth, erasure failure, secret/PII
leak, or sustained health/latency regression.

## 8. Rollback and forward repair

### Before forward DDL

The history-only reconciliation is reversible. Present the immutable archive as
a temporary active workdir, mark the two canonical versions reverted, then mark
the 222 captured versions applied. This exact path is exercised locally:

```zsh
set -euo pipefail
ROLLBACK_ROOT="$(mktemp -d /tmp/unauth-history-rollback.XXXXXX)"
mkdir -p "$ROLLBACK_ROOT/supabase/migrations"
cp supabase/config.toml "$ROLLBACK_ROOT/supabase/config.toml"
for version in "${legacy_versions[@]}"; do
  matches=(supabase/migrations_archive/pre_canonical_20260722/${version}_*.sql)
  test "${#matches[@]}" -eq 1
  ln -s "${matches[1]:A}" "$ROLLBACK_ROOT/supabase/migrations/${matches[1]:t}"
done
supabase link --workdir "$ROLLBACK_ROOT" --project-ref "$TARGET_REF"
supabase migration repair --linked --status reverted --yes \
  20260720000000 20260720100000
supabase migration repair --workdir "$ROLLBACK_ROOT" --linked \
  --status applied --yes "${legacy_versions[@]}"
supabase migration list --linked --output json
```

Remove the explicit temporary directory after the reviewer verifies the restored
222-version snapshot. Do not execute this rollback after forward DDL has begun.

### After forward DDL

Rollback the application deployment to the recorded last-known-good artifact
first and keep affected workers/webhooks paused. The migrations add hardening,
history, privacy, and integrity controls; do not delete audit/financial/privacy
records or falsify history to pretend they never ran. Diagnose against the
checkpoint and ship a reviewed forward-repair migration. If the database is
unusable and a forward repair cannot be safely applied, the named database
owner may restore the provider-managed PITR checkpoint and the matching
migration-history snapshot. That restore is a separate destructive decision at
the stop gate; it is not delegated to automation.

Provider rollback means pause the new registration and rotate again after the
fix. Never restore a URL-borne secret. Backfill/reconcile from the recorded last
delivery point using the provider's controlled retry path; do not replay raw
customer payloads into a test environment.

## 9. Required policy and data-contract decisions

These defaults remain safe and disabled until the authorized owners decide:

- `platform.retentionDays` remains `null`; no automatic raw-payload deadline is
  invented.
- Canonical case, evidence, document, audit, and financial retention requires a
  legal/product-approved period and deletion/pseudonymisation matrix.
- Historical unlinked inbox payloads require an approved merchant/subject
  mapping or full-merchant deletion; substring guessing is prohibited.
- Legacy non-null `payload_ref` values require an approved bucket/path ownership
  contract before any object deletion/backfill.
- If future collection must stop for an erased subject, the operator must make
  the explicit source-disconnect decision; erasure does not silently disconnect
  a merchant integration.

Approval may leave all five decisions unresolved, in which case the current
fail-safe behaviour stays in place and the related contract rows remain
UNVERIFIED. It may not substitute invented retention periods or destructive
guesses.

## 10. Residual risk and certification boundary

Even after a successful rollout, `MVP+ CERTIFIED` is withheld until:

- exact production Storage policies/ACLs and post-rollout schema parity pass;
- staging and production controlled-runtime provider evidence exists for every
  capability advertised Live (currently none is advertised Live);
- Zendesk native signing and any desired Gorgias/Freshdesk freshness guarantees
  are implemented/configured/proven, or their Partial labels remain accepted;
- retention/data-reference decisions are approved where the contract requires
  them;
- the 24-hour monitoring window closes without a stop-gate breach.

Until then the truthful terminal state is
`LOCAL REMEDIATION COMPLETE — PRODUCTION APPROVAL REQUIRED`.
