BEGIN;

CREATE TABLE IF NOT EXISTS public.checkout_signal_order_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_signal_id uuid NOT NULL REFERENCES public.checkout_signals(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.source_orders(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  linked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (checkout_signal_id, order_id)
);

CREATE INDEX IF NOT EXISTS checkout_signal_order_links_order_id_idx
  ON public.checkout_signal_order_links (order_id);
CREATE INDEX IF NOT EXISTS checkout_signal_order_links_merchant_id_idx
  ON public.checkout_signal_order_links (merchant_id);

ALTER TABLE public.checkout_signal_order_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.checkout_signal_order_links FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkout_signal_order_links TO service_role;

COMMIT;
