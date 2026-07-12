#!/bin/bash
# Category 2 — Identity resolution correctness (parts 2.1–2.9; merge/FP run separately)
set -u
source "$(dirname "$0")/db-env.sh"
cd "$(dirname "$0")/../.."
S=scripts/v2-tests/state.json
g() { python3 -c "import json;d=json.load(open('$S'));print(d$1)"; }
H() { npx tsx --env-file=.env.local scripts/v2-tests/hash.ts "$1" | tail -1; }
svc() { psql "$DB" -X -tA -c "$1" 2>&1; }
OUT=scripts/v2-tests/results/cat2.tsv
: > "$OUT"
row() { printf '%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" "$5" >> "$OUT"; }

# identity id(s) reachable from an order's signals
id_of() {
  local oid; oid=$(g "['orders']['$1']")
  svc "select coalesce((select string_agg(distinct im.identity_id::text, ',')
    from identity_signals s join identity_members im
      on im.identifier_type = s.identifier_type and im.identifier_hash = s.identifier_hash
    where s.source_order_id = '$oid'), 'NONE');"
}
same() { # label expect_same id1 id2 [notes]
  local v=FAIL
  if [ "$3" = "$4" ] && [ "$3" != "NONE" ]; then [ "$2" = "same" ] && v=PASS; else [ "$2" = "different" ] && [ "$3" != "NONE" ] && [ "$4" != "NONE" ] && v=PASS; fi
  row "$1" "$2 identity" "$([ "$3" = "$4" ] && echo same || echo different)" "$v" "$5"
}

# ── 2.1 gmail dots
a=$(id_of v2t-g1-1); b=$(id_of v2t-g1-2); c=$(id_of v2t-g1-3)
same "2.1 gmail dot variants 1≡2" same "$a" "$b" ""
same "2.1 gmail dot variants 1≡3" same "$a" "$c" ""

# ── 2.2 plus addressing (gmail) + email_root bridge (non-gmail)
a=$(id_of v2t-g2-1); b=$(id_of v2t-g2-2); c=$(id_of v2t-g2-3)
same "2.2 gmail plus variants 1≡2" same "$a" "$b" "normaliseEmail strips +tag for gmail"
same "2.2 gmail plus variants 1≡3" same "$a" "$c" ""
roothash=$(g "['hashes']['g2b_root']['hash']")
rootmember=$(svc "select count(*) from identity_members where identifier_type='email_root' and identifier_hash='$roothash';")
a=$(id_of v2t-g2b-1); b=$(id_of v2t-g2b-2)
same "2.2 non-gmail plus variants bridge via email_root" same "$a" "$b" "email hashes differ; email_root membership unifies ($rootmember member row)"

# ── 2.3 non-gmail dots
a=$(id_of v2t-g3-1); b=$(id_of v2t-g3-2); c=$(id_of v2t-g3-3)
same "2.3 outlook case-insensitive 1≡2" same "$a" "$b" "lowercase only"
same "2.3 outlook dotted vs undotted separate" different "$a" "$c" "spec: dot stripping is Gmail-only"

# ── 2.4 phone E.164
a=$(id_of v2t-g4-1); b=$(id_of v2t-g4-2); c=$(id_of v2t-g4-3)
same "2.4 phone formats 1≡2" same "$a" "$b" ""
same "2.4 phone formats 1≡3" same "$a" "$c" ""
ph=$(g "['hashes']['g4_phone']['hash']")
pm=$(svc "select count(distinct identity_hash) from (select identifier_hash as identity_hash from identity_signals where identifier_type='phone' and identifier_hash='$ph') x;")
row "2.4 single phone hash for all formats" "1 hash" "$pm hash(es)" "$([ "$pm" = "1" ] && echo PASS || echo FAIL)" "+1 (555) / 1555… / 555-…  → +1415555…"

# ── 2.5 address abbreviations
a=$(id_of v2t-g5-1); b=$(id_of v2t-g5-2); c=$(id_of v2t-g5-3)
same "2.5 Street vs St 1≡2" same "$a" "$b" ""
same "2.5 Apt 4B vs #4B 1≡3" same "$a" "$c" ""
nf=$(svc "select count(distinct normalized_full) from source_addresses where normalized_full like '%mainv2test%';")
row "2.5 single normalized_full for variants" "1" "$nf" "$([ "$nf" = "1" ] && echo PASS || echo FAIL)" ""

# ── 2.6 zip+4
a=$(id_of v2t-g6-1); b=$(id_of v2t-g6-2)
same "2.6 zip+4 ≡ zip5" same "$a" "$b" "adapter truncates to zip5 before normalized_full"
zp=$(svc "select count(*) from source_addresses where postal_code ~ '^[0-9]{5}-[0-9]{4}\$';")
row "2.6 no zip+4 left in postal_code (live scan)" "0" "$zp" "$([ "$zp" = "0" ] && echo PASS || echo FAIL)" "all rows incl. migrated data"
zn=$(svc "select count(*) from source_addresses where normalized_full ~ '[0-9]{5} [0-9]{4}( |\$)' and postal_code is not null and normalized_full like '%' || postal_code || '%';")
row "2.6 no zip+4 token pairs in normalized_full" "0" "$zn" "$([ "$zn" = "0" ] && echo PASS || echo FAIL)" "heuristic scan"

