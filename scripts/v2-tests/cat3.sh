#!/bin/bash
# Category 3 — Ingestion pipeline (live webhook calls against localhost:3000)
set -u
DB="postgresql://postgres.lquvbikyvmbjbfffrlky@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
export PGPASSWORD='Boyo19961996!uuu'
cd "$(dirname "$0")/../.."
S=scripts/v2-tests/state.json
g() { python3 -c "import json;d=json.load(open('$S'));print(d$1)"; }
svc() { psql "$DB" -X -tA -c "$1" 2>&1; }
OUT=scripts/v2-tests/results/cat3.tsv
: > "$OUT"
row() { printf '%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" "$5" >> "$OUT"; }
MA=$(g "['merchants']['v2test-merchant-a']")
SHOP_SECRET=$(grep '^SHOPIFY_WEBHOOK_SECRET=' .env.local | cut -d= -f2-)
GORG_SECRET=$(grep '^GORGIAS_SUPPORT_WEBHOOK_SECRET=' .env.local | cut -d= -f2-)
BASE=http://localhost:3000

# ── 3.1 Shopify order webhook
BODY=$(cat <<'JSON'
{"id":920001,"order_number":"v2t-3001","email":"v2testshopify@v2test.example","contact_email":"v2testshopify@v2test.example","customer":{"id":770001,"email":"v2testshopify@v2test.example","phone":"+14155550171"},"phone":"+14155550171","browser_ip":"203.0.113.99","client_details":{"user_agent":"Mozilla/5.0 v2test"},"payment_gateway_names":["v2test_gw"],"payment_details":{"credit_card_number":"•••• •••• •••• 4242"},"financial_status":"paid","fulfillment_status":null,"total_price":"149.99","currency":"USD","landing_site":"/v2test","referring_site":"https://example.com","source_name":"web","line_items":[{"id":1,"title":"V2Test Product","quantity":1}],"shipping_address":{"address1":"301 Webhookv2test Street","address2":"Apt 9","city":"New York","province":"NY","zip":"10012","country":"US","country_code":"US"},"billing_address":{"address1":"301 Webhookv2test Street","address2":"Apt 9","city":"New York","province":"NY","zip":"10012","country":"US","country_code":"US"},"created_at":"2026-06-10T10:00:00Z","tags":""}
JSON
)
HMAC=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SHOP_SECRET" -binary | base64)
so_before=$(svc "select count(*) from source_orders;")
sig_before=$(svc "select count(*) from identity_signals;")
code1=$(curl -s -o /tmp/v2t-shopify1.json -w "%{http_code}" -m 30 -X POST "$BASE/api/shopify/webhooks" \
  -H "content-type: application/json" -H "x-shopify-hmac-sha256: $HMAC" \
  -H "x-shopify-shop-domain: v2test-store.myshopify.com" -H "x-shopify-topic: orders/create" \
  -H "x-shopify-webhook-id: v2test-wh-001" --data-binary "$BODY")
sleep 2
so_after=$(svc "select count(*) from source_orders;")
sig_after=$(svc "select count(*) from identity_signals;")
so_row=$(svc "select count(*) from source_orders where external_id='920001' or order_number='v2t-3001';")
row "3.1 webhook accepted (HTTP)" "2xx" "HTTP $code1 body:$(cut -c1-60 /tmp/v2t-shopify1.json)" "$(echo "$code1" | grep -qE '^2' && echo PASS || echo FAIL)" ""
row "3.1 source_orders row created" "1 row for order 920001" "$so_row rows (table delta $((so_after - so_before)))" "$([ "$so_row" -ge 1 ] && echo PASS || echo FAIL)" "route writes legacy shopify_order_signals shape"
row "3.1 identity_signals emitted" ">=5 (email,email_root,ship,bill,ip,payment)" "+$((sig_after - sig_before))" "$([ $((sig_after - sig_before)) -ge 5 ] && echo PASS || echo FAIL)" "via ingest_identity_observations"
pw1=$(svc "select status || '|' || attempts::text from processed_webhooks where idempotency_key like '%v2test-wh-001%';")
row "3.1 processed_webhooks claimed" "1 row" "${pw1:-none}" "$([ -n "$pw1" ] && echo PASS || echo FAIL)" ""

# ── 3.2 idempotency: resend identical webhook
code2=$(curl -s -o /tmp/v2t-shopify2.json -w "%{http_code}" -m 30 -X POST "$BASE/api/shopify/webhooks" \
  -H "content-type: application/json" -H "x-shopify-hmac-sha256: $HMAC" \
  -H "x-shopify-shop-domain: v2test-store.myshopify.com" -H "x-shopify-topic: orders/create" \
  -H "x-shopify-webhook-id: v2test-wh-001" --data-binary "$BODY")
sleep 1
pwc=$(svc "select count(*) from processed_webhooks where idempotency_key like '%v2test-wh-001%';")
so_row2=$(svc "select count(*) from source_orders where external_id='920001' or order_number='v2t-3001';")
sig_after2=$(svc "select count(*) from identity_signals;")
row "3.2 duplicate webhook handled" "HTTP 200 duplicate" "HTTP $code2 body:$(cut -c1-60 /tmp/v2t-shopify2.json)" "$(echo "$code2" | grep -qE '^2' && echo PASS || echo FAIL)" ""
row "3.2 processed_webhooks single row" "1" "$pwc" "$([ "$pwc" = "1" ] && echo PASS || echo FAIL)" "idempotency_key is PK"
row "3.2 source_orders not duplicated" "still $so_row" "$so_row2" "$([ "$so_row2" = "$so_row" ] && echo PASS || echo FAIL)" ""
row "3.2 identity_signals not doubled" "+0" "+$((sig_after2 - sig_after))" "$([ "$sig_after2" = "$sig_after" ] && echo PASS || echo FAIL)" ""

# ── 3.3 Gorgias ticket webhook
svc "insert into source_customers (merchant_id, source, external_id, email, first_name, last_name) values ('$MA','shopify','v2t-cust-3001','v2testgorgias@v2test.example','V2','Test') on conflict do nothing;" > /dev/null
st_before=$(svc "select count(*) from source_tickets;")
GBODY=$(cat <<'JSON'
{"ticket":{"id":"880001","subject":"v2test: order never arrived","customer":{"id":"99001","email":"v2testgorgias@v2test.example","external_id":"v2t-cust-3001"},"messages":[{"body":"My order #v2t-3001 never arrived, I want a refund","from_agent":false,"sender_type":"customer"}],"tags":["refund-requested"],"created_datetime":"2026-06-11T08:00:00Z"}}
JSON
)
gcode=$(curl -s -o /tmp/v2t-gorgias1.json -w "%{http_code}" -m 30 -X POST "$BASE/api/gorgias/support-webhook" \
  -H "content-type: application/json" -H "x-unauth-gorgias-secret: $GORG_SECRET" \
  -H "x-unauth-merchant-id: $MA" --data-binary "$GBODY")
sleep 2
st_after=$(svc "select count(*) from source_tickets;")
st_row=$(svc "select count(*) from source_tickets where external_id='880001';")
st_link=$(svc "select count(*) from source_tickets t join source_customers c on c.id=t.source_customer_id where t.external_id='880001' and c.external_id='v2t-cust-3001';")
hd_sig=$(svc "select count(*) from identity_signals where identifier_type='helpdesk_contact_id' and identifier_hash like '%99001%';")
em_sig=$(svc "select count(*) from identity_signals s join source_tickets t on t.id=s.source_ticket_id where t.external_id='880001';")
row "3.3 Gorgias webhook accepted (HTTP)" "2xx" "HTTP $gcode body:$(cut -c1-80 /tmp/v2t-gorgias1.json)" "$(echo "$gcode" | grep -qE '^2' && echo PASS || echo FAIL)" ""
row "3.3 source_tickets row created" "1 row id=880001" "$st_row rows (delta $((st_after - st_before)))" "$([ "$st_row" -ge 1 ] && echo PASS || echo FAIL)" ""
row "3.3 source_customer_id linked via external_id" "1" "$st_link" "$([ "$st_link" = "1" ] && echo PASS || echo FAIL)" ""
row "3.3 helpdesk_contact_id signal emitted" ">=1" "$hd_sig" "$([ "$hd_sig" -ge 1 ] && echo PASS || echo FAIL)" ""
row "3.3 email signal emitted (ticket provenance)" ">=1" "$em_sig" "$([ "$em_sig" -ge 1 ] && echo PASS || echo FAIL)" ""

# ── 3.4 malformed payloads
mb=$(svc "select count(*) from source_orders;")
mcode1=$(curl -s -o /dev/null -w "%{http_code}" -m 30 -X POST "$BASE/api/shopify/webhooks" \
  -H "content-type: application/json" -H "x-shopify-hmac-sha256: invalid" \
  -H "x-shopify-shop-domain: v2test-store.myshopify.com" -H "x-shopify-topic: orders/create" \
  -H "x-shopify-webhook-id: v2test-wh-bad1" --data-binary '{}')
row "3.4 Shopify bad HMAC rejected" "401" "$mcode1" "$([ "$mcode1" = "401" ] && echo PASS || echo FAIL)" ""
EMPTY='{}'
EH=$(printf '%s' "$EMPTY" | openssl dgst -sha256 -hmac "$SHOP_SECRET" -binary | base64)
mcode2=$(curl -s -o /tmp/v2t-shopempty.json -w "%{http_code}" -m 30 -X POST "$BASE/api/shopify/webhooks" \
  -H "content-type: application/json" -H "x-shopify-hmac-sha256: $EH" \
  -H "x-shopify-shop-domain: v2test-store.myshopify.com" -H "x-shopify-topic: orders/create" \
  -H "x-shopify-webhook-id: v2test-wh-bad2" --data-binary "$EMPTY")
row "3.4 Shopify missing order id" "graceful (2xx skip, no crash)" "HTTP $mcode2" "$(echo "$mcode2" | grep -qE '^(2|4)' && echo PASS || echo FAIL)" "$(cut -c1-50 /tmp/v2t-shopempty.json)"
BADIP=$(echo "$BODY" | sed 's/203.0.113.99/unknown/; s/920001/920002/; s/v2t-3001/v2t-3002/')
BH=$(printf '%s' "$BADIP" | openssl dgst -sha256 -hmac "$SHOP_SECRET" -binary | base64)
mcode3=$(curl -s -o /dev/null -w "%{http_code}" -m 30 -X POST "$BASE/api/shopify/webhooks" \
  -H "content-type: application/json" -H "x-shopify-hmac-sha256: $BH" \
  -H "x-shopify-shop-domain: v2test-store.myshopify.com" -H "x-shopify-topic: orders/create" \
  -H "x-shopify-webhook-id: v2test-wh-bad3" --data-binary "$BADIP")
badip_rows=$(svc "select count(*) from source_orders where external_id='920002';")
row "3.4 Shopify invalid browser_ip 'unknown'" "no crash, no bad inet row" "HTTP $mcode3, rows:$badip_rows" "$(echo "$mcode3" | grep -qE '^(2|4)' && echo PASS || echo FAIL)" ""
ma=$(svc "select count(*) from source_orders;")
row "3.4 no partial source_orders rows from malformed" "0 delta" "+$((ma - mb))" "$([ "$ma" = "$mb" ] && echo PASS || echo FAIL)" ""
gcode2=$(curl -s -o /tmp/v2t-gorgbad.json -w "%{http_code}" -m 30 -X POST "$BASE/api/gorgias/support-webhook" \
  -H "content-type: application/json" -H "x-unauth-gorgias-secret: $GORG_SECRET" \
  -H "x-unauth-merchant-id: $MA" --data-binary '{"ticket":{"subject":"no id"}}')
row "3.4 Gorgias missing ticket.id" "400" "HTTP $gcode2 $(cut -c1-40 /tmp/v2t-gorgbad.json)" "$([ "$gcode2" = "400" ] && echo PASS || echo FAIL)" ""
gcode3=$(curl -s -o /dev/null -w "%{http_code}" -m 30 -X POST "$BASE/api/gorgias/support-webhook" \
  -H "content-type: application/json" --data-binary '{"ticket":{"id":"880002"}}')
row "3.4 Gorgias no auth" "4xx denial" "HTTP $gcode3" "$(echo "$gcode3" | grep -qE '^4' && echo PASS || echo FAIL)" "identity check precedes auth (400)"
gjunk=$(curl -s -o /dev/null -w "%{http_code}" -m 30 -X POST "$BASE/api/gorgias/support-webhook" \
  -H "content-type: application/json" -H "x-unauth-gorgias-secret: $GORG_SECRET" -H "x-unauth-merchant-id: $MA" --data-binary 'not json {{')
row "3.4 Gorgias invalid JSON" "400" "HTTP $gjunk" "$([ "$gjunk" = "400" ] && echo PASS || echo FAIL)" ""

# ── 3.5 ingest_identity_observations dedupe (direct RPC)
OID=$(g "['orders']['v2t-g1-1']")
EH1=$(npx tsx --env-file=.env.local scripts/v2-tests/hash.ts "v2testdedupe@v2test.example" | tail -1)
RH1=$(npx tsx --env-file=.env.local scripts/v2-tests/hash.ts "v2testdedupe-root@v2test.example" | tail -1)
PAYLOAD_SIG="[{\"identifier_type\":\"email\",\"identifier_hash\":\"$EH1\",\"source\":\"csv\",\"source_order_id\":\"$OID\"}]"
LT=email; LH=$EH1; RT=email_root; RH=$RH1
if [ "$(printf '%s|%s\n%s|%s\n' "$LT" "$LH" "$RT" "$RH" | sort | head -1)" != "$LT|$LH" ]; then LT=email_root; LH=$RH1; RT=email; RH=$EH1; fi
PAYLOAD_EDGE="[{\"left_type\":\"$LT\",\"left_hash\":\"$LH\",\"right_type\":\"$RT\",\"right_hash\":\"$RH\",\"count_delta\":1}]"
s1=$(svc "select count(*) from identity_signals where identifier_hash='$EH1';")
svc "select ingest_identity_observations('$MA','$PAYLOAD_SIG'::jsonb,'$PAYLOAD_EDGE'::jsonb);" > /dev/null
s2=$(svc "select count(*) from identity_signals where identifier_hash='$EH1';")
e2=$(svc "select seen_count from identity_edges where left_hash='$LH' and right_hash='$RH';")
svc "select ingest_identity_observations('$MA','$PAYLOAD_SIG'::jsonb,'$PAYLOAD_EDGE'::jsonb);" > /dev/null
s3=$(svc "select count(*) from identity_signals where identifier_hash='$EH1';")
e3=$(svc "select seen_count from identity_edges where left_hash='$LH' and right_hash='$RH';")
ecount=$(svc "select count(*) from identity_edges where left_hash='$LH' and right_hash='$RH';")
row "3.5 signal not duplicated on second call" "count stays 1" "before:$s1 first:$s2 second:$s3" "$([ "$s2" = "1" ] && [ "$s3" = "1" ] && echo PASS || echo FAIL)" "ON CONFLICT DO NOTHING"
row "3.5 edge seen_count incremented not duplicated" "1 row, seen_count 1→2" "rows:$ecount seen:$e2→$e3" "$([ "$ecount" = "1" ] && [ "$e2" = "1" ] && [ "$e3" = "2" ] && echo PASS || echo FAIL)" ""

column -t -s$'\t' "$OUT"
