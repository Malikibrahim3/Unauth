-- Per-merchant monthly context credit override (required for Scale / Enterprise).

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS context_credits_monthly INTEGER
    CHECK (context_credits_monthly IS NULL OR context_credits_monthly > 0);

COMMENT ON COLUMN subscriptions.context_credits_monthly IS
  'Explicit monthly context credit allowance for scale/enterprise. Required when tier is scale or enterprise.';
