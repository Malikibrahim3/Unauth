-- RUN-03 / RUN-06: restore the missing table grants.
--
-- `work_saved_views` (20260724110000) and `case_claimed_items` (20260725100000)
-- were created without privileges for `service_role` or `authenticated`, so
-- every request through them failed with SQLSTATE 42501 and surfaced as a 500:
--
--   GET  /api/work/views                     -> "Unable to load saved Work views"
--   POST /api/claims/[claimId]/matches       -> "Could not save the item match."
--
-- Both siblings in the same feature area (`work_tasks`, `support_payout_cases`)
-- carry the grants below, so this restores the intended, consistent shape
-- rather than widening access. Row-level security remains the access boundary;
-- these grants only make the tables reachable at all.

grant select, insert, update, delete on public.work_saved_views to service_role;
grant select on public.work_saved_views to authenticated;

grant select, insert, update, delete on public.case_claimed_items to service_role;
grant select on public.case_claimed_items to authenticated;

-- The same migration created five further reconciliation tables with no
-- privileges at all, which is why GET /api/claims/[claimId]/matches returned
-- 500 even once the claimed-items table itself was reachable.
grant select, insert, update, delete on public.case_outcome_events to service_role;
grant select on public.case_outcome_events to authenticated;

grant select, insert, update, delete on public.case_recommendation_snapshots to service_role;
grant select on public.case_recommendation_snapshots to authenticated;

grant select, insert, update, delete on public.source_shipment_lines to service_role;
grant select on public.source_shipment_lines to authenticated;

grant select, insert, update, delete on public.provider_credit_records to service_role;
grant select on public.provider_credit_records to authenticated;

grant select, insert, update, delete on public.case_prevention_observations to service_role;
grant select on public.case_prevention_observations to authenticated;
