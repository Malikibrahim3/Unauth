#!/bin/bash
# Full teardown of v2 test-suite data. Append-only triggers are disabled inside
# a single transaction strictly to remove suite-created rows, then re-enabled.
set -euo pipefail
source "$(dirname "$0")/db-env.sh"
cd "$(dirname "$0")/../.."
S=scripts/v2-tests/state.json
python3 -c "
import json
d = json.load(open('$S'))
open('/tmp/v2t-identity-ids.txt','w').write('\n'.join(d['identityIds']))
open('/tmp/v2t-merchant-ids.txt','w').write('\n'.join(d['merchants'].values()))
print('ids:', len(d['identityIds']), 'merchants:', len(d['merchants']))
"
psql "$DB" -X -v ON_ERROR_STOP=1 <<'SQL'
begin;
create temporary table _tids (id uuid primary key) on commit drop;
create temporary table _tm (id uuid primary key) on commit drop;
\copy _tids from /tmp/v2t-identity-ids.txt
\copy _tm from /tmp/v2t-merchant-ids.txt

alter table identity_resolution_events disable trigger trg_resolution_events_noupd;
alter table claim_events disable trigger trg_claim_events_noupd;
alter table network_access_log disable trigger trg_network_access_log_noupd;

delete from identity_resolution_events e using _tids t where e.identity_id = t.id;
delete from claim_events e using _tm m where e.merchant_id = m.id;
delete from network_access_log l using _tm m where l.merchant_id = m.id;

alter table identity_resolution_events enable trigger trg_resolution_events_noupd;
alter table claim_events enable trigger trg_claim_events_noupd;
alter table network_access_log enable trigger trg_network_access_log_noupd;

delete from claims c using _tm m where c.merchant_id = m.id;
delete from merchant_identity_state s using _tm m where s.merchant_id = m.id;
delete from identity_notes n using _tm m where n.merchant_id = m.id;
delete from identity_profiles p using _tids t where p.identity_id = t.id;
delete from identity_members im using _tids t where im.identity_id = t.id;
update identities set superseded_by = null where id in (select id from _tids);
delete from identities i using _tids t where i.id = t.id;
delete from identity_signals s using _tm m where s.merchant_id = m.id;
delete from identity_edges e using _tm m where e.merchant_id = m.id;
delete from source_ticket_events e using _tm m where e.merchant_id = m.id;
delete from source_tickets s using _tm m where s.merchant_id = m.id;
delete from source_refunds r using _tm m where r.merchant_id = m.id;
delete from source_fulfillments f using _tm m where f.merchant_id = m.id;
delete from source_disputes d using _tm m where d.merchant_id = m.id;
delete from source_orders o using _tm m where o.merchant_id = m.id;
delete from source_addresses a using _tm m where a.merchant_id = m.id;
delete from source_customers c using _tm m where c.merchant_id = m.id;
delete from sync_job_chunks ch using sync_jobs j, _tm m where ch.job_id = j.id and j.merchant_id = m.id;
delete from sync_jobs j using _tm m where j.merchant_id = m.id;
delete from processed_webhooks where idempotency_key like '%v2test%';
delete from merchant_widget_tokens w using _tm m where w.merchant_id = m.id;
delete from helpdesk_connections h using _tm m where h.merchant_id = m.id;
delete from store_connections s using _tm m where s.merchant_id = m.id;
delete from merchant_api_keys k using _tm m where k.merchant_id = m.id;
delete from merchant_users u using _tm m where u.merchant_id = m.id;
delete from merchants mm using _tm m where mm.id = m.id;
commit;
SQL
echo "── triggers re-enabled check (expect O O O):"
psql "$DB" -X -tA -c "select tgname || '=' || tgenabled::text from pg_trigger where tgname in ('trg_resolution_events_noupd','trg_claim_events_noupd','trg_network_access_log_noupd');"
echo "── deleting auth users:"
npx tsx --env-file=.env.local - <<'TS'
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const m = JSON.parse(readFileSync('scripts/v2-tests/state.json', 'utf8'));
for (const [email, id] of Object.entries(m.users as Record<string, string>)) {
  const { error } = await sb.auth.admin.deleteUser(id);
  console.log(email, error ? `ERROR ${error.message}` : 'deleted');
}
TS
echo "── baseline restore verification:"
psql "$DB" -X -tA <<'SQL'
select 'identities', count(*) from identities;
select 'identity_members', count(*) from identity_members;
select 'identity_signals', count(*) from identity_signals;
select 'identity_edges', count(*) from identity_edges;
select 'source_orders', count(*) from source_orders;
select 'claims', count(*) from claims;
select 'merchants', count(*) from merchants;
select 'k3_identities', count(*) from identities where merchant_count >= 3;
select 'v2test_leftovers', count(*) from merchants where name like 'v2test%';
SQL