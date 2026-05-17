ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS results_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS results_email_error text,
  ADD COLUMN IF NOT EXISTS public_audit_id uuid;

CREATE TABLE IF NOT EXISTS public_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_email text NOT NULL,
  original_filename text NOT NULL,
  row_count integer,
  processing_job_id uuid REFERENCES processing_jobs(id) ON DELETE SET NULL,
  linked_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_merchant_id uuid REFERENCES merchants(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'processing', 'completed', 'failed', 'claimed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_audits_email_idx
  ON public_audits (submitted_email, created_at DESC);

CREATE TABLE IF NOT EXISTS founding_merchant_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  monthly_order_volume text NOT NULL,
  monthly_refund_chargeback_volume text,
  fraud_problem text NOT NULL,
  agreed_to_terms_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  internal_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id)
);

CREATE INDEX IF NOT EXISTS founding_merchant_applications_status_idx
  ON founding_merchant_applications (status, created_at DESC);

ALTER TABLE founding_merchant_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founding_applications_select_own" ON founding_merchant_applications;
CREATE POLICY "founding_applications_select_own" ON founding_merchant_applications
  FOR SELECT USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM merchant_members
      WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  );

DROP POLICY IF EXISTS "founding_applications_insert_own" ON founding_merchant_applications;
CREATE POLICY "founding_applications_insert_own" ON founding_merchant_applications
  FOR INSERT WITH CHECK (
    created_by_user_id = auth.uid()
    AND merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM merchant_members
      WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  );

DROP POLICY IF EXISTS "founding_applications_update_own" ON founding_merchant_applications;
CREATE POLICY "founding_applications_update_own" ON founding_merchant_applications
  FOR UPDATE USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM merchant_members
      WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM merchant_members
      WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  );

GRANT ALL ON founding_merchant_applications TO authenticated;
GRANT ALL ON founding_merchant_applications TO service_role;
