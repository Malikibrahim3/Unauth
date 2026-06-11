#!/bin/bash
# Category 1 — Security & access control. Emits TSV: test|expected|actual|verdict|notes
set -u
DB="postgresql://postgres.lquvbikyvmbjbfffrlky@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
export PGPASSWORD='Boyo19961996!uuu'
cd "$(dirname "$0")/../.."
S=scripts/v2-tests/state.json
g() { python3 -c "import json;d=json.load(open('$S'));print(d$1)"; }
UA=$(g "['users']['v2test-user-a@v2test.example']")
UB=$(g "['users']['v2test-user-b@v2test.example']")
MA=$(g "['merchants']['v2test-merchant-a']")
MB=$(g "['merchants']['v2test-merchant-b']")
MC=$(g "['merchants']['v2test-merchant-c']")
MD=$(g "['merchants']['v2test-merchant-d']")
MQ=$(g "['merchants']['v2test-merchant-q']")
CLA=$(g "['claims']['A']")
CLB=$(g "['claims']['B']")
K1=$(g "['hashes']['k1_email']['hash']")
K2=$(g "['hashes']['k2_email']['hash']")
K3=$(g "['hashes']['k3_email']['hash']")
K4=$(g "['hashes']['k4_email']['hash']")
OUT=scripts/v2-tests/results/cat1.tsv
: > "$OUT"
row() { printf '%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" "$5" >> "$OUT"; }

# helper: run SQL as authenticated user $1, capture combined output
as_user() {
  local uid=$1; shift
  psql "$DB" -X -tA 2>&1 <<SQL
begin;
select set_config('role','authenticated',true);
select set_config('request.jwt.claims','{"sub":"$uid","role":"authenticated"}',true);
$*
rollback;
SQL
}
as_anon() {
  psql "$DB" -X -tA 2>&1 <<SQL
begin;
select set_config('role','anon',true);
$*
rollback;
SQL
}
svc() { psql "$DB" -X -tA -c "$1" 2>&1; }

# ── 1.1 network layer denied to authenticated
for t in identity_signals identity_edges identities identity_members identity_profiles network_access_log identity_resolution_events; do
  res=$(as_user "$UA" "select count(*) from $t;")
  if echo "$res" | grep -q "permission denied"; then
    row "1.1 $t SELECT as authenticated" "permission denied" "permission denied" "PASS" ""
  else
    row "1.1 $t SELECT as authenticated" "permission denied" "$(echo "$res" | tr '\n' ' ' | cut -c1-80)" "FAIL" "BLOCKER: network table readable"
  fi
done

# ── 1.2 merchant isolation
resA=$(as_user "$UA" "select count(*) filter (where merchant_id <> '$MA'), count(*) from source_orders;")
foreignA=$(echo "$resA" | grep -E '^[0-9]+\|' | head -1)
row "1.2 A sees only A source_orders" "0 foreign rows, >0 own" "$foreignA (foreign|total)" "$(echo "$foreignA" | grep -qE '^0\|[1-9]' && echo PASS || echo FAIL)" ""
resB=$(as_user "$UB" "select count(*) filter (where merchant_id <> '$MB'), count(*) from source_orders;")
foreignB=$(echo "$resB" | grep -E '^[0-9]+\|' | head -1)
row "1.2 B sees only B source_orders" "0 foreign rows, >0 own" "$foreignB (foreign|total)" "$(echo "$foreignB" | grep -qE '^0\|[1-9]' && echo PASS || echo FAIL)" ""
resC=$(as_user "$UA" "select count(*) filter (where merchant_id <> '$MA'), count(*) from claims;")
fc=$(echo "$resC" | grep -E '^[0-9]+\|' | head -1)
row "1.2 A sees only A claims" "0 foreign, 1 own" "$fc" "$([ "$fc" = "0|1" ] && echo PASS || echo FAIL)" ""
resD=$(as_user "$UA" "select count(*) filter (where merchant_id <> '$MA'), count(*) from merchant_identity_state;")
fd=$(echo "$resD" | grep -E '^[0-9]+\|' | head -1)
row "1.2 A sees only A watchlist state" "0 foreign, 1 own" "$fd" "$([ "$fd" = "0|1" ] && echo PASS || echo FAIL)" ""
# cross-merchant UPDATE attempt
upd=$(as_user "$UA" "update claims set reason_raw='v2test-hacked' where id='$CLB' returning id;")
after=$(svc "select reason_raw from claims where id='$CLB';")
if echo "$upd" | grep -q "$CLB"; then verdict=FAIL; else verdict=PASS; fi
[ "$after" = "v2test claim B" ] || verdict=FAIL
row "1.2 A UPDATE on B claim denied" "0 rows updated, B unchanged" "updated:$(echo "$upd" | grep -c "$CLB") after:'$after'" "$verdict" "RLS filters row from UPDATE"
resE=$(as_user "$UB" "select count(*) filter (where merchant_id <> '$MB'), count(*) from claims;")
fe=$(echo "$resE" | grep -E '^[0-9]+\|' | head -1)
row "1.2 B sees only B claims" "0 foreign, 1 own" "$fe" "$([ "$fe" = "0|1" ] && echo PASS || echo FAIL)" ""

# ── 1.3 anon access
for t in source_orders source_customers claims identity_signals identities identity_profiles; do
  res=$(as_anon "select count(*) from $t;")
  if echo "$res" | grep -q "permission denied"; then
    row "1.3 anon SELECT $t" "denied" "permission denied" "PASS" ""
  elif echo "$res" | grep -qE '^0$'; then
    row "1.3 anon SELECT $t" "denied" "0 rows via RLS (grant exists, no policy)" "PASS" "denied-by-RLS not by grant"
  else
    row "1.3 anon SELECT $t" "denied" "$(echo "$res" | tr '\n' ' ' | cut -c1-80)" "FAIL" "anon can read rows"
  fi
done
res=$(as_anon "select * from lookup_network_identity('$MA','[{\"type\":\"email\",\"hash\":\"$K1\"}]'::jsonb,null);")
row "1.3 anon EXECUTE lookup_network_identity" "denied" "$(echo "$res" | grep -o 'permission denied for function [a-z_]*' | head -1 || echo "$res" | head -1 | cut -c1-60)" "$(echo "$res" | grep -q 'permission denied' && echo PASS || echo FAIL)" ""
res=$(as_anon "select ingest_identity_observations('$MA','[]'::jsonb,'[]'::jsonb);")
row "1.3 anon EXECUTE ingest_identity_observations" "denied" "$(echo "$res" | grep -o 'permission denied for function [a-z_]*' | head -1 || echo "$res" | head -1 | cut -c1-60)" "$(echo "$res" | grep -q 'permission denied' && echo PASS || echo FAIL)" ""

# ── 1.4 k-anonymity boundaries (service role; gate is inside the function)
lookup() { svc "select count(*) from lookup_network_identity('$1','[{\"type\":\"email\",\"hash\":\"$2\"}]'::jsonb,null);"; }
log_count() { svc "select count(*) from network_access_log;"; }
c0=$(log_count)
r1=$(lookup "$MB" "$K1"); row "1.4 mc=1 lookup by other merchant" "0 rows" "$r1 rows" "$([ "$r1" = "0" ] && echo PASS || echo FAIL)" "k1 identity, merchant B querying"
r2=$(lookup "$MC" "$K2"); row "1.4 mc=2 lookup by third merchant" "0 rows" "$r2 rows" "$([ "$r2" = "0" ] && echo PASS || echo FAIL)" ""
r3=$(lookup "$MD" "$K3"); row "1.4 mc=3 lookup by fourth merchant" "1 row" "$r3 rows" "$([ "$r3" = "1" ] && echo PASS || echo FAIL)" ""
r4=$(lookup "$MQ" "$K4"); row "1.4 mc=4 lookup by uninvolved merchant" "1 row" "$r4 rows" "$([ "$r4" = "1" ] && echo PASS || echo FAIL)" ""

# ── 1.5 own-merchant exception + logging
r5=$(lookup "$MA" "$K1"); row "1.5 mc=1 own-merchant lookup" "1 row" "$r5 rows" "$([ "$r5" = "1" ] && echo PASS || echo FAIL)" "own-merchant exception"
c1=$(log_count)
dl=$((c1 - c0))
row "1.5 all lookups logged" "5 new network_access_log rows" "$dl new rows" "$([ "$dl" = "5" ] && echo PASS || echo FAIL)" "log count $c0 -> $c1"
ksat=$(svc "select k_anonymity_satisfied, matched_identity_count from network_access_log where merchant_id='$MA' order by created_at desc limit 1;")
row "1.5 own-merchant disclosure logged" "k_anonymity_satisfied=f, matched=1" "$ksat" "$([ "$ksat" = "f|1" ] && echo PASS || echo FAIL)" "mc=1 below k=3 but disclosed via own-merchant rule"

# ── 1.6 network_access_log append-only
target=$(svc "select id from network_access_log where merchant_id='$MA' limit 1;")
ur=$(svc "update network_access_log set matched_identity_count=999 where id='$target';")
row "1.6 UPDATE network_access_log" "rejected (append-only)" "$(echo "$ur" | head -1 | cut -c1-70)" "$(echo "$ur" | grep -q 'append-only' && echo PASS || echo FAIL)" ""
dr=$(svc "delete from network_access_log where id='$target';")
row "1.6 DELETE network_access_log" "rejected (append-only)" "$(echo "$dr" | head -1 | cut -c1-70)" "$(echo "$dr" | grep -q 'append-only' && echo PASS || echo FAIL)" ""
c2=$(log_count)
r6=$(lookup "$MQ" "$K4")
c3=$(log_count)
row "1.6 one log row per lookup call" "exactly +1" "+$((c3 - c2))" "$([ $((c3 - c2)) = 1 ] && echo PASS || echo FAIL)" ""

# ── 1.7 PII layer isolation
for t in identity_signals identities identity_members; do
  col=$(svc "select count(*) from information_schema.columns where table_schema='public' and table_name='$t' and column_name='email';")
  row "1.7 no email column on $t" "column absent" "$([ "$col" = "0" ] && echo absent || echo PRESENT)" "$([ "$col" = "0" ] && echo PASS || echo FAIL)" ""
done
badhash=$(svc "select count(*) from identity_signals where identifier_type not in ('platform_customer_id','helpdesk_contact_id') and identifier_hash !~ '^[0-9a-f]{64}\$';")
row "1.7 all PII hashes 64-hex" "0 bad" "$badhash bad" "$([ "$badhash" = "0" ] && echo PASS || echo FAIL)" ""
emails_detail=$(svc "select count(*) from identity_resolution_events where detail::text ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}';")
emails_mv=$(svc "select count(*) from identity_members where matched_via::text ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}';")
phones_detail=$(svc "select count(*) from identity_resolution_events where detail::text ~ '\+[0-9]{8,15}';")
row "1.7 no email patterns in events.detail/members.matched_via" "0 / 0" "$emails_detail / $emails_mv" "$([ "$emails_detail" = "0" ] && [ "$emails_mv" = "0" ] && echo PASS || echo FAIL)" ""
row "1.7 no E.164 phone patterns in events.detail" "0" "$phones_detail" "$([ "$phones_detail" = "0" ] && echo PASS || echo FAIL)" ""

# ── 1.8 dropped functions / call sites
for f in upsert_identity_v2 record_signal_feedback; do
  n=$(svc "select count(*) from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname='$f';")
  row "1.8 $f absent from public schema" "absent" "$([ "$n" = "0" ] && echo absent || echo PRESENT)" "$([ "$n" = "0" ] && echo PASS || echo FAIL)" ""
done
ff_post=$(curl -s -o /dev/null -w "%{http_code}" -m 8 -X POST -H 'content-type: application/json' -d '{}' http://localhost:3000/api/fraud-feedback)
ff_get=$(curl -s -o /dev/null -w "%{http_code}" -m 8 http://localhost:3000/api/fraud-feedback)
v18=FAIL; [ "$ff_post" = "410" ] && { [ "$ff_get" = "410" ] || [ "$ff_get" = "405" ]; } && v18=PASS
row "1.8 /api/fraud-feedback retired" "410 (not 500)" "POST:$ff_post GET:$ff_get" "$v18" "GET has no handler (405); POST returns 410"
rpcs=$(grep -c "\.rpc(" lib/identity/lookup.ts || true)
row "1.8 lookup.ts calls no dropped RPC" "0 rpc calls" "$rpcs rpc calls" "$([ "$rpcs" = "0" ] && echo PASS || echo FAIL)" "file is a deprecated no-op with console.warn"

column -t -s$'\t' "$OUT"
