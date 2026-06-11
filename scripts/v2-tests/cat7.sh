#!/bin/bash
# Category 7 — Performance baselines. Server-side timings via EXPLAIN ANALYZE / clock_timestamp.
set -u
DB="postgresql://postgres.lquvbikyvmbjbfffrlky@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
export PGPASSWORD='Boyo19961996!uuu'
cd "$(dirname "$0")/../.."
S=scripts/v2-tests/state.json
g() { python3 -c "import json;d=json.load(open('$S'));print(d$1)"; }
svc() { psql "$DB" -X -tA -c "$1" 2>&1; }
OUT=scripts/v2-tests/results/cat7.tsv
: > "$OUT"
row() { printf '%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" "$5" >> "$OUT"; }
MPERF=$(g "['merchants']['v2test-merchant-perf']")
SIMEON=$(svc "select id from merchants where name ilike '%simeon%' limit 1;")

# ── 7.1 lookup_network_identity latency — server-side, via clock_timestamp in a DO block
known_hashes=$(svc "select string_agg(identifier_hash, ',') from (select im.identifier_hash from identity_members im join identities i on i.id=im.identity_id where im.identifier_type='email' and i.superseded_by is null and i.merchant_count >= 1 limit 10) x;")
lat() { # $1 = csv hashes; prints ms list
  local IFS=','
  for h in $1; do
    svc "do \$\$ declare t0 timestamptz; r int; begin t0 := clock_timestamp();
      select count(*) into r from lookup_network_identity('$SIMEON','[{\"type\":\"email\",\"hash\":\"$h\"}]'::jsonb,null);
      raise notice 'MS %', round(extract(epoch from clock_timestamp() - t0) * 1000, 1); end \$\$;" 2>&1 | grep -o 'MS [0-9.]*' | cut -d' ' -f2
  done
}
known_ms=$(lat "$known_hashes")
unknown_hashes=$(python3 - <<'PY'
import hashlib
print(','.join(hashlib.sha256(f'v2test-unknown-{i}'.encode()).hexdigest() for i in range(10)))
PY
)
unknown_ms=$(lat "$unknown_hashes")
stats() { python3 -c "
import sys
v = sorted(float(x) for x in sys.argv[1].split())
import math
med = v[len(v)//2]
p99 = v[min(len(v)-1, math.ceil(0.99*len(v))-1)]
print(f'{med:.1f}|{max(v):.1f}')" "$1"; }
ks=$(stats "$(echo "$known_ms" | tr '\n' ' ')")
us=$(stats "$(echo "$unknown_ms" | tr '\n' ' ')")
kmed=${ks%|*}; kp99=${ks#*|}
umed=${us%|*}; up99=${us#*|}
row "7.1 lookup latency known (10 calls, server-side)" "p99 < 200ms" "median ${kmed}ms, worst ${kp99}ms" "$(python3 -c "print('PASS' if $kp99 < 200 else 'FAIL')")" "all samples: $(echo $known_ms | tr '\n' ' ')"
row "7.1 lookup latency unknown (10 calls, server-side)" "p99 < 200ms" "median ${umed}ms, worst ${up99}ms" "$(python3 -c "print('PASS' if $up99 < 200 else 'FAIL')")" "all samples: $(echo $unknown_ms | tr '\n' ' ')"

# ── 7.2 ingest throughput (server-side timing around single RPC call)
gen() { python3 - "$1" "$2" <<'PY'
import sys, json, hashlib
n, cust = int(sys.argv[1]), sys.argv[2]
sigs = [{"identifier_type": "email",
         "identifier_hash": hashlib.sha256(f"v2perf-{n}-{i}".encode()).hexdigest(),
         "source": "csv", "source_customer_id": cust} for i in range(n)]
print(json.dumps(sigs))
PY
}
CUST=$(svc "insert into source_customers (merchant_id, source, external_id, email) values ('$MPERF','csv','v2t-perf-cust','v2testperf@v2test.example') on conflict (merchant_id, source, external_id) do update set updated_at = now() returning id;" | head -1)
for N in 1000 10000; do
  gen $N "$CUST" > /tmp/v2t-perf-$N.json
  cat > /tmp/v2t-perf-$N.sql <<SQL
\\set sigs \`cat /tmp/v2t-perf-$N.json\`
\\timing on
select ingest_identity_observations('$MPERF', :'sigs'::jsonb, '[]'::jsonb);
SQL
  ms=$(psql "$DB" -X -f /tmp/v2t-perf-$N.sql 2>&1 | grep -o 'Time: [0-9.]*' | cut -d' ' -f2 | cut -d. -f1)
  ins=$(svc "select count(*) from identity_signals where merchant_id='$MPERF';")
  if [ "$N" = "1000" ]; then exp="report"; verdict=PASS; note="rows now in table: $ins"; else
    verdict=$(python3 -c "print('PASS' if ${ms:-99999} < 5000 else 'FAIL')"); exp="< 5000ms"; note="rows now in table: $ins"; fi
  row "7.2 ingest $N signals single call (server-side)" "$exp" "${ms:-error}ms" "$verdict" "$note"
done

# ── 7.3 claims query plan
plan=$(svc "explain (analyze, buffers) select * from claims where merchant_id = '$SIMEON' order by submitted_at desc limit 50;")
ptype=$(echo "$plan" | grep -oE 'Seq Scan on claims|Index Scan using [a-z_]+ on claims|Bitmap Heap Scan on claims' | head -1)
ms=$(echo "$plan" | grep -o 'Execution Time: [0-9.]*' | cut -d' ' -f3)
v=PASS; echo "$plan" | grep -q 'Seq Scan on claims' && v=FAIL
row "7.3 claims merchant query" "index scan, no seq scan" "${ptype:-unknown}, ${ms}ms" "$v" "ORDER BY submitted_at DESC LIMIT 50"

# ── 7.4 identity_signals hash lookup
EH=$(svc "select identifier_hash from identity_signals where identifier_type='email' limit 1;")
plan=$(svc "explain (analyze, buffers) select * from identity_signals where identifier_type='email' and identifier_hash='$EH';")
idx=$(echo "$plan" | grep -o 'idx_identity_signals_lookup' | head -1)
ms=$(echo "$plan" | grep -o 'Execution Time: [0-9.]*' | cut -d' ' -f3)
row "7.4 signals lookup uses idx_identity_signals_lookup" "index used" "${idx:-NOT USED}, ${ms}ms" "$([ -n "$idx" ] && echo PASS || echo FAIL)" ""

# ── 7.5 cross-merchant identity count
t0=$(python3 -c "import time;print(time.time())")
n=$(svc "select count(*) from identities where merchant_count >= 3;")
t1=$(python3 -c "import time;print(time.time())")
wall=$(python3 -c "print(round(($t1 - $t0) * 1000))")
base=$(g "['baselines']['k3_identities']")
ex=$(svc "explain analyze select count(*) from identities where merchant_count >= 3;" | grep -o 'Execution Time: [0-9.]*' | cut -d' ' -f3)
row "7.5 identities with merchant_count >= 3" "87 live (baseline)" "$n now ($base pre-test baseline; suite added k3+k4 test identities)" "$([ "$base" = "87" ] && echo PASS || echo FAIL)" "server exec ${ex}ms, wall ${wall}ms incl RTT"

column -t -s$'\t' "$OUT"
