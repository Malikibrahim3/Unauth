BEGIN;

CREATE TABLE IF NOT EXISTS public.ingest_rate_limits (
  ip_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_hash, window_start)
);

CREATE INDEX IF NOT EXISTS ingest_rate_limits_window_start_idx
  ON public.ingest_rate_limits (window_start);

ALTER TABLE public.ingest_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ingest_rate_limits FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingest_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_ip_hash text,
  p_window_start timestamptz
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.ingest_rate_limits (ip_hash, window_start, request_count)
  VALUES (p_ip_hash, p_window_start, 1)
  ON CONFLICT (ip_hash, window_start)
  DO UPDATE SET request_count = public.ingest_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN COALESCE(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_rate_limit(text, timestamptz) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(text, timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.set_checkout_signal_cross_merchant_hits(
  p_signal_id uuid,
  p_hit_count integer
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.checkout_signals
  SET raw_payload = COALESCE(raw_payload, '{}'::jsonb)
    || jsonb_build_object('cross_merchant_device_hits', GREATEST(COALESCE(p_hit_count, 0), 0))
  WHERE id = p_signal_id;
$$;

REVOKE ALL ON FUNCTION public.set_checkout_signal_cross_merchant_hits(uuid, integer)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_checkout_signal_cross_merchant_hits(uuid, integer)
  TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-rate-limits');
EXCEPTION
  WHEN undefined_function OR undefined_schema THEN
    NULL;
END;
$$;

SELECT cron.schedule(
  'cleanup-rate-limits',
  '*/5 * * * *',
  $$DELETE FROM public.ingest_rate_limits
    WHERE window_start < now() - interval '5 minutes'$$
);

COMMIT;
