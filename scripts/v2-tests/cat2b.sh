#!/bin/bash
# Category 2 — 2.10 merge lineage + 2.11 false-positive reporting
set -u
DB="postgresql://postgres.lquvbikyvmbjbfffrlky@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
export PGPASSWORD='Boyo19961996!uuu'
cd "$(dirname "$0")/../.."
S=scripts/v2-tests/state.json
g() { python3 -c "import json;d=json.load(open('$S'));print(d$1)"; }
svc() { psql "$DB" -X -tA -c "$1" 2>&1; }
OUT=scripts/v2-tests/results/cat2b.tsv
: > "$OUT"
row() { printf '%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" "$5" >> "$OUT"; }

LEFT=$(g "['premerge']['left']")
RIGHT=$(g "['premerge']['right']")
MA=$(g "['merchants']['v2test-merchant-a']")
M1H=$(g "['hashes']['m1_email']['hash']")

# which one was superseded? winner = higher score (right, 47 vs 27)
sup=$(svc "select superseded_by from identities where id='$LEFT';")
row "2.10 superseded_by set on losing identity" "$RIGHT" "${sup:-NULL}" "$([ "$sup" = "$RIGHT" ] && echo PASS || echo FAIL)" "winner=higher confidence_score"
ev=$(svc "select count(*) from identity_resolution_events where identity_id='$LEFT' and event_type='merged' and detail->>'merged_into'='$RIGHT';")
row "2.10 'merged' resolution event exists" "1" "$ev" "$([ "$ev" = "1" ] && echo PASS || echo FAIL)" ""
mem=$(svc "select count(*) from identity_members where identity_id='$LEFT';")
memr=$(svc "select count(*) from identity_members where identity_id='$RIGHT' and identifier_type='email' and identifier_hash='$M1H';")
row "2.10 members re-pointed to winner" "0 on loser, old email on winner" "loser:$mem winner-has-old-email:$memr" "$([ "$mem" = "0" ] && [ "$memr" = "1" ] && echo PASS || echo FAIL)" ""
lk=$(svc "select string_agg(identity_id::text, ',') from lookup_network_identity('$MA','[{\"type\":\"email\",\"hash\":\"$M1H\"}]'::jsonb,null);")
v=FAIL; [ "$lk" = "$RIGHT" ] && v=PASS
row "2.10 lookup by old hash returns winner only" "$RIGHT" "${lk:-empty}" "$v" "superseded identity unreachable"
scg=$(svc "select confidence_score::int::text || '|' || confidence_grade from identities where id='$RIGHT';")
row "2.10 merged identity rescored" "47|possible" "$scg" "$([ "$scg" = "47|possible" ] && echo PASS || echo FAIL)" "email+email_root+phone+shipping = 12+0+20+15"

# ── 2.11 false positive reporting (advisory only)
T100=$(svc "select identity_id from identity_members where identifier_type='email' and identifier_hash='$(npx tsx --env-file=.env.local scripts/v2-tests/hash.ts v2testt100@v2test.example | tail -1)' limit 1;")
before=$(svc "select confidence_score::int::text || '|' || confidence_grade from identities where id='$T100';")
ins=$(svc "insert into identity_resolution_events (identity_id, event_type, detail, actor) values ('$T100','false_positive_reported','{\"reason\":\"v2test FP report\"}','merchant:$MA') returning id;")
after=$(svc "select confidence_score::int::text || '|' || confidence_grade from identities where id='$T100';")
row "2.11 FP event inserted" "1 row" "$(echo "$ins" | grep -c '-')" "$(echo "$ins" | grep -q '-' && echo PASS || echo FAIL)" ""
row "2.11 grade unchanged after FP report" "$before" "$after" "$([ "$before" = "$after" ] && echo PASS || echo FAIL)" "FP reporting is advisory only"
evid=$(echo "$ins" | head -1)
ur=$(svc "update identity_resolution_events set actor='hacked' where id='$evid';")
dr=$(svc "delete from identity_resolution_events where id='$evid';")
row "2.11 FP event UPDATE rejected" "append-only error" "$(echo "$ur" | head -1 | cut -c1-60)" "$(echo "$ur" | grep -q 'append-only' && echo PASS || echo FAIL)" ""
row "2.11 FP event DELETE rejected" "append-only error" "$(echo "$dr" | head -1 | cut -c1-60)" "$(echo "$dr" | grep -q 'append-only' && echo PASS || echo FAIL)" ""

column -t -s$'\t' "$OUT"
