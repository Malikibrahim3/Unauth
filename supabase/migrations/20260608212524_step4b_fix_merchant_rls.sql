-- Phase 2 Step 4b: Fix broken merchant-scoped RLS policies.
--
-- Replaces auth.uid() = merchant_id (wrong after merchants table split)
-- with merchant ownership + active team membership pattern (see 0037).

BEGIN;

-- ---------------------------------------------------------------------------
-- evidence_packages
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "merchant_own_evidence" ON public.evidence_packages;

CREATE POLICY "merchant_own_evidence" ON public.evidence_packages
  FOR ALL TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM public.merchant_members
        WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM public.merchant_members
        WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- customer_activity_log
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "merchant_own_activity" ON public.customer_activity_log;

CREATE POLICY "merchant_own_activity" ON public.customer_activity_log
  FOR ALL TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM public.merchant_members
        WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM public.merchant_members
        WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- csv_upload_queue
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "csv_upload_queue_select_own" ON public.csv_upload_queue;
DROP POLICY IF EXISTS "csv_upload_queue_insert_own" ON public.csv_upload_queue;
DROP POLICY IF EXISTS "csv_upload_queue_update_own" ON public.csv_upload_queue;

CREATE POLICY "csv_upload_queue_select_own" ON public.csv_upload_queue
  FOR SELECT TO authenticated USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM public.merchant_members
        WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  );

CREATE POLICY "csv_upload_queue_insert_own" ON public.csv_upload_queue
  FOR INSERT TO authenticated WITH CHECK (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM public.merchant_members
        WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  );

CREATE POLICY "csv_upload_queue_update_own" ON public.csv_upload_queue
  FOR UPDATE TO authenticated USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM public.merchant_members
        WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- customer_profiles — merchant_ids stores merchant UUIDs, not user UUIDs
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "customer_profiles_select_own" ON public.customer_profiles;

CREATE POLICY "customer_profiles_select_own" ON public.customer_profiles
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(merchant_ids) AS mid(text)
      WHERE mid::uuid IN (
        SELECT id FROM public.merchants WHERE user_id = auth.uid()
        UNION
        SELECT merchant_id FROM public.merchant_members
          WHERE user_id = auth.uid() AND invite_status = 'active'
      )
    )
  );

-- customer_profile_audit_appearances inherits the same merchant_ids fix
DROP POLICY IF EXISTS "cp_appearances_select_own" ON public.customer_profile_audit_appearances;

CREATE POLICY "cp_appearances_select_own" ON public.customer_profile_audit_appearances
  FOR SELECT TO authenticated USING (
    profile_id IN (
      SELECT id FROM public.customer_profiles cp
      WHERE EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(cp.merchant_ids) AS mid(text)
        WHERE mid::uuid IN (
          SELECT id FROM public.merchants WHERE user_id = auth.uid()
          UNION
          SELECT merchant_id FROM public.merchant_members
            WHERE user_id = auth.uid() AND invite_status = 'active'
        )
      )
    )
  );

COMMIT;
