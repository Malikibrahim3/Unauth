-- ===========================================================================
-- 0011_adaptive_intelligence.sql
-- ---------------------------------------------------------------------------
--   * upsert_fraud_entity_v2  -- atomic increments + refund-pattern updates
--   * upsert_co_occurrence    -- atomic pair-count increments
--   * fraud_transactions.feedback_outcome / feedback_at columns
--   * signal_performance      -- adaptive learning state
--   * record_signal_feedback  -- merchant feedback handler
--   * seed_fraud_intelligence -- one-shot Phase-5 backfill from fraud_transactions
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. fraud_transactions: track merchant feedback
-- ---------------------------------------------------------------------------
ALTER TABLE fraud_transactions
  ADD COLUMN IF NOT EXISTS feedback_outcome TEXT
    CHECK (feedback_outcome IN ('confirmed_fraud', 'confirmed_legitimate')),
  ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 2. upsert_fraud_entity_v2: atomic batch-aggregated increments + refund pattern
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION upsert_fraud_entity_v2(
  p_entity_type        TEXT,
  p_entity_value       TEXT,
  p_orders_delta       INTEGER,
  p_refund_claims_delta INTEGER,
  p_chargebacks_delta  INTEGER,
  p_flagged_delta      INTEGER,
  p_score_avg          NUMERIC,
  p_refund_timestamps  TEXT[],
  p_fastest_claim_days NUMERIC,
  p_refund_this_batch  BOOLEAN
) RETURNS VOID AS $$
DECLARE
  existing_orders     INTEGER;
  existing_score_avg  NUMERIC;
  existing_timestamps JSONB;
  combined_timestamps JSONB;
  ts_array NUMERIC[];
  i INTEGER;
  intervals NUMERIC[];
  avg_interval NUMERIC;
BEGIN
  IF p_entity_value IS NULL OR length(trim(p_entity_value)) = 0 THEN
    RETURN;
  END IF;

  -- 1. Insert-or-fetch existing aggregate state.
  INSERT INTO fraud_entities (
    entity_type, entity_value,
    total_orders, total_refund_claims, total_chargebacks,
    flagged_count, fraud_score_avg,
    refund_timestamps, fastest_claim_days,
    total_merchants_refunded_at,
    first_seen, last_seen
  )
  VALUES (
    p_entity_type, p_entity_value,
    p_orders_delta, p_refund_claims_delta, p_chargebacks_delta,
    p_flagged_delta, p_score_avg,
    COALESCE(to_jsonb(p_refund_timestamps), '[]'::jsonb),
    p_fastest_claim_days,
    CASE WHEN p_refund_this_batch THEN 1 ELSE 0 END,
    now(), now()
  )
  ON CONFLICT (entity_type, entity_value) DO UPDATE SET
    total_orders        = fraud_entities.total_orders + EXCLUDED.total_orders,
    total_refund_claims = fraud_entities.total_refund_claims + EXCLUDED.total_refund_claims,
    total_chargebacks   = fraud_entities.total_chargebacks + EXCLUDED.total_chargebacks,
    flagged_count       = fraud_entities.flagged_count + EXCLUDED.flagged_count,
    -- Running average weighted by previous order count.
    fraud_score_avg     = (
      fraud_entities.fraud_score_avg * fraud_entities.total_orders
      + EXCLUDED.fraud_score_avg * EXCLUDED.total_orders
    ) / NULLIF(fraud_entities.total_orders + EXCLUDED.total_orders, 0),
    refund_timestamps   = COALESCE(fraud_entities.refund_timestamps, '[]'::jsonb)
                          || COALESCE(EXCLUDED.refund_timestamps, '[]'::jsonb),
    fastest_claim_days  = LEAST(
                            COALESCE(fraud_entities.fastest_claim_days, 99999),
                            COALESCE(EXCLUDED.fastest_claim_days, 99999)
                          ),
    total_merchants_refunded_at =
      fraud_entities.total_merchants_refunded_at + EXCLUDED.total_merchants_refunded_at,
    last_seen = now();

  -- 2. Recompute refund_intervals_avg_days from the updated timestamp array.
  SELECT refund_timestamps INTO existing_timestamps
  FROM fraud_entities
  WHERE entity_type = p_entity_type AND entity_value = p_entity_value;

  IF existing_timestamps IS NULL OR jsonb_array_length(existing_timestamps) < 2 THEN
    RETURN;
  END IF;

  -- Convert jsonb array of ISO strings -> sorted numeric epoch array (ms).
  SELECT array_agg(extract(epoch FROM (val::text)::timestamptz) ORDER BY 1)
    INTO ts_array
  FROM jsonb_array_elements_text(existing_timestamps) AS val;

  IF ts_array IS NULL OR array_length(ts_array, 1) < 2 THEN
    RETURN;
  END IF;

  intervals := ARRAY[]::NUMERIC[];
  FOR i IN 2 .. array_length(ts_array, 1) LOOP
    intervals := intervals || ((ts_array[i] - ts_array[i - 1]) / 86400.0);
  END LOOP;

  IF array_length(intervals, 1) > 0 THEN
    SELECT avg(x) INTO avg_interval FROM unnest(intervals) AS x;
    UPDATE fraud_entities
       SET refund_intervals_avg_days = avg_interval
     WHERE entity_type = p_entity_type AND entity_value = p_entity_value;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_fraud_entity_v2 TO service_role;

