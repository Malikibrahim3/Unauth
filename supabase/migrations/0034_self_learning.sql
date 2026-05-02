-- 0034_self_learning.sql
--
-- Self-learning improvements:
--
--   1. Replace the staircase weight-adjustment formula in
--      record_signal_feedback with a continuous one, gated by a minimum
--      observation count so early noise doesn't move weights.
--
--      old: <0.5 precision -> -0.1   >0.8 precision -> +0.1   else 0
--      new: weight_adjustment = clamp((precision - 0.5) * 0.4, -0.3, 0.3)
--           applied only once (true_positive_count + false_positive_count) >= 10
--
--   2. normalisation_learning table — captures field-pair divergences
--      surfaced by merchant feedback so the canonical normalisers can be
--      improved deliberately (no auto-mutation).

-- 1. record_signal_feedback v2
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
  MIN_OBS CONSTANT INTEGER := 10;
BEGIN
  UPDATE fraud_transactions
     SET feedback_outcome = p_outcome,
         feedback_at = now()
   WHERE order_id = p_transaction_id;

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

    -- Continuous adjustment: clamp((precision - 0.5) * 0.4, -0.3, 0.3).
    -- Gated by MIN_OBS so a single observation can't move weights.
    -- precision is set to NULL (and weight_adjustment to 0) when the
    -- signal has not fired enough times to be evaluated.
    UPDATE signal_performance
       SET precision_score = CASE
             WHEN (true_positive_count + false_positive_count) = 0 THEN NULL
             ELSE true_positive_count::NUMERIC
                  / (true_positive_count + false_positive_count)
           END,
           weight_adjustment = CASE
             WHEN (true_positive_count + false_positive_count) < MIN_OBS THEN 0
             ELSE GREATEST(
                    -0.3,
                    LEAST(
                      0.3,
                      ((true_positive_count::NUMERIC
                        / (true_positive_count + false_positive_count)) - 0.5) * 0.4
                    )
                  )
           END
     WHERE signal_name = sig;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION record_signal_feedback TO service_role;
GRANT EXECUTE ON FUNCTION record_signal_feedback TO authenticated;

-- 2. normalisation_learning table.
CREATE TABLE IF NOT EXISTS normalisation_learning (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_type      TEXT NOT NULL CHECK (field_type IN ('address', 'name', 'email', 'phone')),
  value_a         TEXT NOT NULL,
  value_b         TEXT NOT NULL,
  confirmed_same  BOOLEAN NOT NULL,
  similarity_at_time NUMERIC,
  merchant_id     UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS normalisation_learning_field_idx
  ON normalisation_learning (field_type, confirmed_same);

ALTER TABLE normalisation_learning ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "normalisation_learning_read_authenticated" ON normalisation_learning;
CREATE POLICY "normalisation_learning_read_authenticated" ON normalisation_learning
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "normalisation_learning_write_service" ON normalisation_learning;
CREATE POLICY "normalisation_learning_write_service" ON normalisation_learning
  FOR INSERT TO service_role WITH CHECK (true);
