-- Add current_stage column for progress tracking
ALTER TABLE audit_runs ADD COLUMN IF NOT EXISTS current_stage TEXT;

-- Create optimized identity upsert function
CREATE OR REPLACE FUNCTION upsert_identity_v2(
  p_email_hash   TEXT,
  p_merchant_id  UUID,
  p_is_refund    BOOLEAN,
  p_is_inr       BOOLEAN,
  p_signals      JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_identity_id  UUID;
  v_existing     identities%ROWTYPE;
  v_sighting_id  UUID;
  v_new_merchant BOOLEAN;
  v_sig_type     TEXT;
  v_sig_hash     TEXT;
BEGIN
  SELECT * INTO v_existing FROM identities WHERE primary_email_hash = p_email_hash;

  IF v_existing IS NULL THEN
    SELECT i.* INTO v_existing FROM identities i WHERE i.id IN (SELECT identity_id FROM identity_signal_links WHERE signal_type = 'card_fingerprint' AND signal_hash = (p_signals ->> 'card_fingerprint') LIMIT 1) LIMIT 1;
  END IF;
  IF v_existing IS NULL THEN
    SELECT i.* INTO v_existing FROM identities i WHERE i.id IN (SELECT identity_id FROM identity_signal_links WHERE signal_type = 'card_bin_last4' AND signal_hash = (p_signals ->> 'card_bin_last4') LIMIT 1) LIMIT 1;
  END IF;
  IF v_existing IS NULL THEN
    SELECT i.* INTO v_existing FROM identities i WHERE i.id IN (SELECT identity_id FROM identity_signal_links WHERE signal_type = 'account_id' AND signal_hash = (p_signals ->> 'account_id') LIMIT 1) LIMIT 1;
  END IF;
  IF v_existing IS NULL THEN
    SELECT i.* INTO v_existing FROM identities i WHERE i.id IN (SELECT identity_id FROM identity_signal_links WHERE signal_type = 'browser_fingerprint' AND signal_hash = (p_signals ->> 'browser_fingerprint') LIMIT 1) LIMIT 1;
  END IF;
  IF v_existing IS NULL THEN
    SELECT i.* INTO v_existing FROM identities i WHERE i.id IN (SELECT identity_id FROM identity_signal_links WHERE signal_type = 'device' AND signal_hash = (p_signals ->> 'device') LIMIT 1) LIMIT 1;
  END IF;
  IF v_existing IS NULL THEN
    SELECT i.* INTO v_existing FROM identities i WHERE i.id IN (SELECT identity_id FROM identity_signal_links WHERE signal_type = 'cookie_id' AND signal_hash = (p_signals ->> 'cookie_id') LIMIT 1) LIMIT 1;
  END IF;

  IF v_existing IS NULL THEN
    INSERT INTO identities (primary_email_hash, merchant_count, total_orders, total_refunds, total_inr_claims)
    VALUES (p_email_hash, 1, 1, CASE WHEN p_is_refund THEN 1 ELSE 0 END, CASE WHEN p_is_inr THEN 1 ELSE 0 END)
    ON CONFLICT (primary_email_hash) DO UPDATE
    SET total_orders = identities.total_orders + 1,
        total_refunds = identities.total_refunds + (CASE WHEN p_is_refund THEN 1 ELSE 0 END),
        total_inr_claims = identities.total_inr_claims + (CASE WHEN p_is_inr THEN 1 ELSE 0 END),
        last_seen_at = now()
    RETURNING id INTO v_identity_id;
  ELSE
    v_identity_id := v_existing.id;
    SELECT id INTO v_sighting_id FROM identity_sightings WHERE identity_id = v_identity_id AND merchant_id = p_merchant_id;
    v_new_merchant := v_sighting_id IS NULL;
    UPDATE identities SET
      merchant_count = merchant_count + (CASE WHEN v_new_merchant THEN 1 ELSE 0 END),
      total_orders = total_orders + 1,
      total_refunds = total_refunds + (CASE WHEN p_is_refund THEN 1 ELSE 0 END),
      total_inr_claims = total_inr_claims + (CASE WHEN p_is_inr THEN 1 ELSE 0 END),
      last_seen_at = now()
    WHERE id = v_identity_id;
  END IF;

  INSERT INTO identity_sightings (identity_id, merchant_id, order_count, refund_count, inr_count)
  VALUES (v_identity_id, p_merchant_id, 1, CASE WHEN p_is_refund THEN 1 ELSE 0 END, CASE WHEN p_is_inr THEN 1 ELSE 0 END)
  ON CONFLICT (identity_id, merchant_id) DO UPDATE
  SET order_count = identity_sightings.order_count + 1,
      refund_count = identity_sightings.refund_count + (CASE WHEN p_is_refund THEN 1 ELSE 0 END),
      inr_count = identity_sightings.inr_count + (CASE WHEN p_is_inr THEN 1 ELSE 0 END),
      last_seen_at = now();

  FOR v_sig_type, v_sig_hash IN SELECT key, value FROM jsonb_each_text(p_signals) WHERE value IS NOT NULL LOOP
    INSERT INTO identity_signal_links (identity_id, signal_type, signal_hash, confidence)
    VALUES (v_identity_id, v_sig_type, v_sig_hash,
      CASE v_sig_type
        WHEN 'card_fingerprint' THEN 0.95 WHEN 'card_bin_last4' THEN 0.92 WHEN 'account_id' THEN 0.90
        WHEN 'browser_fingerprint' THEN 0.88 WHEN 'device' THEN 0.85 WHEN 'cookie_id' THEN 0.85
        WHEN 'phone' THEN 0.80 WHEN 'card_last4' THEN 0.72 WHEN 'card_bin' THEN 0.70
        WHEN 'address_billing' THEN 0.75 WHEN 'address_shipping' THEN 0.65 WHEN 'email' THEN 0.60
        WHEN 'user_agent' THEN 0.48 WHEN 'ip' THEN 0.40 WHEN 'asn' THEN 0.42 WHEN 'name' THEN 0.35
        ELSE 0.50
      END)
    ON CONFLICT (identity_id, signal_type, signal_hash) DO UPDATE
    SET last_seen_at = now(), occurrence_count = identity_signal_links.occurrence_count + 1;
  END LOOP;

  RETURN v_identity_id;
END
$$;

REVOKE EXECUTE ON FUNCTION upsert_identity_v2 FROM anon, authenticated;