-- ---------------------------------------------------------------------------
-- 3. upsert_co_occurrence: atomic pair-count increment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION upsert_co_occurrence(
  p_a_type TEXT,
  p_a_value TEXT,
  p_b_type TEXT,
  p_b_value TEXT,
  p_count_delta INTEGER
) RETURNS VOID AS $$
BEGIN
  IF p_a_value IS NULL OR p_b_value IS NULL
     OR length(trim(p_a_value)) = 0 OR length(trim(p_b_value)) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO fraud_entity_co_occurrences (
    entity_a_type, entity_a_value,
    entity_b_type, entity_b_value,
    co_occurrence_count, first_seen, last_seen
  ) VALUES (
    p_a_type, p_a_value,
    p_b_type, p_b_value,
    GREATEST(p_count_delta, 1), now(), now()
  )
  ON CONFLICT (entity_a_type, entity_a_value, entity_b_type, entity_b_value)
  DO UPDATE SET
    co_occurrence_count = fraud_entity_co_occurrences.co_occurrence_count + EXCLUDED.co_occurrence_count,
    last_seen = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_co_occurrence TO service_role;

-- ---------------------------------------------------------------------------
-- 4. signal_performance: adaptive learning state
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS signal_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_name TEXT NOT NULL,
  true_positive_count  INTEGER NOT NULL DEFAULT 0,
  false_positive_count INTEGER NOT NULL DEFAULT 0,
  true_negative_count  INTEGER NOT NULL DEFAULT 0,
  false_negative_count INTEGER NOT NULL DEFAULT 0,
  precision_score      NUMERIC,
  weight_adjustment    NUMERIC NOT NULL DEFAULT 0,
  last_updated         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT signal_performance_unique UNIQUE (signal_name)
);

ALTER TABLE signal_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signal_performance_read_authenticated" ON signal_performance;
CREATE POLICY "signal_performance_read_authenticated" ON signal_performance
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "signal_performance_write_service" ON signal_performance;
CREATE POLICY "signal_performance_write_service" ON signal_performance
  FOR ALL TO service_role USING (true);

-- Seed one row per signal name (idempotent)
INSERT INTO signal_performance (signal_name) VALUES
  ('refundRate'),
  ('inrAbuse'),
  ('velocity'),
  ('emailPattern'),
  ('addressClustering'),
  ('valueAnomaly'),
  ('paymentChurn'),
  ('inrSpeed'),
  ('crossMerchant'),
  ('refundPattern')
