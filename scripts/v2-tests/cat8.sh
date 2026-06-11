#!/bin/bash
# Category 8 — Widget integration (run after seed+resolve; app on :3000)
set -u
DB="postgresql://postgres.lquvbikyvmbjbfffrlky@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
export PGPASSWORD='Boyo19961996!uuu'
cd "$(dirname "$0")/../.."
S=scripts/v2-tests/state.json
g() { python3 -c "import json;d=json.load(open('$S'));print(d$1)"; }
svc() { psql "$DB" -X -tA -c "$1" 2>&1; }
OUT=scripts/v2-tests/results/cat8.tsv
: > "$OUT"
row() { printf '%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" "$5" >> "$OUT"; }
BASE=http://localhost:3000
TA=$(g "['widgetTokens']['valid_a']")
TR=$(g "['widgetTokens']['revoked_a']")
TB=$(g "['widgetTokens']['valid_b']")
MA=$(g "['merchants']['v2test-merchant-a']")
MB=$(g "['merchants']['v2test-merchant-b']")

wcall() { curl -s -o "$2" -w "%{http_code}" -m 30 "$BASE/api/gorgias/widget?widget_token=$1&email=$3&ticket_id=v2t-w1"; }

# ── 8.1 token auth matrix
c=$(wcall "$TA" /tmp/v2t-w-valid.json "v2testjane%40v2test.example")
row "8.1 valid token" "200" "$c" "$([ "$c" = "200" ] && echo PASS || echo FAIL)" ""
c2=$(wcall "$TR" /tmp/v2t-w-revoked.json "v2testjane%40v2test.example")
row "8.1 revoked token" "401" "$c2" "$([ "$c2" = "401" ] && echo PASS || echo FAIL)" ""
c3=$(curl -s -o /dev/null -w "%{http_code}" -m 30 "$BASE/api/gorgias/widget?email=x%40y.com")
row "8.1 no token" "401" "$c3" "$([ "$c3" = "401" ] && echo PASS || echo FAIL)" ""
c4=$(curl -s -o /dev/null -w "%{http_code}" -m 30 "$BASE/api/gorgias/widget?widget_token=unauth_wt_0123456789abcdef0123456789abcdef&email=x%40y.com")
row "8.1 unknown (well-formed) token" "401" "$c4" "$([ "$c4" = "401" ] && echo PASS || echo FAIL)" "was 500 before fix (missing token table)"
# cross-merchant: B token querying A-only customer (mc=1) → must see nothing
c5=$(wcall "$TB" /tmp/v2t-w-cross.json "v2testk1%40v2test.example")
crossleak=$(grep -c "1 order\|seen at" /tmp/v2t-w-cross.json || true)
v5=FAIL
[ "$c5" = "200" ] && ! grep -q "DEFINITE\|PROBABLE\|POSSIBLE\|WEAK matched" /tmp/v2t-w-cross.json && v5=PASS
row "8.1 B token + A-only customer" "no cross-merchant disclosure (k-anon)" "HTTP $c5, identity:'$(python3 -c "import json;print(json.load(open('/tmp/v2t-w-cross.json')).get('identity','?'))" 2>/dev/null)'" "$v5" "model: token scopes merchant; under-k identities invisible (spec's 403 N/A by design)"

# ── 8.2 response shape + PII absence (valid A token, known identity)
idfield=$(python3 -c "import json;print(json.load(open('/tmp/v2t-w-valid.json')).get('identity','MISSING'))" 2>/dev/null)
row "8.2 confidence grade present" "grade string" "identity: '$idfield'" "$(echo "$idfield" | grep -qiE 'definite|probable|possible|weak' && echo PASS || echo FAIL)" "v2 payload is formatted strings, not raw numerics (design divergence from spec, documented)"
pii=$(grep -cE "v2testjane@|v2testk1@" /tmp/v2t-w-valid.json || true)
hashes=$(grep -coE "[0-9a-f]{64}" /tmp/v2t-w-valid.json || true)
row "8.2 no raw PII in response" "0 emails" "$pii" "$([ "$pii" = "0" ] && echo PASS || echo FAIL)" ""
row "8.2 no identifier hashes in response" "0 64-hex strings" "$hashes" "$([ "$hashes" = "0" ] && echo PASS || echo FAIL)" ""
iid=$(svc "select im.identity_id from identity_members im where im.identifier_hash='$(g "['hashes']['g7_email']['hash']")' limit 1;")
leak=$(grep -c "$iid" /tmp/v2t-w-valid.json || true)
row "8.2 internal identity_id not exposed" "0 occurrences" "$leak" "$([ "$leak" = "0" ] && echo PASS || echo FAIL)" ""

# ── 8.3 unknown customer
c6=$(wcall "$TA" /tmp/v2t-w-unknown.json "v2testneverseen%40v2test.example")
uid=$(python3 -c "import json;d=json.load(open('/tmp/v2t-w-unknown.json'));print(d.get('identity','?'),'|',d.get('claims','?'))" 2>/dev/null)
v6=FAIL
[ "$c6" = "200" ] && echo "$uid" | grep -qiE "no identity match|no match|no prior|—" && v6=PASS
row "8.3 unknown customer valid response" "200, zero history" "HTTP $c6: $uid" "$v6" "no 404/500"

# ── 8.4 network_access_log written per widget call
l0=$(svc "select count(*) from network_access_log where merchant_id='$MA';")
wcall "$TA" /dev/null "v2testjane%40v2test.example" > /dev/null
sleep 1
l1=$(svc "select count(*) from network_access_log where merchant_id='$MA';")
lastrow=$(svc "select matched_identity_count || '|' || k_anonymity_satisfied from network_access_log where merchant_id='$MA' order by created_at desc limit 1;")
row "8.4 access log written on widget call" "+1 row" "+$((l1 - l0)), last: $lastrow" "$([ $((l1 - l0)) -ge 1 ] && echo PASS || echo FAIL)" "widget now reads via lookup_network_identity"

# ── 8.5 performance: 10 sequential calls
times=""
for i in $(seq 1 10); do
  t=$(curl -s -o /dev/null -w "%{time_total}" -m 30 "$BASE/api/gorgias/widget?widget_token=$TA&email=v2testjane%40v2test.example&ticket_id=v2t-w$i")
  times="$times $t"
done
stats=$(python3 -c "
import sys
v = sorted(float(x)*1000 for x in '''$times'''.split())
print(f'{v[len(v)//2]:.0f}|{v[-1]:.0f}')")
med=${stats%|*}; p99=${stats#*|}
row "8.5 widget latency (10 calls)" "p99 < 300ms" "median ${med}ms, worst ${p99}ms" "$(python3 -c "print('PASS' if $p99 < 300 else 'FAIL')")" "local dev server + eu-west-1 pooler RTT included"

column -t -s$'\t' "$OUT"
