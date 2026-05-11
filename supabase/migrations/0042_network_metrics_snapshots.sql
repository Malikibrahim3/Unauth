-- =============================================================================
-- 0031_network_metrics_snapshots.sql
-- ---------------------------------------------------------------------------
-- Daily network-wide metrics snapshots. Service role only — no RLS.
-- Populated by scripts/snapshot-network-metrics.ts (run via cron or manually).
-- =============================================================================

CREATE TABLE IF NOT EXISTS network_metrics_snapshots (
  id                                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date                         date NOT NULL UNIQUE,
  total_identities                      int DEFAULT 0,
  identities_at_2_merchants             int DEFAULT 0,
  identities_at_3plus_merchants         int DEFAULT 0,
  total_cross_merchant_matches_lifetime int DEFAULT 0,
  audits_in_last_30d                    int DEFAULT 0,
  audits_with_cross_merchant_signal_30d int DEFAULT 0,
  active_merchants_30d                  int DEFAULT 0,
  uploads_in_last_30d                   int DEFAULT 0,
  network_inr_claim_rate                numeric(5,4),
  network_refund_rate                   numeric(5,4),
  created_at                            timestamptz DEFAULT now()
);

-- Service role only — revoke all from authenticated/anon
REVOKE ALL ON network_metrics_snapshots FROM authenticated;
REVOKE ALL ON network_metrics_snapshots FROM anon;
