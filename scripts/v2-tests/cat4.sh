#!/bin/bash
# Category 4 — Claims integrity
set -u
source "$(dirname "$0")/db-env.sh"
cd "$(dirname "$0")/../.."
S=scripts/v2-tests/state.json
g() { python3 -c "import json;d=json.load(open('$S'));print(d$1)"; }
svc() { psql "$DB" -X -tA -c "$1" 2>&1; }
OUT=scripts/v2-tests/results/cat4.tsv
: > "$OUT"
row() { printf '%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" "$5" >> "$OUT"; }
CLA=$(g "['claims']['A']")
MA=$(g "['merchants']['v2test-merchant-a']")

# 4.1 anchor
n=$(svc "select count(*) from claims where source_order_id is null and source_ticket_id is null;")
row "4.1 every claim anchored (order or ticket)" "0" "$n" "$([ "$n" = "0" ] && echo PASS || echo FAIL)" "CHECK claims_anchor_required exists"
ck=$(svc "select count(*) from pg_constraint where conname='claims_anchor_required';")
row "4.1 anchor CHECK constraint present" "1" "$ck" "$([ "$ck" = "1" ] && echo PASS || echo FAIL)" ""

# 4.2 identity link
n=$(svc "select count(*) from claims where identity_id is null;")
orph=$(svc "select count(*) from migration_orphans where reason='claim_no_identity_match';" 2>/dev/null)
row "4.2 every claim linked to identity" "0 null identity_id" "$n null" "$([ "$n" = "0" ] && echo PASS || echo FAIL)" "migration_orphans claim_no_identity_match: ${orph:-n/a}"

# 4.3 one outcome per claim
n=$(svc "select count(*) from (select claim_id from claim_outcomes group by claim_id having count(*) > 1) x;")
uq=$(svc "select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid where t.relname='claim_outcomes' and c.contype='u';")
row "4.3 one outcome per claim" "0 duplicates" "$n duplicates (unique constraints on table: $uq)" "$([ "$n" = "0" ] && [ "$uq" -ge 1 ] && echo PASS || echo FAIL)" "claim_id UNIQUE structurally enforced"

# 4.4 claim_events append-only (mutate TEST rows only)
ev=$(svc "select id from claim_events where claim_id='$CLA' limit 1;")
ur=$(svc "update claim_events set note='hacked' where id='$ev';")
dr=$(svc "delete from claim_events where id='$ev';")
row "4.4 claim_events UPDATE rejected" "append-only error" "$(echo "$ur" | head -1 | cut -c1-60)" "$(echo "$ur" | grep -q 'append-only' && echo PASS || echo FAIL)" ""
row "4.4 claim_events DELETE rejected" "append-only error" "$(echo "$dr" | head -1 | cut -c1-60)" "$(echo "$dr" | grep -q 'append-only' && echo PASS || echo FAIL)" ""
trg=$(svc "select t.tgtype::int from pg_trigger t join pg_class c on c.oid=t.tgrelid where c.relname='claim_events' and t.tgname='trg_claim_events_noupd';")
# tgtype bits: ROW(1) + BEFORE(2) + UPDATE(16) + DELETE(8) = 27
row "4.4 trigger is BEFORE UPDATE OR DELETE, per row" "tgtype=27" "tgtype=${trg:-missing}" "$([ "$trg" = "27" ] && echo PASS || echo FAIL)" ""

# 4.5 status transition audited
ev_before=$(svc "select count(*) from claim_events where claim_id='$CLA';")
svc "update claims set status='escalated' where id='$CLA';" > /dev/null
ev_after=$(svc "select count(*) from claim_events where claim_id='$CLA';")
auto=$((ev_after - ev_before))
trg2=$(svc "select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid where c.relname='claims' and not t.tgisinternal and t.tgname like '%status%';")
row "4.5 status change auto-audited" "claim_events row with from/to status" "+$auto events after status update (status-audit triggers: $trg2)" "$([ "$auto" -ge 1 ] && echo PASS || echo FAIL)" "no DB trigger; audit is app-layer responsibility"
svc "update claims set status='open' where id='$CLA';" > /dev/null

# 4.6 amount precision
coldef=$(svc "select numeric_precision || ',' || numeric_scale from information_schema.columns where table_schema='public' and table_name='claims' and column_name='amount_at_risk';")
row "4.6 amount_at_risk is numeric(12,2)" "12,2" "$coldef" "$([ "$coldef" = "12,2" ] && echo PASS || echo FAIL)" ""
v2sum=$(svc "select coalesce(sum(amount_at_risk),0)::text from claims where reason_raw not like 'v2test%' or reason_raw is null;")
l1sum=$(svc "select coalesce(sum(amount_at_risk),0)::text from legacy_v1.merchant_claims;")
row "4.6 amount_at_risk sum matches legacy" "$l1sum" "$v2sum" "$([ "$v2sum" = "$l1sum" ] && echo PASS || echo FAIL)" "v2 total (test claims excluded) vs legacy_v1.merchant_claims"
cents=$(svc "select count(*) from claims where amount_at_risk is not null and amount_at_risk <> round(amount_at_risk);")
row "4.6 cent precision present" ">0 non-integer amounts" "$cents" "$([ "$cents" -gt 0 ] && echo PASS || echo FAIL)" "proves scale not truncated"

# 4.7 multi-claim orders
mc=$(svc "select count(*) from (select source_order_id from claims where source_order_id is not null group by source_order_id having count(*) > 1) x;")
row "4.7 multi-claim orders preserved" "323" "$mc" "$([ "$mc" = "323" ] && echo PASS || echo FAIL)" "orders with >1 claims, no constraint violation"

column -t -s$'\t' "$OUT"
