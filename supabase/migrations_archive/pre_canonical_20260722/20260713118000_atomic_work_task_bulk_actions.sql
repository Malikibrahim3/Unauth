begin;

create or replace function public.bulk_transition_work_tasks(
  p_merchant_id uuid,
  p_user_id uuid,
  p_task_ids uuid[],
  p_action text,
  p_until timestamptz default null
) returns setof public.work_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_task public.work_tasks%rowtype;
begin
  if coalesce(array_length(p_task_ids, 1), 0) = 0 or array_length(p_task_ids, 1) > 100 then
    raise exception 'task_ids_must_contain_1_to_100_items';
  end if;
  if p_action not in ('assign_to_me','start','complete','snooze') then
    raise exception 'unsupported_work_task_action';
  end if;
  if p_action = 'snooze' and (p_until is null or p_until <= v_now) then
    raise exception 'snooze_time_must_be_future';
  end if;
  if not exists (
    select 1 from public.merchant_users
    where merchant_id = p_merchant_id and user_id = p_user_id and invite_status = 'active'
  ) then
    raise exception 'merchant_membership_required';
  end if;
  if (select count(*) from public.work_tasks where merchant_id = p_merchant_id and id = any(p_task_ids)) <> array_length(p_task_ids, 1) then
    raise exception 'work_task_scope_mismatch';
  end if;

  for v_task in
    select * from public.work_tasks
    where merchant_id = p_merchant_id and id = any(p_task_ids)
    order by id for update
  loop
    if p_action = 'start' and v_task.status not in ('open','blocked') then
      raise exception 'task_not_startable:%', v_task.id;
    end if;
    if p_action = 'complete' and v_task.status in ('completed','cancelled') then
      raise exception 'task_already_closed:%', v_task.id;
    end if;

    update public.work_tasks set
      owner_user_id = case when p_action in ('assign_to_me','start') then coalesce(owner_user_id, p_user_id) else owner_user_id end,
      status = case when p_action = 'start' then 'in_progress' when p_action = 'complete' then 'completed' when p_action = 'snooze' then 'open' else status end,
      blocking_reason = case when p_action = 'start' then null else blocking_reason end,
      due_at = case when p_action = 'snooze' then p_until else due_at end,
      completed_at = case when p_action = 'complete' then v_now else completed_at end,
      completed_by = case when p_action = 'complete' then p_user_id else completed_by end,
      completion_outcome = case when p_action = 'complete' then jsonb_build_object('note','Bulk completion from Work') else completion_outcome end,
      updated_at = v_now
    where id = v_task.id;

    insert into public.domain_events (
      merchant_id, event_type, aggregate_type, aggregate_id, actor_type, actor_id,
      idempotency_key, occurred_at, payload
    ) values (
      p_merchant_id, 'work_task.' || p_action, 'work_task', v_task.id, 'user', p_user_id,
      'work-task-bulk:' || v_task.id::text || ':' || p_action || ':' || v_now::text,
      v_now,
      jsonb_build_object('task_id',v_task.id,'from_status',v_task.status,'bulk',true)
    );
  end loop;

  return query select * from public.work_tasks where merchant_id = p_merchant_id and id = any(p_task_ids) order by due_at nulls last, id;
end;
$$;

revoke all on function public.bulk_transition_work_tasks(uuid,uuid,uuid[],text,timestamptz) from public, anon, authenticated;
grant execute on function public.bulk_transition_work_tasks(uuid,uuid,uuid[],text,timestamptz) to service_role;

commit;