ON CONFLICT (signal_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. record_signal_feedback: handle one piece of merchant feedback
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_signal_feedback(
  p_transaction_id TEXT,
  p_outcome TEXT,
  p_fired TEXT[],
  p_all_signals TEXT[]
) RETURNS VOID AS $$
DECLARE
  sig TEXT;
  fired_set TEXT[] := COALESCE(p_fired, ARRAY[]::TEXT[]);
  is_fired BOOLEAN;
  is_fraud BOOLEAN := (p_outcome = 'confirmed_fraud');
BEGIN
  -- Record on the transaction (best-effort: fraud_transactions.order_id is unique only per job_id,
  -- so we update every row matching the given order_id).
  UPDATE fraud_transactions
     SET feedback_outcome = p_outcome,
         feedback_at = now()
   WHERE order_id = p_transaction_id;

  -- For each signal name, increment the appropriate counter.
  FOREACH sig IN ARRAY p_all_signals LOOP
    is_fired := sig = ANY(fired_set);

    INSERT INTO signal_performance (signal_name) VALUES (sig)
      ON CONFLICT (signal_name) DO NOTHING;

    UPDATE signal_performance
       SET true_positive_count  = true_positive_count
         + CASE WHEN is_fraud  AND is_fired THEN 1 ELSE 0 END,
           false_positive_count = false_positive_count
         + CASE WHEN NOT is_fraud AND is_fired THEN 1 ELSE 0 END,
           true_negative_count  = true_negative_count
         + CASE WHEN NOT is_fraud AND NOT is_fired THEN 1 ELSE 0 END,
           false_negative_count = false_negative_count
         + CASE WHEN is_fraud  AND NOT is_fired THEN 1 ELSE 0 END,
           last_updated = now()
     WHERE signal_name = sig;

    -- Recalculate precision and adjustment
    UPDATE signal_performance
       SET precision_score = CASE
             WHEN (true_positive_count + false_positive_count) = 0 THEN NULL
             ELSE true_positive_count::NUMERIC
                  / (true_positive_count + false_positive_count)
           END,
           weight_adjustment = CASE
             WHEN (true_positive_count + false_positive_count) = 0 THEN 0
             WHEN true_positive_count::NUMERIC
                  / (true_positive_count + false_positive_count) < 0.5 THEN -0.1
             WHEN true_positive_count::NUMERIC
                  / (true_positive_count + false_positive_count) > 0.8 THEN  0.1
             ELSE 0
           END
     WHERE signal_name = sig;

    -- Clamp weight_adjustment to [-1, 1] so the multiplier (1+adj) stays in [0, 2].
    UPDATE signal_performance
       SET weight_adjustment = LEAST(1, GREATEST(-1, weight_adjustment))
     WHERE signal_name = sig;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION record_signal_feedback TO service_role;
GRANT EXECUTE ON FUNCTION record_signal_feedback TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. seed_fraud_intelligence: one-shot Phase-5 backfill
--    Aggregates every existing fraud_transactions row into fraud_entities and
--    rebuilds fraud_identity_clusters from pairs sharing >=2 of {ip, address,
--    card_last4}. Safe to re-run.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_fraud_intelligence()
RETURNS TABLE (
  emails_seeded     INTEGER,
  ips_seeded        INTEGER,
  addresses_seeded  INTEGER,
  cards_seeded      INTEGER,
  clusters_created  INTEGER
) AS $$
DECLARE
  v_emails INT := 0;
  v_ips INT := 0;
  v_addrs INT := 0;
  v_cards INT := 0;
  v_clusters INT := 0;
BEGIN
  ---------------------------------------------------------------------------
  -- Wipe and rebuild fraud_entities + fraud_identity_clusters from scratch
  -- so the seed is deterministic and idempotent. Existing rows had wrong
  -- counts (Bucket C), so we cannot trust them.
  ---------------------------------------------------------------------------
  DELETE FROM fraud_identity_clusters;
  DELETE FROM fraud_entities;
  DELETE FROM fraud_entity_co_occurrences;

  ---------------------------------------------------------------------------
  -- 6a. fraud_entities: one row per (entity_type, normalised_value)
  --
  -- Normalisation in SQL must MIRROR lib/identity/normalise.ts.
  ---------------------------------------------------------------------------
  -- Email entities
  WITH src AS (
    SELECT
      lower(trim(customer_email)) AS norm_email,
      job_id,
      refund_claimed,
      fraud_score,
      risk_level,
      account_created_at, -- unused
      delivery_status,
      refund_reason,
      device_ip,
      shipping_address,
      card_last4,
      processed_at,
      order_id
    FROM fraud_transactions
    WHERE customer_email IS NOT NULL AND length(trim(customer_email)) > 0
  ),
  agg AS (
    SELECT
      norm_email,
      count(*) AS total_orders,
      count(*) FILTER (WHERE refund_claimed) AS total_refund_claims,
      count(*) FILTER (WHERE risk_level IN ('high','critical')) AS flagged_count,
      avg(fraud_score) AS fraud_score_avg,
      min(processed_at) AS first_seen,
      max(processed_at) AS last_seen,
      count(DISTINCT job_id) FILTER (WHERE refund_claimed) AS total_merchants_refunded_at,
      count(DISTINCT job_id) AS total_merchants
    FROM src
    GROUP BY norm_email
  ),
  refund_ts AS (
    -- One row per email, with array of refund-claim creation timestamps as JSONB.
    SELECT
      norm_email,
      jsonb_agg(to_jsonb(processed_at) ORDER BY processed_at) AS refund_timestamps,
      min(processed_at) AS first_refund_at
    FROM src
    WHERE refund_claimed
    GROUP BY norm_email
  ),
  inserted AS (
    INSERT INTO fraud_entities (
      entity_type, entity_value,
      total_orders, total_refund_claims, total_chargebacks,
      flagged_count, fraud_score_avg, total_merchants,
      total_merchants_refunded_at,
      refund_timestamps, fastest_claim_days,
      first_seen, last_seen
    )
    SELECT
      'email', a.norm_email,
      a.total_orders, a.total_refund_claims, 0,
      a.flagged_count, a.fraud_score_avg, a.total_merchants,
      a.total_merchants_refunded_at,
      COALESCE(r.refund_timestamps, '[]'::jsonb),
      NULL, -- fastest_claim_days: order/refund date pair not retained on fraud_transactions
      a.first_seen, a.last_seen
    FROM agg a
    LEFT JOIN refund_ts r USING (norm_email)
    RETURNING 1
  )
  SELECT count(*) INTO v_emails FROM inserted;

  -- Refund interval averages for emails (from JSONB timestamp arrays)
  UPDATE fraud_entities AS f
     SET refund_intervals_avg_days = sub.avg_days
    FROM (
      SELECT
        entity_value,
        avg(diff_days) AS avg_days
      FROM (
        SELECT
          entity_value,
          extract(epoch FROM (
            (lead((val)::text::timestamptz) OVER (PARTITION BY entity_value ORDER BY (val)::text::timestamptz))
            - (val)::text::timestamptz
          )) / 86400.0 AS diff_days
        FROM fraud_entities,
             LATERAL jsonb_array_elements_text(refund_timestamps) AS val
        WHERE entity_type = 'email'
          AND jsonb_array_length(refund_timestamps) >= 2
      ) intervals
      WHERE diff_days IS NOT NULL
      GROUP BY entity_value
    ) sub
   WHERE f.entity_type = 'email'
     AND f.entity_value = sub.entity_value;

  -- IP entities
  WITH agg AS (
    SELECT
      trim(device_ip) AS norm_ip,
      count(*) AS total_orders,
      count(*) FILTER (WHERE refund_claimed) AS total_refund_claims,
      count(*) FILTER (WHERE risk_level IN ('high','critical')) AS flagged_count,
      avg(fraud_score) AS fraud_score_avg,
      min(processed_at) AS first_seen,
      max(processed_at) AS last_seen,
      count(DISTINCT job_id) FILTER (WHERE refund_claimed) AS total_merchants_refunded_at,
      count(DISTINCT job_id) AS total_merchants
    FROM fraud_transactions
    WHERE device_ip IS NOT NULL AND length(trim(device_ip)) > 0
    GROUP BY trim(device_ip)
  ),
  inserted AS (
    INSERT INTO fraud_entities (
      entity_type, entity_value,
      total_orders, total_refund_claims, total_chargebacks,
      flagged_count, fraud_score_avg, total_merchants,
      total_merchants_refunded_at,
      first_seen, last_seen
    )
    SELECT
      'ip', norm_ip,
      total_orders, total_refund_claims, 0,
      flagged_count, fraud_score_avg, total_merchants,
      total_merchants_refunded_at,
      first_seen, last_seen
    FROM agg
    RETURNING 1
  )
  SELECT count(*) INTO v_ips FROM inserted;

  -- Address entities (apply canonical address normalisation in SQL).
  WITH agg AS (
    SELECT
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(lower(shipping_address), '[^[:alnum:][:space:]]', ' ', 'g'),
              '\s+', ' ', 'g'),
            '\m(apartment|apt)\M', 'apt', 'g'),
          '\m(street|st)\M', 'st', 'g'),
        '\m(road|rd)\M', 'rd', 'g'),
      '^\s+|\s+$', '', 'g') AS norm_addr,
      job_id, refund_claimed, fraud_score, risk_level, processed_at
    FROM fraud_transactions
    WHERE shipping_address IS NOT NULL AND length(trim(shipping_address)) > 0
  ),
  agg2 AS (
    SELECT
      norm_addr,
      count(*) AS total_orders,
      count(*) FILTER (WHERE refund_claimed) AS total_refund_claims,
      count(*) FILTER (WHERE risk_level IN ('high','critical')) AS flagged_count,
      avg(fraud_score) AS fraud_score_avg,
      min(processed_at) AS first_seen,
      max(processed_at) AS last_seen,
      count(DISTINCT job_id) FILTER (WHERE refund_claimed) AS total_merchants_refunded_at,
      count(DISTINCT job_id) AS total_merchants
    FROM agg
    GROUP BY norm_addr
  ),
  inserted AS (
    INSERT INTO fraud_entities (
      entity_type, entity_value,
      total_orders, total_refund_claims, total_chargebacks,
      flagged_count, fraud_score_avg, total_merchants,
      total_merchants_refunded_at,
      first_seen, last_seen
    )
    SELECT
      'address', norm_addr,
      total_orders, total_refund_claims, 0,
      flagged_count, fraud_score_avg, total_merchants,
      total_merchants_refunded_at,
      first_seen, last_seen
    FROM agg2
    WHERE length(norm_addr) > 0
    RETURNING 1
  )
  SELECT count(*) INTO v_addrs FROM inserted;

  -- Card last4 entities (digits only, last 4)
  WITH agg AS (
    SELECT
      right(regexp_replace(card_last4, '\D', '', 'g'), 4) AS norm_card,
      count(*) AS total_orders,
      count(*) FILTER (WHERE refund_claimed) AS total_refund_claims,
      count(*) FILTER (WHERE risk_level IN ('high','critical')) AS flagged_count,
      avg(fraud_score) AS fraud_score_avg,
      min(processed_at) AS first_seen,
      max(processed_at) AS last_seen,
      count(DISTINCT job_id) FILTER (WHERE refund_claimed) AS total_merchants_refunded_at,
      count(DISTINCT job_id) AS total_merchants
    FROM fraud_transactions
    WHERE card_last4 IS NOT NULL
      AND length(regexp_replace(card_last4, '\D', '', 'g')) >= 4
    GROUP BY right(regexp_replace(card_last4, '\D', '', 'g'), 4)
  ),
  inserted AS (
    INSERT INTO fraud_entities (
      entity_type, entity_value,
      total_orders, total_refund_claims, total_chargebacks,
      flagged_count, fraud_score_avg, total_merchants,
      total_merchants_refunded_at,
      first_seen, last_seen
    )
    SELECT
      'card_last4', norm_card,
      total_orders, total_refund_claims, 0,
      flagged_count, fraud_score_avg, total_merchants,
      total_merchants_refunded_at,
      first_seen, last_seen
    FROM agg
    RETURNING 1
  )
  SELECT count(*) INTO v_cards FROM inserted;

  ---------------------------------------------------------------------------
  -- 6b. fraud_entity_co_occurrences from existing transactions
  ---------------------------------------------------------------------------
  WITH norm AS (
    SELECT
      lower(trim(customer_email)) AS email,
      trim(device_ip) AS ip,
      regexp_replace(regexp_replace(lower(shipping_address), '[^[:alnum:][:space:]]', ' ', 'g'), '\s+', ' ', 'g') AS address,
      right(regexp_replace(coalesce(card_last4,''), '\D', '', 'g'), 4) AS card
    FROM fraud_transactions
  ),
  pairs AS (
    SELECT 'email' AS at, email AS av, 'ip' AS bt, ip AS bv FROM norm WHERE email <> '' AND ip <> ''
    UNION ALL
    SELECT 'email', email, 'address', address FROM norm WHERE email <> '' AND address <> ''
    UNION ALL
    SELECT 'email', email, 'card_last4', card FROM norm WHERE email <> '' AND length(card) = 4
    UNION ALL
    SELECT 'ip', ip, 'address', address FROM norm WHERE ip <> '' AND address <> ''
    UNION ALL
    SELECT 'ip', ip, 'card_last4', card FROM norm WHERE ip <> '' AND length(card) = 4
    UNION ALL
    SELECT 'address', address, 'card_last4', card FROM norm WHERE address <> '' AND length(card) = 4
  ),
  ordered AS (
    -- Sort each pair so (a,b) with a<b is canonical, mirroring writeCoOccurrences().
    SELECT
      CASE WHEN at || ':' || av < bt || ':' || bv THEN at ELSE bt END AS at,
      CASE WHEN at || ':' || av < bt || ':' || bv THEN av ELSE bv END AS av,
      CASE WHEN at || ':' || av < bt || ':' || bv THEN bt ELSE at END AS bt,
      CASE WHEN at || ':' || av < bt || ':' || bv THEN bv ELSE av END AS bv
    FROM pairs
  )
  INSERT INTO fraud_entity_co_occurrences (
    entity_a_type, entity_a_value, entity_b_type, entity_b_value, co_occurrence_count
  )
  SELECT at, av, bt, bv, count(*)
  FROM ordered
  GROUP BY at, av, bt, bv
  ON CONFLICT (entity_a_type, entity_a_value, entity_b_type, entity_b_value) DO UPDATE
    SET co_occurrence_count = EXCLUDED.co_occurrence_count;

  ---------------------------------------------------------------------------
  -- 6c. fraud_identity_clusters: pairs of orders sharing >=2 of {ip,address,card}
  ---------------------------------------------------------------------------
  WITH norm AS (
    SELECT
      order_id,
      lower(trim(customer_email)) AS email,
      trim(device_ip) AS ip,
      regexp_replace(regexp_replace(lower(shipping_address), '[^[:alnum:][:space:]]', ' ', 'g'), '\s+', ' ', 'g') AS address,
      right(regexp_replace(coalesce(card_last4,''), '\D', '', 'g'), 4) AS card,
      processed_at
    FROM fraud_transactions
  ),
  pairs AS (
    SELECT
      a.order_id AS a_order, b.order_id AS b_order,
      a.email AS a_email, b.email AS b_email,
      a.ip AS ip,
      a.address AS address,
      a.card AS card,
      ((a.ip <> '' AND a.ip = b.ip)::int +
       (a.address <> '' AND a.address = b.address)::int +
       (length(a.card) = 4 AND a.card = b.card)::int) AS shared_count,
      LEAST(a.processed_at, b.processed_at) AS first_seen,
      GREATEST(a.processed_at, b.processed_at) AS last_seen
    FROM norm a
    JOIN norm b
      ON a.order_id < b.order_id
     AND a.email <> b.email
     AND (
       (a.ip <> '' AND a.ip = b.ip)
       OR (a.address <> '' AND a.address = b.address)
       OR (length(a.card) = 4 AND a.card = b.card)
     )
  ),
  qualifying AS (
    SELECT * FROM pairs WHERE shared_count >= 2
  ),
  -- One cluster_id per connected pair-set (use min(a_email) as deterministic anchor)
  cluster_assignments AS (
    SELECT
      gen_random_uuid() AS cluster_id,
      a_email,
      b_email,
      ip,
      address,
      card,
      shared_count,
      first_seen,
      last_seen
    FROM qualifying
  ),
  cluster_rows AS (
    -- Each cluster gets one row per related entity (the linking attributes
    -- plus both emails). Confidence scales with how many attributes match.
    SELECT cluster_id, 'email' AS entity_type, a_email AS entity_value,
           CASE shared_count WHEN 3 THEN 95 WHEN 2 THEN 85 ELSE 70 END AS confidence,
           jsonb_build_array(
             'Linked to another email via '
             || shared_count || ' shared identity attributes (ip/address/card)'
           ) AS match_reasons,
           first_seen, last_seen
    FROM cluster_assignments
    UNION ALL
    SELECT cluster_id, 'email', b_email,
           CASE shared_count WHEN 3 THEN 95 WHEN 2 THEN 85 ELSE 70 END,
           jsonb_build_array(
             'Linked to another email via '
             || shared_count || ' shared identity attributes (ip/address/card)'
           ),
           first_seen, last_seen
    FROM cluster_assignments
    UNION ALL
    SELECT cluster_id, 'ip', ip,
           CASE shared_count WHEN 3 THEN 95 WHEN 2 THEN 85 ELSE 70 END,
           jsonb_build_array('Shared IP address across multiple emails'),
           first_seen, last_seen
    FROM cluster_assignments WHERE ip <> ''
    UNION ALL
    SELECT cluster_id, 'address', address,
           CASE shared_count WHEN 3 THEN 95 WHEN 2 THEN 85 ELSE 70 END,
           jsonb_build_array('Shared shipping address across multiple emails'),
           first_seen, last_seen
    FROM cluster_assignments WHERE address <> ''
    UNION ALL
    SELECT cluster_id, 'card_last4', card,
           CASE shared_count WHEN 3 THEN 95 WHEN 2 THEN 85 ELSE 70 END,
           jsonb_build_array('Shared payment card across multiple emails'),
           first_seen, last_seen
    FROM cluster_assignments WHERE length(card) = 4
  ),
  inserted_clusters AS (
    INSERT INTO fraud_identity_clusters (
      cluster_id, entity_type, entity_value, confidence, match_reasons, first_seen, last_seen
    )
    SELECT cluster_id, entity_type, entity_value, confidence, match_reasons, first_seen, last_seen
    FROM cluster_rows
    ON CONFLICT (cluster_id, entity_type, entity_value) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_clusters FROM inserted_clusters;

  RETURN QUERY SELECT v_emails, v_ips, v_addrs, v_cards, v_clusters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION seed_fraud_intelligence TO service_role;
