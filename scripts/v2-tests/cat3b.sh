#!/bin/bash
# Category 3 corrections: Gorgias with correct secret header; 3.5 canonical edge fix
set -u
source "$(dirname "$0")/db-env.sh"
cd "$(dirname "$0")/../.."
S=scripts/v2-tests/state.json
g() { python3 -c "import json;d=json.load(open('$S'));print(d$1)"; }
svc() { psql "$DB" -X -tA -c "$1" 2>&1; }
OUT=scripts/v2-tests/results/cat3b.tsv
: > "$OUT"
row() { printf '%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" "$5" >> "$OUT"; }
MA=$(g "['merchants']['v2test-merchant-a']")
GORG_SECRET=$(grep '^GORGIAS_SUPPORT_WEBHOOK_SECRET=' .env.local | cut -d= -f2-)
BASE=http://localhost:3000

st_before=$(svc "select count(*) from source_tickets;")
GBODY='{"ticket":{"id":"880001","subject":"v2test: order never arrived","customer":{"id":"99001","email":"v2testgorgias@v2test.example","external_id":"v2t-cust-3001"},"messages":[{"body":"My order #v2t-3001 never arrived, I want a refund","from_agent":false,"sender_type":"customer"}],"tags":["refund-requested"],"created_datetime":"2026-06-11T08:00:00Z"}}'
gcode=$(curl -s -o /tmp/v2t-gorgias2.json -w "%{http_code}" -m 60 -X POST "$BASE/api/gorgias/support-webhook" \
  -H "content-type: application/json" -H "x-unauth-gorgias-secret: $GORG_SECRET" \
  -H "x-unauth-merchant-id: $MA" --data-binary "$GBODY")
sleep 2
st_after=$(svc "select count(*) from source_tickets;")
st_row=$(svc "select count(*) from source_tickets where external_id='880001';")
st_link=$(svc "select count(*) from source_tickets t join source_customers c on c.id=t.source_customer_id where t.external_id='880001' and c.external_id='v2t-cust-3001';")
em_sig=$(svc "select count(*) from identity_signals s join source_tickets t on t.id=s.source_ticket_id where t.external_id='880001';")
hd_sig=$(svc "select count(*) from identity_signals where identifier_type='helpdesk_contact_id' and identifier_hash like '%99001%';")
row "3.3 Gorgias webhook accepted (HTTP, corrected header)" "2xx" "HTTP $gcode body:$(cut -c1-120 /tmp/v2t-gorgias2.json)" "$(echo "$gcode" | grep -qE '^2' && echo PASS || echo FAIL)" "x-unauth-gorgias-secret + dev merchant header"
row "3.3 source_tickets row created" "1 row id=880001" "$st_row rows (delta $((st_after - st_before)))" "$([ "$st_row" -ge 1 ] && echo PASS || echo FAIL)" ""
row "3.3 source_customer_id linked via external_id" "1" "$st_link" "$([ "$st_link" = "1" ] && echo PASS || echo FAIL)" ""
row "3.3 helpdesk_contact_id signal emitted" ">=1" "$hd_sig" "$([ "$hd_sig" -ge 1 ] && echo PASS || echo FAIL)" ""
row "3.3 email signal emitted (ticket provenance)" ">=1" "$em_sig" "$([ "$em_sig" -ge 1 ] && echo PASS || echo FAIL)" ""

# no-auth nuance: which code?
gcode3=$(curl -s -o /tmp/v2t-gorgnoauth.json -w "%{http_code}" -m 30 -X POST "$BASE/api/gorgias/support-webhook" \
  -H "content-type: application/json" --data-binary '{"ticket":{"id":"880002"}}')
row "3.4 Gorgias no auth (detail)" "401 or 4xx denial" "HTTP $gcode3 $(cut -c1-80 /tmp/v2t-gorgnoauth.json)" "$(echo "$gcode3" | grep -qE '^4' && echo PASS || echo FAIL)" "request denied; code may be 400 identity-required before auth"

# 3.5 canonical edge (type compares first: email < email_root)
OID=$(g "['orders']['v2t-g1-1']")
EH1=$(npx tsx --env-file=.env.local scripts/v2-tests/hash.ts "v2testdedupe2@v2test.example" | tail -1)
RH1=$(npx tsx --env-file=.env.local scripts/v2-tests/hash.ts "v2testdedupe2-root@v2test.example" | tail -1)
SIG="[{\"identifier_type\":\"email\",\"identifier_hash\":\"$EH1\",\"source\":\"csv\",\"source_order_id\":\"$OID\"}]"
EDGE="[{\"left_type\":\"email\",\"left_hash\":\"$EH1\",\"right_type\":\"email_root\",\"right_hash\":\"$RH1\",\"count_delta\":1}]"
svc "select ingest_identity_observations('$MA','$SIG'::jsonb,'$EDGE'::jsonb);" > /dev/null
s2=$(svc "select count(*) from identity_signals where identifier_hash='$EH1';")
e2=$(svc "select seen_count from identity_edges where left_hash='$EH1' and right_hash='$RH1';")
svc "select ingest_identity_observations('$MA','$SIG'::jsonb,'$EDGE'::jsonb);" > /dev/null
s3=$(svc "select count(*) from identity_signals where identifier_hash='$EH1';")
e3=$(svc "select seen_count from identity_edges where left_hash='$EH1' and right_hash='$RH1';")
ec=$(svc "select count(*) from identity_edges where left_hash='$EH1' and right_hash='$RH1';")
row "3.5 signal not duplicated on second call" "1 then 1" "first:$s2 second:$s3" "$([ "$s2" = "1" ] && [ "$s3" = "1" ] && echo PASS || echo FAIL)" "ON CONFLICT DO NOTHING"
row "3.5 edge seen_count incremented not duplicated" "1 row, 1→2" "rows:$ec seen:$e2→$e3" "$([ "$ec" = "1" ] && [ "$e2" = "1" ] && [ "$e3" = "2" ] && echo PASS || echo FAIL)" ""

column -t -s$'\t' "$OUT"
