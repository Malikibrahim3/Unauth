-- Seed a realistic merchant account for:
--   simeonmurray123@gmail.com
--
-- Run in Supabase SQL Editor as a privileged role (postgres/service role).
-- This script is idempotent enough for repeat local/demo use.

BEGIN;

DO $$
DECLARE
  v_email text := 'simeonmurray123@gmail.com';
  v_user_id uuid;
  v_merchant_id uuid;
  v_merchant_name text := 'Simeon Murray Store';
  v_job_id uuid;
  v_profile_id uuid;
  v_tx_id uuid;
  i int;
  j int;
  k int;
  v_risk text;
  v_grade text;
  v_match text;
  v_score numeric;
  v_order_value numeric;
  v_now timestamptz := now();
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth user found for % (create/login once first).', v_email;
  END IF;

  -- 1) Merchant
  INSERT INTO merchants (user_id, name, business_name, setup_complete, created_at)
  VALUES (v_user_id, v_merchant_name, v_merchant_name, true, v_now - interval '180 days')
  ON CONFLICT (user_id) DO UPDATE
    SET name = EXCLUDED.name,
        business_name = EXCLUDED.business_name,
        setup_complete = true
  RETURNING id INTO v_merchant_id;

  IF v_merchant_id IS NULL THEN
    SELECT id INTO v_merchant_id FROM merchants WHERE user_id = v_user_id LIMIT 1;
  END IF;

  -- 2) Team membership: make this user owner with full rights
  INSERT INTO team_members (merchant_id, user_id, role, status, invited_at, accepted_at)
  VALUES (v_merchant_id, v_user_id, 'owner', 'active', v_now - interval '180 days', v_now - interval '180 days')
  ON CONFLICT (merchant_id, user_id) DO UPDATE
    SET role = 'owner',
        status = 'active',
        accepted_at = COALESCE(team_members.accepted_at, EXCLUDED.accepted_at);

  -- 3) Clean previous seeded demo data for this merchant (safe reset)
  DELETE FROM evidence_packages WHERE merchant_id = v_merchant_id;
  DELETE FROM watchlist_appearances WHERE merchant_id = v_merchant_id;
  DELETE FROM watchlist_entries WHERE merchant_id = v_merchant_id;
  DELETE FROM customer_notes
  WHERE customer_profile_id IN (
    SELECT id FROM customer_profiles WHERE merchant_ids @> to_jsonb(ARRAY[v_merchant_id::text])
  );
  DELETE FROM customer_activity_log
  WHERE profile_id IN (
    SELECT id FROM customer_profiles WHERE merchant_ids @> to_jsonb(ARRAY[v_merchant_id::text])
  );
  DELETE FROM customer_profile_audit_appearances
  WHERE audit_id IN (SELECT id FROM processing_jobs WHERE merchant_id = v_merchant_id);
  DELETE FROM audit_transactions WHERE job_id IN (SELECT id FROM processing_jobs WHERE merchant_id = v_merchant_id);
  DELETE FROM processing_jobs WHERE merchant_id = v_merchant_id;
  DELETE FROM customer_profiles WHERE merchant_ids @> to_jsonb(ARRAY[v_merchant_id::text]);

  -- 4) Create realistic customer profiles
  FOR i IN 1..140 LOOP
    INSERT INTO customer_profiles (
      primary_email, emails, ips, addresses, card_last4s, phones, names,
      risk_score, risk_level, fraud_flags, total_orders, total_refund_claims, total_chargebacks,
      total_merchants_seen_at, refund_rate, refund_timestamps, merchant_ids,
      first_seen, last_seen, profile_confidence, identity_confidence_grade, identity_signals_summary
    )
    VALUES (
      format('customer%03s@shopmail.test', i),
      to_jsonb(ARRAY[format('customer%03s@shopmail.test', i)]),
      to_jsonb(ARRAY[format('185.2.%s.%s', (i % 30) + 1, (i % 200) + 1)]),
      to_jsonb(ARRAY[format('%s King Street, London, SW1A %sAA, GB', (i % 240) + 1, (i % 9) + 1)]),
      to_jsonb(ARRAY[lpad(((1000 + i) % 9999)::text, 4, '0')]),
      to_jsonb(ARRAY[format('+4477009%04s', i)]),
      to_jsonb(ARRAY[format('Customer %s', i)]),
      CASE WHEN i % 11 = 0 THEN 88 WHEN i % 7 = 0 THEN 72 WHEN i % 5 = 0 THEN 54 ELSE 29 END,
      CASE WHEN i % 11 = 0 THEN 'critical' WHEN i % 7 = 0 THEN 'high' WHEN i % 5 = 0 THEN 'medium' ELSE 'low' END,
      CASE
        WHEN i % 11 = 0 THEN to_jsonb(ARRAY['refundPattern','networkDeviceLink','crossMerchant'])
        WHEN i % 7 = 0 THEN to_jsonb(ARRAY['addressClustering','paymentChurn'])
        WHEN i % 5 = 0 THEN to_jsonb(ARRAY['ipCluster'])
        ELSE to_jsonb(ARRAY[]::text[])
      END,
      (i % 9) + 2,
      CASE WHEN i % 11 = 0 THEN 3 WHEN i % 7 = 0 THEN 2 WHEN i % 5 = 0 THEN 1 ELSE 0 END,
      CASE WHEN i % 13 = 0 THEN 1 ELSE 0 END,
      CASE WHEN i % 9 = 0 THEN 3 WHEN i % 4 = 0 THEN 2 ELSE 1 END,
      CASE WHEN i % 11 = 0 THEN 0.40 WHEN i % 7 = 0 THEN 0.24 WHEN i % 5 = 0 THEN 0.11 ELSE 0.01 END,
      to_jsonb(ARRAY[(v_now - ((i % 70) || ' days')::interval)::text]),
      to_jsonb(ARRAY[v_merchant_id::text]),
      v_now - ((160 - i) || ' days')::interval,
      v_now - ((i % 3) || ' days')::interval,
      CASE WHEN i % 11 = 0 THEN 97 WHEN i % 7 = 0 THEN 90 WHEN i % 5 = 0 THEN 78 ELSE 56 END,
      CASE WHEN i % 11 = 0 THEN 'definite' WHEN i % 7 = 0 THEN 'probable' WHEN i % 5 = 0 THEN 'possible' ELSE 'weak' END,
      CASE
        WHEN i % 11 = 0 THEN to_jsonb(ARRAY['networkDeviceLink','crossMerchantSignal','refundPattern'])
        WHEN i % 7 = 0 THEN to_jsonb(ARRAY['addressClustering','paymentChurn'])
        WHEN i % 5 = 0 THEN to_jsonb(ARRAY['ipCluster'])
        ELSE to_jsonb(ARRAY['velocity'])
      END
    );
  END LOOP;

  -- 5) Create lots of audits + transactions
  FOR i IN 1..18 LOOP
    INSERT INTO processing_jobs (
      merchant_id, status, filename, total_rows, processed_rows, failed_rows, flagged_count,
      created_at, updated_at, completed_at, hidden_by_merchant
    )
    VALUES (
      v_merchant_id,
      'completed',
      format('orders_%s.csv', to_char(v_now - ((i * 8) || ' days')::interval, 'YYYY_MM_DD')),
      1200 + (i * 35),
      1200 + (i * 35),
      0,
      140 + (i * 9),
      v_now - ((i * 8) || ' days')::interval,
      v_now - ((i * 8) || ' days')::interval + interval '9 minutes',
      v_now - ((i * 8) || ' days')::interval + interval '9 minutes',
      false
    )
    RETURNING id INTO v_job_id;

    FOR j IN 1..240 LOOP
      v_order_value := 20 + ((j * 17 + i * 9) % 500);
      v_score := (j * 9 + i * 13) % 100;
      IF v_score >= 85 THEN
        v_risk := 'critical'; v_grade := 'definite'; v_match := 'definite';
      ELSIF v_score >= 70 THEN
        v_risk := 'high'; v_grade := 'probable'; v_match := 'probable';
      ELSIF v_score >= 50 THEN
        v_risk := 'medium'; v_grade := 'possible'; v_match := 'candidate';
      ELSE
        v_risk := 'low'; v_grade := 'weak'; v_match := 'none';
      END IF;

      INSERT INTO audit_transactions (
        job_id, order_id, customer_email, customer_name, shipping_address, billing_address,
        order_value, payment_method, device_ip, card_last4, processed_at,
        match_score, identity_score, risk_level, fraud_flags, signals_matched,
        identity_confidence_grade, identity_match_grade, identity_match_score, match_status,
        dismissed_by_merchant, false_positive_reported, refund_claimed, chargeback_filed
      )
      VALUES (
        v_job_id,
        format('ORD-%s-%s', i, lpad(j::text, 5, '0')),
        format('customer%03s@shopmail.test', ((j + i) % 140) + 1),
        format('Customer %s', ((j + i) % 140) + 1),
        format('%s Market Road, Manchester, M%s %sAB, GB', (j % 220) + 1, (j % 20) + 1, (j % 9) + 1),
        format('%s Market Road, Manchester, M%s %sAB, GB', (j % 220) + 1, (j % 20) + 1, (j % 9) + 1),
        v_order_value,
        CASE WHEN j % 4 = 0 THEN 'paypal' WHEN j % 3 = 0 THEN 'apple_pay' ELSE 'card' END,
        format('86.%s.%s.%s', (j % 200) + 1, (i % 200) + 1, ((j + i) % 200) + 1),
        lpad(((j * 37 + i) % 10000)::text, 4, '0'),
        v_now - ((i * 8) || ' days')::interval + ((j % 180) || ' minutes')::interval,
        v_score,
        v_score,
        v_risk,
        CASE
          WHEN v_grade = 'definite' THEN to_jsonb(ARRAY['crossMerchantSignal','networkDeviceLink','refundPattern'])
          WHEN v_grade = 'probable' THEN to_jsonb(ARRAY['addressClustering','paymentChurn'])
          WHEN v_grade = 'possible' THEN to_jsonb(ARRAY['ipCluster'])
          ELSE to_jsonb(ARRAY['velocity'])
        END,
        CASE
          WHEN v_grade = 'definite' THEN to_jsonb(ARRAY['crossMerchantSignal','networkDeviceLink','refundPattern'])
          WHEN v_grade = 'probable' THEN to_jsonb(ARRAY['addressClustering'])
          WHEN v_grade = 'possible' THEN to_jsonb(ARRAY['ipCluster'])
          ELSE to_jsonb(ARRAY[]::text[])
        END,
        v_grade,
        CASE
          WHEN v_grade = 'definite' THEN 'confirmed'
          WHEN v_grade = 'probable' THEN 'probable'
          WHEN v_grade = 'possible' THEN 'candidate'
          ELSE null
        END,
        v_score,
        v_match,
        false,
        false,
        CASE WHEN j % 14 = 0 THEN true ELSE false END,
        CASE WHEN j % 37 = 0 THEN true ELSE false END
      )
      RETURNING id INTO v_tx_id;

      IF j % 60 = 0 THEN
        SELECT id INTO v_profile_id
        FROM customer_profiles
        WHERE primary_email = format('customer%03s@shopmail.test', ((j + i) % 140) + 1)
        LIMIT 1;

        IF v_profile_id IS NOT NULL THEN
          INSERT INTO customer_profile_audit_appearances (
            profile_id, audit_id, transaction_id, score_at_time, flags_at_time, appeared_at
          )
          VALUES (
            v_profile_id, v_job_id, v_tx_id, v_score,
            CASE WHEN v_grade IN ('definite','probable')
              THEN to_jsonb(ARRAY['crossMerchantSignal','networkDeviceLink'])
              ELSE to_jsonb(ARRAY['velocity'])
            END,
            v_now - ((i * 8) || ' days')::interval
          );
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  -- 6) Watchlist entries + appearances
  FOR k IN 1..22 LOOP
    SELECT id INTO v_profile_id
    FROM customer_profiles
    WHERE primary_email = format('customer%03s@shopmail.test', k)
    LIMIT 1;

    IF v_profile_id IS NOT NULL THEN
      INSERT INTO watchlist_entries (
        merchant_id, customer_profile_id, added_by, notes, created_at, removed_by_merchant
      )
      VALUES (
        v_merchant_id, v_profile_id, v_user_id,
        format('Seed watchlist case %s: suspicious repeat refund behavior.', k),
        v_now - ((k * 2) || ' days')::interval,
        false
      );

      INSERT INTO watchlist_appearances (
        merchant_id, customer_profile_id, observed_at, context, reviewed_at
      )
      VALUES (
        v_merchant_id, v_profile_id,
        v_now - (k || ' days')::interval,
        jsonb_build_object('source', 'seed', 'reason', 'repeat signal activity'),
        CASE WHEN k % 3 = 0 THEN v_now - ((k - 1) || ' days')::interval ELSE null END
      );
    END IF;
  END LOOP;

  -- 7) Evidence packages
  FOR k IN 1..14 LOOP
    SELECT id INTO v_profile_id
    FROM customer_profiles
    WHERE primary_email = format('customer%03s@shopmail.test', (k * 3))
    LIMIT 1;

    SELECT id INTO v_tx_id
    FROM audit_transactions
    WHERE customer_email = format('customer%03s@shopmail.test', (k * 3))
      AND risk_level IN ('high','critical')
    ORDER BY processed_at DESC
    LIMIT 1;

    IF v_profile_id IS NOT NULL THEN
      INSERT INTO evidence_packages (
        merchant_id, customer_profile_id, generated_for_order_id, reference_number,
        narrative_summary, signal_snapshot, cross_merchant_indicator,
        ce3_eligible, ce3_qualifying_signals, ce3_prior_transactions, generated_at, created_at
      )
      VALUES (
        v_merchant_id,
        v_profile_id,
        v_tx_id,
        format('UNAUTH-SEED-%s-%s', to_char(v_now, 'YYYYMMDD'), lpad(k::text, 4, '0')),
        format('Seeded evidence package %s with timeline and identity signal summary.', k),
        jsonb_build_object('signals', ARRAY['crossMerchantSignal','networkDeviceLink','refundPattern']),
        true,
        (k % 2 = 0),
        to_jsonb(ARRAY['crossMerchantSignal','networkDeviceLink']),
        to_jsonb(ARRAY[
          jsonb_build_object('order_id', format('HIST-%s-A', k), 'date', (v_now - interval '40 days')::text),
          jsonb_build_object('order_id', format('HIST-%s-B', k), 'date', (v_now - interval '18 days')::text)
        ]),
        v_now - ((k * 4) || ' days')::interval,
        v_now - ((k * 4) || ' days')::interval
      );
    END IF;
  END LOOP;

  -- 8) Optional: create a little access log volume
  INSERT INTO access_audit_log (merchant_id, query_type, k_anonymity_satisfied, result_returned, created_at)
  SELECT v_merchant_id, 'cross_merchant_lookup', true, true, v_now - ((g % 30) || ' days')::interval
  FROM generate_series(1, 60) g;

  RAISE NOTICE 'Seed complete for % (user_id=% merchant_id=%)', v_email, v_user_id, v_merchant_id;
END $$;

COMMIT;
