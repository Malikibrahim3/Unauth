-- Legacy watchlist tables: merchant-facing watchlists are retired.
-- Case-scoped review uses merchant_claims, evidence workflows, and review queue.
-- Do not add new product writes; data preserved for purge/account-delete paths only.

COMMENT ON TABLE public.watchlist_entries IS
  'DEPRECATED (2026-06-03): Merchant customer watchlists retired in favor of case-scoped claim review. Legacy rows retained; CSV pipeline no longer syncs appearances. Do not build new features on this table.';

COMMENT ON TABLE public.watchlist_appearances IS
  'DEPRECATED (2026-06-03): Audit-run appearance rows for retired watchlist_entries. No new upserts from ingest; purge-expired-audits may still delete by audit_id.';
