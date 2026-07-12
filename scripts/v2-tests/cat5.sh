#!/bin/bash
# Category 5 — Data integrity
set -u
source "$(dirname "$0")/db-env.sh"
cd "$(dirname "$0")/../.."
svc() { psql "$DB" -X -tA -c "$1" 2>&1; }
OUT=scripts/v2-tests/results/cat5.tsv
: > "$OUT"
row() { printf '%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" "$5" >> "$OUT"; }

# ── 5.1 FK completeness: every table with a merchant_id column
tabs=$(svc "select string_agg(table_name, ' ') from information_schema.columns where table_schema='public' and column_name='merchant_id' and table_name in (select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE');")
bad_total=0
detail=""
for t in $tabs; do
  n=$(svc "select count(*) from $t x left join merchants m on m.id = x.merchant_id where m.id is null;")
  [ "$n" != "0" ] && { bad_total=$((bad_total + n)); detail="$detail $t:$n"; }
done
row "5.1 orphaned merchant_id rows ($(echo "$tabs" | wc -w | tr -d ' ') tables)" "0 in every table" "${bad_total} orphans${detail}" "$([ "$bad_total" = "0" ] && echo PASS || echo FAIL)" "tables: $tabs"
# other declared FKs validated structurally
nv=$(svc "select count(*) from pg_constraint where contype='f' and connamespace='public'::regnamespace and not convalidated;")
row "5.1 all FK constraints validated" "0 NOT VALID" "$nv" "$([ "$nv" = "0" ] && echo PASS || echo FAIL)" "Postgres enforces validated FKs; orphans impossible"

# ── 5.2 sentinel scan: all numeric columns, all v2 tables
q=$(svc "select string_agg(format('select %L as tbl, %L as col, count(*) as n from %I where %I = 99999', table_name, column_name, table_name, column_name), ' union all ') from information_schema.columns where table_schema='public' and data_type in ('numeric','integer','bigint','double precision','real','smallint') and table_name in (select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE');")
sent=$(svc "select coalesce(sum(n),0) from ($q) s;")
fcd=$(svc "select count(*) from identity_profiles where fastest_claim_days = 99999;")
row "5.2 fastest_claim_days = 99999 sentinels" "0" "$fcd" "$([ "$fcd" = "0" ] && echo PASS || echo FAIL)" ""
row "5.2 99999 in ANY numeric column, ANY table" "0" "$sent" "$([ "$sent" = "0" ] && echo PASS || echo FAIL)" "dynamic scan of all numeric columns in public schema"

# ── 5.3 enum coverage (report counts)
fs=$(svc "select count(*) from source_orders where financial_status = 'unknown';")
ff=$(svc "select count(*) from source_orders where fulfillment_state = 'unknown';")
tot=$(svc "select count(*) from source_orders;")
row "5.3 financial_status='unknown'" "report count" "$fs of $tot" "PASS" "visibility only — not zero by design"
row "5.3 fulfillment_state='unknown'" "report count" "$ff of $tot" "PASS" ""

# ── 5.4 identity_profiles completeness
n=$(svc "select count(*) from identities i left join identity_profiles ip on ip.identity_id = i.id where ip.identity_id is null;")
row "5.4 every identity has a profile" "0 missing" "$n" "$([ "$n" = "0" ] && echo PASS || echo FAIL)" "includes superseded identities"

# ── 5.5 signal_count accuracy (sample 20: 10 live + 10 test-created)
bad55=$(svc "
with sample as (
  (select id, signal_count from identities where superseded_by is null order by id limit 10)
  union all
  (select id, signal_count from identities where superseded_by is null order by id desc limit 10)
)
select count(*) from sample s
where s.signal_count <> (
  select count(si.id) from identity_members im
  join identity_signals si on si.identifier_type = im.identifier_type and si.identifier_hash = im.identifier_hash
  where im.identity_id = s.id);")
row "5.5 signal_count matches actual (20 sampled)" "0 mismatches" "$bad55" "$([ "$bad55" = "0" ] && echo PASS || echo FAIL)" "members→signals join, type+hash"

# ── 5.6 merchant_count accuracy (EVERY live identity)
bad56=$(svc "
select count(*) from identities i
where i.superseded_by is null
and i.merchant_count <> (
  select count(distinct si.merchant_id) from identity_members im
  join identity_signals si on si.identifier_type = im.identifier_type and si.identifier_hash = im.identifier_hash
  where im.identity_id = i.id);")
tot56=$(svc "select count(*) from identities where superseded_by is null;")
row "5.6 merchant_count rollup accurate (all identities)" "0 mismatches" "$bad56 of $tot56" "$([ "$bad56" = "0" ] && echo PASS || echo FAIL)" "joined on type+hash (spec's hash-only IN is collision-unsafe)"
# profiles mirror
bad56b=$(svc "select count(*) from identity_profiles p join identities i on i.id=p.identity_id where i.superseded_by is null and p.merchant_count <> i.merchant_count;")
row "5.6 identity_profiles.merchant_count consistent" "0" "$bad56b" "$([ "$bad56b" = "0" ] && echo PASS || echo FAIL)" ""

# ── 5.7 billing intact
p=$(svc "select count(*) from plans;")
s=$(svc "select count(*) from merchant_subscriptions;")
c=$(svc "select count(*) from merchant_credits;")
row "5.7 plans count" "4" "$p" "$([ "$p" = "4" ] && echo PASS || echo FAIL)" ""
row "5.7 merchant_subscriptions count" "40" "$s" "$([ "$s" = "40" ] && echo PASS || echo FAIL)" ""
row "5.7 merchant_credits count" "40" "$c" "$([ "$c" = "40" ] && echo PASS || echo FAIL)" ""
o1=$(svc "select count(*) from merchant_subscriptions ms left join merchants m on m.id=ms.merchant_id where m.id is null;")
o2=$(svc "select count(*) from merchant_credits mc left join merchants m on m.id=mc.merchant_id where m.id is null;")
o3=$(svc "select count(*) from merchant_subscriptions ms left join plans p on p.plan_id=ms.plan_id where p.plan_id is null;")
row "5.7 subscriptions/credits merchant FKs valid" "0 / 0 orphans" "$o1 / $o2" "$([ "$o1" = "0" ] && [ "$o2" = "0" ] && echo PASS || echo FAIL)" ""
row "5.7 no subscription with invalid plan_id" "0" "$o3" "$([ "$o3" = "0" ] && echo PASS || echo FAIL)" ""

column -t -s$'\t' "$OUT"
