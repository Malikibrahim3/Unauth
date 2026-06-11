#!/bin/bash
# Category 6 — RPC behaviour
set -u
DB="postgresql://postgres.lquvbikyvmbjbfffrlky@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
export PGPASSWORD='Boyo19961996!uuu'
cd "$(dirname "$0")/../.."
S=scripts/v2-tests/state.json
g() { python3 -c "import json;d=json.load(open('$S'));print(d$1)"; }
H() { npx tsx --env-file=.env.local scripts/v2-tests/hash.ts "$1" | tail -1; }
svc() { psql "$DB" -X -tA -c "$1" 2>&1; }
OUT=scripts/v2-tests/results/cat6.tsv
: > "$OUT"
row() { printf '%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" "$5" >> "$OUT"; }
MA=$(g "['merchants']['v2test-merchant-a']")
MQ=$(g "['merchants']['v2test-merchant-q']")
RC=0a73aa9d-6fbf-4325-b7d3-605b12a52155

# ── 6.1 known repeat claimer
RCH=$(svc "select identifier_hash from identity_members where identity_id='$RC' and identifier_type='email' limit 1;")
RCM=$(svc "select s.merchant_id from identity_members im join identity_signals s on s.identifier_type=im.identifier_type and s.identifier_hash=im.identifier_hash where im.identity_id='$RC' limit 1;")
RCMNAME=$(svc "select name from merchants where id='$RCM';")
res=$(svc "select identity_id, confidence_grade, confidence_score::int, merchant_count, total_orders, total_claims, claim_rate, fastest_claim_days, claim_type_counts is not null, first_seen_at is not null and last_seen_at is not null and last_seen_at >= first_seen_at from lookup_network_identity('$RCM','[{\"type\":\"email\",\"hash\":\"$RCH\"}]'::jsonb,null);")
exp=$(svc "select i.id, i.confidence_grade, i.confidence_score::int, i.merchant_count, p.total_orders, p.total_claims, p.claim_rate, p.fastest_claim_days, 't', 't' from identities i join identity_profiles p on p.identity_id=i.id where i.id='$RC';")
row "6.1 repeat-claimer lookup returns full profile" "$exp" "$res" "$([ "$res" = "$exp" ] && echo PASS || echo FAIL)" "merchant: $RCMNAME; grade probable, 18 claims"
fcd=$(echo "$res" | cut -d'|' -f8)
row "6.1 fastest_claim_days non-null, not 99999" "non-null < 99999" "$fcd" "$([ -n "$fcd" ] && [ "$fcd" != "99999" ] && echo PASS || echo FAIL)" ""

# ── 6.2 unknown identity
UH=$(H "v2test-never-seen-identifier-xyz")
lc0=$(svc "select count(*) from network_access_log;")
r=$(svc "select count(*) from lookup_network_identity('$MQ','[{\"type\":\"email\",\"hash\":\"$UH\"}]'::jsonb,null);")
lc1=$(svc "select count(*) from network_access_log;")
lastlog=$(svc "select matched_identity_count || '|' || k_anonymity_satisfied from network_access_log where merchant_id='$MQ' order by created_at desc limit 1;")
row "6.2 unknown hash returns 0 rows (no error)" "0" "$r" "$([ "$r" = "0" ] && echo PASS || echo FAIL)" ""
row "6.2 unknown lookup still logged" "+1 row, matched=0" "+$((lc1 - lc0)), $lastlog" "$([ $((lc1 - lc0)) = 1 ] && echo "$lastlog" | grep -q '^0|' && echo PASS || echo FAIL)" "k_anonymity_satisfied defaults true when no ids matched"

# ── 6.3 multiple hashes, one identity
E100=$(H "v2testt100@v2test.example")
P100=$(H "+14155550100")
PF100=$(H "v2test_gw:4100")
r=$(svc "select count(*), count(distinct identity_id) from lookup_network_identity('$MA','[{\"type\":\"email\",\"hash\":\"$E100\"},{\"type\":\"phone\",\"hash\":\"$P100\"},{\"type\":\"payment_fingerprint\",\"hash\":\"$PF100\"}]'::jsonb,null);")
row "6.3 three hashes of one identity → 1 row" "1|1" "$r" "$([ "$r" = "1|1" ] && echo PASS || echo FAIL)" "email+phone+payment_fingerprint"

# ── 6.4 superseded identity excluded
LEFT=$(g "['premerge']['left']")
RIGHT=$(g "['premerge']['right']")
M1H=$(g "['hashes']['m1_email']['hash']")
r=$(svc "select string_agg(identity_id::text, ',') from lookup_network_identity('$MA','[{\"type\":\"email\",\"hash\":\"$M1H\"}]'::jsonb,null);")
v=FAIL; [ "$r" = "$RIGHT" ] && v=PASS
row "6.4 superseded identity never returned" "winner $RIGHT only" "${r:-empty}" "$v" "superseded=$LEFT excluded by superseded_by filter"

# ── 6.5 non-canonical edge ordering
NC1=$(H "v2test-edge-nc-1-$$")
NC2=$(H "v2test-edge-nc-2-$$")
OID=$(g "['orders']['v2t-g1-1']")
# deliberately reversed: left=email_root > right=email
r=$(svc "select ingest_identity_observations('$MA','[]'::jsonb,'[{\"left_type\":\"email_root\",\"left_hash\":\"$NC1\",\"right_type\":\"email\",\"right_hash\":\"$NC2\"}]'::jsonb);")
n=$(svc "select count(*) from identity_edges where (left_hash='$NC1' and right_hash='$NC2') or (left_hash='$NC2' and right_hash='$NC1');")
row "6.5 non-canonical edge silently dropped" "no error, 0 rows" "err:'$(echo "$r" | head -1 | grep -o ERROR || echo none)' rows:$n" "$([ "$n" = "0" ] && ! echo "$r" | grep -q ERROR && echo PASS || echo FAIL)" ""
r=$(svc "select ingest_identity_observations('$MA','[]'::jsonb,'[{\"left_type\":\"email\",\"left_hash\":\"$NC2\",\"right_type\":\"email_root\",\"right_hash\":\"$NC1\"}]'::jsonb);")
n=$(svc "select count(*) from identity_edges where left_hash='$NC2' and right_hash='$NC1';")
row "6.5 canonical version inserted" "1 row" "$n" "$([ "$n" = "1" ] && echo PASS || echo FAIL)" ""

# ── 6.6 invalid hash format rejected atomically
VH=$(H "v2test-valid-with-invalid-$$@v2test.example")
r=$(svc "select ingest_identity_observations('$MA','[{\"identifier_type\":\"email\",\"identifier_hash\":\"invalid\",\"source\":\"csv\",\"source_order_id\":\"$OID\"},{\"identifier_type\":\"email\",\"identifier_hash\":\"$VH\",\"source\":\"csv\",\"source_order_id\":\"$OID\"}]'::jsonb,'[]'::jsonb);")
n1=$(svc "select count(*) from identity_signals where identifier_hash='invalid';")
n2=$(svc "select count(*) from identity_signals where identifier_hash='$VH';")
row "6.6 invalid hash rejected by CHECK" "constraint violation error" "$(echo "$r" | head -1 | cut -c1-70)" "$(echo "$r" | grep -q 'identity_signals_hash_format' && echo PASS || echo FAIL)" ""
row "6.6 no partial commit (valid row in same call also absent)" "0|0" "$n1|$n2" "$([ "$n1" = "0" ] && [ "$n2" = "0" ] && echo PASS || echo FAIL)" "statement-level atomicity"

# ── 6.7 increment_job_progress concurrency
JOB=$(svc "insert into sync_jobs (merchant_id, job_kind, source, status, label, total_rows) values ('$MA','csv_audit','csv','running','v2test concurrency', 100) returning id;" | head -1)
psql "$DB" -X -q -c "begin; select increment_job_progress('$JOB', 5, 1); select pg_sleep(4); commit;" &
P1=$!
sleep 1
T0=$(date +%s)
psql "$DB" -X -q -c "begin; select increment_job_progress('$JOB', 7, 2); commit;" &
P2=$!
wait $P1 $P2
T1=$(date +%s)
fin=$(svc "select processed_rows || '|' || failed_rows from sync_jobs where id='$JOB';")
row "6.7 concurrent increments both applied" "12|3" "$fin" "$([ "$fin" = "12|3" ] && echo PASS || echo FAIL)" "second tx blocked ~$((T1 - T0))s on row lock, then applied"

column -t -s$'\t' "$OUT"
