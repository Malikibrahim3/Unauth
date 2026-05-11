-- ─────────────────────────────────────────────────────────────────────────────
-- 0045  Two-tier identity model: candidate signals vs confirmed identity links
--
-- Separates "this order looks related to a cluster" (candidate) from
-- "these accounts are confirmed to be the same person" (confirmed/definite).
-- Merchants can flag a confirmed link as a possible false positive, but that
-- flag is stored for Unauth review only — it does NOT unmerge the identity.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── audit_transactions: new identity columns ─────────────────────────────────
ALTER TABLE audit_transactions
  ADD COLUMN IF NOT EXISTS match_status text
      CHECK (match_status IN ('none', 'candidate', 'probable', 'definite'))
      NOT NULL DEFAULT 'none',

  -- Set for probable + definite rows (score ≥ 50).
  -- Distinct from cluster_id so callers can query the tier independently.
  ADD COLUMN IF NOT EXISTS candidate_cluster_id uuid,

  -- Set ONLY for definite rows (score ≥ 75).
  -- Intentionally separate from cluster_id / candidate_cluster_id.
  ADD COLUMN IF NOT EXISTS confirmed_identity_id uuid,

  -- Merchant-submitted false-positive flag.  Does NOT change match_status.
  ADD COLUMN IF NOT EXISTS false_positive_reported boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS false_positive_reported_at timestamptz;

-- Index the new status column so UI queries filter efficiently.
CREATE INDEX IF NOT EXISTS idx_audit_tx_match_status
  ON audit_transactions (match_status);

CREATE INDEX IF NOT EXISTS idx_audit_tx_confirmed_identity_id
  ON audit_transactions (confirmed_identity_id)
  WHERE confirmed_identity_id IS NOT NULL;

-- ── customer_profiles: identity tier fields ───────────────────────────────────
ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS identity_status text
      CHECK (identity_status IN ('candidate', 'confirmed')),

  ADD COLUMN IF NOT EXISTS false_positive_reported boolean NOT NULL DEFAULT false;

-- ── Backfill match_status from legacy identity_confidence_grade ───────────────
UPDATE audit_transactions
SET match_status = CASE
  WHEN identity_confidence_grade = 'definite'  THEN 'definite'
  WHEN identity_confidence_grade = 'probable'  THEN 'probable'
  WHEN identity_confidence_grade = 'possible'  THEN 'candidate'
  ELSE 'none'
END
WHERE identity_confidence_grade IS NOT NULL;

-- ── Backfill confirmed_identity_id for existing definite rows ─────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_transactions' AND column_name = 'cluster_id'
  ) THEN
    UPDATE audit_transactions
    SET confirmed_identity_id = cluster_id
    WHERE identity_confidence_grade = 'definite'
      AND cluster_id IS NOT NULL;
  END IF;
END $$;

-- ── Backfill candidate_cluster_id for probable/possible rows ─────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_transactions' AND column_name = 'cluster_id'
  ) THEN
    UPDATE audit_transactions
    SET candidate_cluster_id = cluster_id
    WHERE identity_confidence_grade IN ('probable', 'possible')
      AND cluster_id IS NOT NULL;
  END IF;
END $$;

-- ── Backfill identity_status on customer_profiles ─────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_profiles' AND column_name = 'identity_confidence_grade'
  ) THEN
    UPDATE customer_profiles
    SET identity_status = CASE
      WHEN identity_confidence_grade = 'definite'              THEN 'confirmed'
      WHEN identity_confidence_grade IN ('probable', 'possible') THEN 'candidate'
      ELSE NULL
    END
    WHERE identity_confidence_grade IS NOT NULL;
  END IF;
END $$;

-- ── identity_false_positive_reports ──────────────────────────────────────────
-- Records every merchant-submitted false-positive report for Unauth review.
-- Immutable after insert — reviewers add notes / change status separately.
CREATE TABLE IF NOT EXISTS identity_false_positive_reports (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id            uuid        NOT NULL,
  reported_by_merchant_id text      NOT NULL,
  reported_at           timestamptz NOT NULL DEFAULT now(),

  -- Snapshot of the signals that caused the match, captured at report time.
  evidence_snapshot     jsonb,

  status                text        NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'under_review', 'confirmed_fp', 'dismissed')),
  reviewer_notes        text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fp_reports_cluster_id
  ON identity_false_positive_reports (cluster_id);

CREATE INDEX IF NOT EXISTS idx_fp_reports_merchant_id
  ON identity_false_positive_reports (reported_by_merchant_id);

-- ── identity_transitions ──────────────────────────────────────────────────────
-- Append-only audit log every time a cluster's match_status changes grade.
-- Enables re-scoring history and explainability for the Unauth team.
CREATE TABLE IF NOT EXISTS identity_transitions (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id                uuid        NOT NULL,
  from_status               text,
  to_status                 text        NOT NULL,
  score_before              numeric,
  score_after               numeric,
  triggering_transaction_id uuid,
  transitioned_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_id_transitions_cluster_id
  ON identity_transitions (cluster_id);
