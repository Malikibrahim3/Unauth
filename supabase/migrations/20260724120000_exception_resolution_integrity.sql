-- Atomic settlement for non-match exceptions.
-- Match exceptions still use the relationship resolver so candidate validation
-- remains centralized; this function makes the final exception state change
-- lock-protected and retry-safe when the web/API process is racing another
-- operator.

create or replace function public.settle_case_exception_v1(
  p_merchant_id uuid,
  p_exception_id uuid,
  p_status text,
  p_resolution text default null,
  p_resolved_by uuid default null,
  p_expected_state_version bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_exception public.case_exceptions%rowtype;
begin
  if p_status not in ('resolved', 'dismissed') then
    raise exception 'exception_status_invalid' using errcode = '22023';
  end if;

  select * into v_exception
  from public.case_exceptions
  where merchant_id = p_merchant_id
    and id = p_exception_id
  for update;

  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if v_exception.status <> 'open' then
    raise exception 'already_settled' using errcode = '40001';
  end if;
  if p_expected_state_version is not null
     and coalesce(v_exception.state_version, 1) <> p_expected_state_version then
    raise exception 'version_conflict' using errcode = '40001';
  end if;

  update public.case_exceptions
  set status = p_status,
      resolution = p_resolution,
      resolved_by = p_resolved_by,
      resolved_at = now(),
      updated_at = now()
  where merchant_id = p_merchant_id
    and id = p_exception_id;

  select * into v_exception
  from public.case_exceptions
  where merchant_id = p_merchant_id
    and id = p_exception_id;

  return jsonb_build_object('exception', to_jsonb(v_exception));
end;
$function$;

revoke all on function public.settle_case_exception_v1(uuid, uuid, text, text, uuid, bigint) from public, anon, authenticated;
grant execute on function public.settle_case_exception_v1(uuid, uuid, text, text, uuid, bigint) to service_role;
