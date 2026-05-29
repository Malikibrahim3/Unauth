-- audit_transactions.review_worthy
--
-- A row is "review-worthy" when it is BOTH a real identity match
-- (identity_confidence_grade in definite/probable/possible, or legacy
-- match_status probable/definite) AND shows suspicious behaviour (at least one
-- behavioural flag fired — a cluster-level signal, so ring members without
-- their own refund still inherit it).
--
-- Gating the merchant review queue on identity grade ALONE surfaced loyal
-- repeat customers (a high-confidence identity match with no suspicious
-- behaviour) — roughly a 20% false-positive rate on clean repeat customers in
-- the blind harness. This column lets buildReviewableFilter() apply the
-- behaviour gate. The identity grade itself stays behaviour-independent.

ALTER TABLE audit_transactions
  ADD COLUMN IF NOT EXISTS review_worthy boolean NOT NULL DEFAULT false;

-- Backfill existing rows from already-persisted columns. New rows are written
-- by the worker / re-stitch paths going forward.
UPDATE audit_transactions
SET review_worthy = (
  (
    identity_confidence_grade IN ('definite', 'probable', 'possible')
    OR match_status IN ('probable', 'definite')
  )
  AND jsonb_array_length(COALESCE(behavioural_flags, '[]'::jsonb)) > 0
)
WHERE review_worthy IS DISTINCT FROM (
  (
    identity_confidence_grade IN ('definite', 'probable', 'possible')
    OR match_status IN ('probable', 'definite')
  )
  AND jsonb_array_length(COALESCE(behavioural_flags, '[]'::jsonb)) > 0
);

-- Keep the per-job review-queue filter fast.
CREATE INDEX IF NOT EXISTS idx_audit_transactions_review_worthy
  ON audit_transactions (job_id)
  WHERE review_worthy = true;