# ── 2.7 cross-merchant
a=$(id_of v2t-g7-a); b=$(id_of v2t-g7-b)
same "2.7 same email across merchants A,B" same "$a" "$b" ""
mc=$(svc "select merchant_count from identities where id='$a';")
row "2.7 identity.merchant_count after resolution" "2" "$mc" "$([ "$mc" = "2" ] && echo PASS || echo FAIL)" ""

# ── 2.8 weak signal (shared IP)
iph=$(g "['hashes']['g8_ip']['hash']")
sm=$(svc "select count(*) from identity_members where identifier_type='ip' and identifier_hash='$iph';")
ss=$(svc "select count(*) from identity_signals where identifier_type='ip' and identifier_hash='$iph';")
se=$(svc "select count(*) from identity_edges where (left_type='ip' and left_hash='$iph') or (right_type='ip' and right_hash='$iph');")
row "2.8 shared IP not in identity_members" "0 member rows" "$sm" "$([ "$sm" = "0" ] && echo PASS || echo FAIL)" "500 orders shared 203.0.113.77"
row "2.8 shared IP present in identity_signals" "500" "$ss" "$([ "$ss" = "500" ] && echo PASS || echo FAIL)" ""
row "2.8 shared IP present in identity_edges" ">0" "$se" "$([ "$se" -gt 0 ] && echo PASS || echo FAIL)" ""
nident=$(svc "select count(distinct im.identity_id) from identity_signals s join identity_members im on im.identifier_type=s.identifier_type and im.identifier_hash=s.identifier_hash join source_orders o on o.id=s.source_order_id where o.external_id like 'v2t-g8-%';")
row "2.8 500 shared-IP customers stay separate" "500 identities" "$nident" "$([ "$nident" = "500" ] && echo PASS || echo FAIL)" "IP never bridges"
idxdef=$(svc "select indexdef from pg_indexes where indexname='ux_identity_members_strong_identifier';")
echo "$idxdef" | grep -q "'ip'" && ipex=FAIL || ipex=PASS
echo "$idxdef" | grep -q "'name'" && ipex=FAIL
row "2.8 partial unique index excludes ip+name" "ip/name not in predicate" "$(echo "$idxdef" | grep -o 'WHERE.*' | cut -c1-60)…" "$ipex" ""

# ── 2.9 grade thresholds (engine compositions; one identity per known score)
check_grade() { # label member_type member_hash expected_score expected_grade notes
  local res; res=$(svc "select i.confidence_score::int::text || '|' || i.confidence_grade::text
    from identities i join identity_members im on im.identity_id=i.id
    where im.identifier_type='$2' and im.identifier_hash='$3' and i.superseded_by is null limit 1;")
  row "$1" "$4|$5" "$res" "$([ "$res" = "$4|$5" ] && echo PASS || echo FAIL)" "$6"
}
check_grade "2.9 score 27 → weak" email "$(H v2testt27@v2test.example)" "27" "weak" "email+addr only (no phone/card: missing-data case)"
check_grade "2.9 score 44 → weak (below 45)" email "$(H v2testt44@v2test.example)" "44" "weak" "email+phone+platform_id, no address"
check_grade "2.9 score 45 → possible (at boundary)" payment_fingerprint "$(H v2test_gw:4145)" "45" "possible" "card+address, NO email (missing-data case)"
check_grade "2.9 score 47 → possible" email "$(H v2testt47@v2test.example)" "47" "possible" ""
check_grade "2.9 score 63 → possible (below 65)" email "$(H v2testt63@v2test.example)" "63" "possible" "cross-merchant +24 included"
check_grade "2.9 score 65 → probable (at boundary)" payment_fingerprint "$(H v2test_gw:4165)" "65" "probable" "card+phone+address, no email"
check_grade "2.9 score 66 → probable" email "$(H v2testt66@v2test.example)" "66" "probable" ""
check_grade "2.9 score 84 → probable (below 85)" payment_fingerprint "$(H v2test_gw:4184)" "84" "probable" "no email, no phone (missing-data case)"
check_grade "2.9 score 86 → definite (above 85)" payment_fingerprint "$(H v2test_gw:4186)" "86" "definite" ""
check_grade "2.9 score 100 (capped) → definite" email "$(H v2testt100@v2test.example)" "100" "definite" "raw 104 capped at 100"
poss=$(svc "select count(*) from identities where confidence_grade='possible';")
row "2.9 'possible' band populated" ">0" "$poss" "$([ "$poss" -gt 0 ] && echo PASS || echo FAIL)" "was empty in migrated data; test identities prove the band works"

column -t -s$'\t' "$OUT"
