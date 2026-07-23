-- Tenant and authorization hardening proven by the synthetic two-merchant
-- runtime suite. Browser-authenticated clients retain merchant-scoped reads;
-- sensitive business writes go through permission-checked server routes.

begin;

-- The production-derived baseline retained default PUBLIC EXECUTE on many
-- SECURITY DEFINER functions, including merchant purge, credit mutation,
-- outbox claiming, and cross-merchant identity lookup. Remove that implicit
-- RPC surface and explicitly expose only the two read-only RLS helpers.
do $function_privileges$
declare
  v_function record;
begin
  for v_function in
    select p.oid::regprocedure as signature
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      v_function.signature
    );
    execute format('grant execute on function %s to service_role', v_function.signature);
  end loop;
end
$function_privileges$;

grant execute on function public.is_merchant_member(uuid) to authenticated;
grant execute on function public.merchant_role(uuid) to authenticated;

-- Reproduced defect: every active membership, including viewer, could mutate
-- these business tables directly through PostgREST. Keep reads behind active
-- membership RLS and reserve writes for the service role, where routes enforce
-- the exact product permission and target ownership.
drop policy if exists case_clarification_requests_member_insert on public.case_clarification_requests;
drop policy if exists case_clarification_requests_member_update on public.case_clarification_requests;
drop policy if exists case_clarification_requests_member_select on public.case_clarification_requests;
create policy case_clarification_requests_member_select
  on public.case_clarification_requests for select to authenticated
  using (public.is_merchant_member(merchant_id));

drop policy if exists case_decisions_member_all on public.case_decisions;
create policy case_decisions_member_select
  on public.case_decisions for select to authenticated
  using (public.is_merchant_member(merchant_id));

drop policy if exists case_outcomes_member_all on public.case_outcomes;
create policy case_outcomes_member_select
  on public.case_outcomes for select to authenticated
  using (public.is_merchant_member(merchant_id));

drop policy if exists evidence_links_member_all on public.evidence_links;
create policy evidence_links_member_select
  on public.evidence_links for select to authenticated
  using (public.is_merchant_member(merchant_id));

drop policy if exists evidence_packages_member_all on public.evidence_packages;
create policy evidence_packages_member_select
  on public.evidence_packages for select to authenticated
  using (public.is_merchant_member(merchant_id));

drop policy if exists identity_notes_member_all on public.identity_notes;
create policy identity_notes_member_select
  on public.identity_notes for select to authenticated
  using (public.is_merchant_member(merchant_id));

drop policy if exists loss_attribution_candidates_member_all on public.loss_attribution_candidates;
create policy loss_attribution_candidates_member_select
  on public.loss_attribution_candidates for select to authenticated
  using (public.is_merchant_member(merchant_id));

drop policy if exists mis_member_all on public.merchant_identity_state;
create policy merchant_identity_state_member_select
  on public.merchant_identity_state for select to authenticated
  using (public.is_merchant_member(merchant_id));

drop policy if exists "merchant manage own rules" on public.merchant_rules;
create policy merchant_rules_member_select
  on public.merchant_rules for select to authenticated
  using (public.is_merchant_member(merchant_id));

drop policy if exists partner_recovery_rules_member_all on public.partner_recovery_rules;
create policy partner_recovery_rules_member_select
  on public.partner_recovery_rules for select to authenticated
  using (public.is_merchant_member(merchant_id));

drop policy if exists partners_member_all on public.partners;
create policy partners_member_select
  on public.partners for select to authenticated
  using (public.is_merchant_member(merchant_id));

drop policy if exists recovery_cases_member_all on public.recovery_cases;
create policy recovery_cases_member_select
  on public.recovery_cases for select to authenticated
  using (public.is_merchant_member(merchant_id));

drop policy if exists support_payout_cases_member_update on public.support_payout_cases;

drop policy if exists work_tasks_member_all on public.work_tasks;
create policy work_tasks_member_select
  on public.work_tasks for select to authenticated
  using (public.is_merchant_member(merchant_id));

revoke insert, update, delete on public.case_clarification_requests from anon, authenticated;
revoke insert, update, delete on public.case_decisions from anon, authenticated;
revoke insert, update, delete on public.case_outcomes from anon, authenticated;
revoke insert, update, delete on public.evidence_links from anon, authenticated;
revoke insert, update, delete on public.evidence_packages from anon, authenticated;
revoke insert, update, delete on public.identity_notes from anon, authenticated;
revoke insert, update, delete on public.loss_attribution_candidates from anon, authenticated;
revoke insert, update, delete on public.merchant_identity_state from anon, authenticated;
revoke insert, update, delete on public.merchant_rules from anon, authenticated;
revoke insert, update, delete on public.partner_recovery_rules from anon, authenticated;
revoke insert, update, delete on public.partners from anon, authenticated;
revoke insert, update, delete on public.recovery_cases from anon, authenticated;
revoke insert, update, delete on public.support_payout_cases from anon, authenticated;
revoke insert, update, delete on public.work_tasks from anon, authenticated;

-- Permission delegation is owner-only in the product contract. The baseline
-- policy also allowed admins to write grants directly.
drop policy if exists user_permission_grants_owner_write on public.user_permission_grants;
create policy user_permission_grants_owner_write
  on public.user_permission_grants for all to authenticated
  using (public.merchant_role(merchant_id) = 'owner')
  with check (public.merchant_role(merchant_id) = 'owner');

-- Direct CSV objects use user/merchant/file paths. A user cannot cross either
-- the authenticated-user prefix or an active merchant membership boundary.
drop policy if exists "Authenticated users can upload" on storage.objects;
drop policy if exists "Authenticated users can view own files" on storage.objects;
drop policy if exists "Authenticated users can delete own files" on storage.objects;

create policy "Authenticated users can upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'merchant-csv-uploads-2'
    and auth.uid()::text = (storage.foldername(name))[1]
    and array_length(storage.foldername(name), 1) = 2
    and public.is_merchant_member(
      case
        when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then (storage.foldername(name))[2]::uuid
        else null
      end
    )
  );

create policy "Authenticated users can view own files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'merchant-csv-uploads-2'
    and auth.uid()::text = (storage.foldername(name))[1]
    and array_length(storage.foldername(name), 1) = 2
    and public.is_merchant_member(
      case
        when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then (storage.foldername(name))[2]::uuid
        else null
      end
    )
  );

create policy "Authenticated users can delete own files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'merchant-csv-uploads-2'
    and auth.uid()::text = (storage.foldername(name))[1]
    and array_length(storage.foldername(name), 1) = 2
    and public.is_merchant_member(
      case
        when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then (storage.foldername(name))[2]::uuid
        else null
      end
    )
  );

notify pgrst, 'reload schema';
commit;
