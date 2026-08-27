import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { now } from '@/lib/time/clock';
import type { WorkLifecycleRecord } from '@/lib/work/analytics';
import { hashId, shortRef } from '@/lib/ui/displayRef';
import {
  type WorkPriority,
  type WorkQueueFilters,
  type WorkQueueItem,
  type WorkQueuePage,
  type WorkViewCounts,
  validWorkActions,
} from '@/lib/work/types';

type WorkTaskCountResult = { count: number | null; error: { message: string } | null };

export type RawWorkQueueRow = {
  kind: 'task' | 'exception';
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  owner_user_id: string | null;
  owner_role: string | null;
  due_at: string | null;
  snoozed_until: string | null;
  created_at: string;
  updated_at: string;
  source: string | null;
  support_payout_case_id: string | null;
  loss_case_id: string | null;
  recovery_case_id: string | null;
  blocking_reason: string | null;
  source_metadata: Record<string, unknown>;
  task_kind: string;
  waiting_party: string | null;
  state_version: number;
  exception_type: string | null;
  exception_context: Record<string, unknown> | null;
  deadline_kind: string | null;
};

const EMPTY_VIEW_COUNTS: WorkViewCounts = {
  open: 0,
  mine: 0,
  unassigned: 0,
  snoozed: 0,
  'due-today': 0,
  overdue: 0,
  'no-sla': 0,
  blocked: 0,
  'evidence-needed': 0,
  'decision-needed': 0,
  'integration-exceptions': 0,
  completed: 0,
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function priority(value: unknown): WorkPriority {
  return value === 'urgent' || value === 'high' || value === 'low' ? value : 'medium';
}

function finiteCount(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
}

function actionTarget(row: RawWorkQueueRow): { href: string | null; label: string } {
  if (row.recovery_case_id) {
    return {
      href: `/financials/recovery/${encodeURIComponent(row.recovery_case_id)}`,
      label: `Recovery ${hashId(row.recovery_case_id)}`,
    };
  }
  if (row.loss_case_id) {
    return {
      href: `/financials/losses/${encodeURIComponent(row.loss_case_id)}`,
      label: `Loss ${hashId(row.loss_case_id)}`,
    };
  }
  if (row.support_payout_case_id) {
    const params = new URLSearchParams();
    const investigationId = nullableString(row.source_metadata.investigation_id);
    if (investigationId) {
      params.set('tab', 'responsibility');
      params.set('investigationId', investigationId);
    } else if (row.task_kind === 'external_handoff' || row.task_kind === 'external_outcome') {
      params.set('tab', 'evidence');
    } else if (row.task_kind === 'recovery_deadline' || row.task_kind === 'provider_chase') {
      params.set('tab', 'recovery');
    }
    const query = params.toString();
    return {
      href: `/cases/${encodeURIComponent(row.support_payout_case_id)}${query ? `?${query}` : ''}`,
      label: shortRef(null, row.support_payout_case_id),
    };
  }
  return {
    href: null,
    label: row.kind === 'exception' ? 'Integration exception' : 'Task',
  };
}

function toWorkQueueItem(
  row: RawWorkQueueRow,
  input: {
    currentUserId: string;
    canManage: boolean;
    canManageAnyAssignment: boolean;
    nowMs: number;
  },
): WorkQueueItem {
  const target = actionTarget(row);
  const base: WorkQueueItem = {
    id: row.id,
    key: `${row.kind}:${row.id}`,
    kind: row.kind,
    title: row.title,
    description: row.description,
    ownerRole: row.owner_role,
    ownerUserId: row.owner_user_id,
    status: row.status,
    priority: priority(row.priority),
    dueAt: row.due_at,
    snoozedUntil: row.snoozed_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stateVersion: Math.max(1, finiteCount(row.state_version)),
    taskKind: row.task_kind,
    waitingParty: row.waiting_party,
    supportPayoutCaseId: row.support_payout_case_id,
    lossCaseId: row.loss_case_id,
    recoveryCaseId: row.recovery_case_id,
    objectHref: target.href,
    objectLabel: target.label,
    blockingReason: row.blocking_reason,
    source: row.source,
    sourceMetadata: row.source_metadata,
    exceptionType: row.exception_type,
    exceptionContext: row.exception_context,
    exceptionStateVersion: row.kind === 'exception' ? row.state_version : null,
    deadlineKind: row.deadline_kind,
    validActions: [],
  };
  return {
    ...base,
    validActions: validWorkActions({ item: base, ...input }),
  };
}

function rawRow(value: unknown): RawWorkQueueRow | null {
  const row = record(value);
  const kind = row.kind === 'exception' ? 'exception' : row.kind === 'task' ? 'task' : null;
  const id = nullableString(row.id);
  const title = nullableString(row.title);
  const createdAt = nullableString(row.created_at);
  const updatedAt = nullableString(row.updated_at) ?? createdAt;
  if (!kind || !id || !title || !createdAt || !updatedAt) return null;
  return {
    kind,
    id,
    title,
    description: nullableString(row.description),
    status: nullableString(row.status) ?? 'open',
    priority: nullableString(row.priority) ?? 'medium',
    owner_user_id: nullableString(row.owner_user_id),
    owner_role: nullableString(row.owner_role),
    due_at: nullableString(row.due_at),
    snoozed_until: nullableString(row.snoozed_until),
    created_at: createdAt,
    updated_at: updatedAt,
    source: nullableString(row.source),
    support_payout_case_id: nullableString(row.support_payout_case_id),
    loss_case_id: nullableString(row.loss_case_id),
    recovery_case_id: nullableString(row.recovery_case_id),
    blocking_reason: nullableString(row.blocking_reason),
    source_metadata: record(row.source_metadata),
    task_kind: nullableString(row.task_kind) ?? (kind === 'exception' ? 'reconciliation_exception' : 'general'),
    waiting_party: nullableString(row.waiting_party),
    state_version: Math.max(1, finiteCount(row.state_version)),
    exception_type: nullableString(row.exception_type),
    exception_context: row.exception_context == null ? null : record(row.exception_context),
    deadline_kind: nullableString(row.deadline_kind),
  };
}

function viewCounts(value: unknown): WorkViewCounts {
  const source = record(value);
  return Object.fromEntries(
    Object.keys(EMPTY_VIEW_COUNTS).map((key) => [key, finiteCount(source[key])]),
  ) as WorkViewCounts;
}

function active<T extends { neq(column: string, value: string): T }>(query: T) {
  return query.neq('status', 'completed').neq('status', 'cancelled');
}

async function readCount(query: PromiseLike<WorkTaskCountResult>, label: string) {
  const result = await query;
  if (result.error) throw new Error(`work_task_${label}_count_failed: ${result.error.message}`);
  return result.count ?? 0;
}

function base(client: SupabaseClient, merchantId: string) {
  return client
    .from(TABLES.WORK_TASKS)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId);
}

function isFinalWorkState(row: RawWorkQueueRow) {
  return ['completed', 'cancelled', 'resolved', 'dismissed'].includes(row.status);
}

function isSnoozed(row: RawWorkQueueRow, nowMs: number) {
  return row.kind === 'task'
    && row.snoozed_until != null
    && Number.isFinite(Date.parse(row.snoozed_until))
    && Date.parse(row.snoozed_until) > nowMs;
}

function matchesView(row: RawWorkQueueRow, filters: WorkQueueFilters, userId: string, nowMs: number) {
  const active = !isFinalWorkState(row);
  const snoozed = isSnoozed(row, nowMs);
  const dueAt = row.due_at ? Date.parse(row.due_at) : Number.NaN;
  const createdAt = Date.parse(row.created_at);
  const todayEnd = new Date(nowMs);
  todayEnd.setUTCHours(0, 0, 0, 0);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

  switch (filters.view) {
    case 'mine': return active && !snoozed && row.owner_user_id === userId;
    case 'unassigned': return active && !snoozed && row.owner_user_id == null;
    case 'snoozed': return snoozed;
    case 'completed': return isFinalWorkState(row);
    case 'blocked': return active && !snoozed && row.status === 'blocked';
    case 'evidence-needed': return active && !snoozed && (row.task_kind === 'evidence_gap' || row.blocking_reason?.toLowerCase().includes('evidence') === true);
    case 'decision-needed': return active && !snoozed && (row.task_kind === 'decision' || `${row.title} ${row.blocking_reason ?? ''}`.toLowerCase().includes('decision'));
    case 'integration-exceptions': return row.kind === 'exception' && row.status === 'open';
    case 'overdue': return active && !snoozed && Number.isFinite(dueAt) && dueAt < nowMs;
    case 'due-today': return active && !snoozed && Number.isFinite(dueAt) && dueAt >= nowMs && dueAt < todayEnd.getTime();
    case 'no-sla': return active && !snoozed && !Number.isFinite(dueAt);
    case 'age-0-1': return active && !snoozed && createdAt >= nowMs - 86_400_000;
    case 'age-1-3': return active && !snoozed && createdAt >= nowMs - 4 * 86_400_000 && createdAt < nowMs - 86_400_000;
    case 'age-4-7': return active && !snoozed && createdAt >= nowMs - 8 * 86_400_000 && createdAt < nowMs - 4 * 86_400_000;
    case 'age-8-plus': return active && !snoozed && createdAt < nowMs - 8 * 86_400_000;
    default: return active && !snoozed;
  }
}

function compatibilityCounts(rows: RawWorkQueueRow[], userId: string, nowMs: number): WorkViewCounts {
  const active = rows.filter((row) => !isFinalWorkState(row));
  const actionable = active.filter((row) => !isSnoozed(row, nowMs));
  const todayEnd = new Date(nowMs);
  todayEnd.setUTCHours(0, 0, 0, 0);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
  const due = (row: RawWorkQueueRow) => row.due_at ? Date.parse(row.due_at) : Number.NaN;
  return {
    open: actionable.length,
    mine: actionable.filter((row) => row.owner_user_id === userId).length,
    unassigned: actionable.filter((row) => row.owner_user_id == null).length,
    snoozed: active.filter((row) => isSnoozed(row, nowMs)).length,
    'due-today': actionable.filter((row) => Number.isFinite(due(row)) && due(row) >= nowMs && due(row) < todayEnd.getTime()).length,
    overdue: actionable.filter((row) => Number.isFinite(due(row)) && due(row) < nowMs).length,
    'no-sla': actionable.filter((row) => !Number.isFinite(due(row))).length,
    blocked: actionable.filter((row) => row.status === 'blocked').length,
    'evidence-needed': actionable.filter((row) => row.task_kind === 'evidence_gap' || row.blocking_reason?.toLowerCase().includes('evidence') === true).length,
    'decision-needed': actionable.filter((row) => row.task_kind === 'decision' || `${row.title} ${row.blocking_reason ?? ''}`.toLowerCase().includes('decision')).length,
    'integration-exceptions': actionable.filter((row) => row.kind === 'exception').length,
    completed: rows.filter(isFinalWorkState).length,
  };
}

function compareRows(left: RawWorkQueueRow, right: RawWorkQueueRow, sort: WorkQueueFilters['sort']) {
  const stable = () => left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id);
  if (sort === 'priority') {
    const weight = { urgent: 4, high: 3, medium: 2, low: 1 } as const;
    return (weight[priority(right.priority)] - weight[priority(left.priority)]) || stable();
  }
  if (sort === 'oldest' || sort === 'newest') {
    const direction = sort === 'oldest' ? 1 : -1;
    return direction * (Date.parse(left.created_at) - Date.parse(right.created_at)) || stable();
  }
  const leftDue = left.due_at ? Date.parse(left.due_at) : Number.POSITIVE_INFINITY;
  const rightDue = right.due_at ? Date.parse(right.due_at) : Number.POSITIVE_INFINITY;
  return (leftDue - rightDue) || (Date.parse(left.created_at) - Date.parse(right.created_at)) || stable();
}

export function projectBoundedWorkQueue(input: {
  rows: RawWorkQueueRow[];
  filters: WorkQueueFilters;
  currentUserId: string;
  canManage: boolean;
  canManageAnyAssignment: boolean;
  nowMs: number;
}): WorkQueuePage {
  const needle = input.filters.search.trim().toLowerCase();
  const filtered = input.rows
    .filter((row) => matchesView(row, input.filters, input.currentUserId, input.nowMs))
    .filter((row) => !input.filters.priority || row.priority === input.filters.priority)
    .filter((row) => !input.filters.state || row.status === input.filters.state)
    .filter((row) => {
      if (!input.filters.assignee) return true;
      if (input.filters.assignee === 'mine') return row.owner_user_id === input.currentUserId;
      if (input.filters.assignee === 'unassigned') return row.owner_user_id == null;
      return row.owner_user_id === input.filters.assignee;
    })
    .filter((row) => !needle || [
      row.title,
      row.description,
      row.source,
      row.blocking_reason,
      row.task_kind,
      row.waiting_party,
      row.id,
    ].filter(Boolean).join(' ').toLowerCase().includes(needle))
    .sort((left, right) => compareRows(left, right, input.filters.sort));
  const start = (input.filters.page - 1) * input.filters.pageSize;
  return {
    items: filtered.slice(start, start + input.filters.pageSize).map((row) => toWorkQueueItem(row, {
      currentUserId: input.currentUserId,
      canManage: input.canManage,
      canManageAnyAssignment: input.canManageAnyAssignment,
      nowMs: input.nowMs,
    })),
    total: filtered.length,
    page: input.filters.page,
    pageSize: input.filters.pageSize,
    viewCounts: compatibilityCounts(input.rows, input.currentUserId, input.nowMs),
    source: 'bounded_compatibility',
    notice: 'The canonical Work database projection is pending in this environment. This bounded server projection remains exact up to 5,000 tasks and 5,000 exceptions.',
  };
}

async function loadBoundedCompatibilityRows(client: SupabaseClient, merchantId: string): Promise<RawWorkQueueRow[]> {
  const queryClient = client as unknown as { from: (table: string) => any };
  const limit = 5_000;
  const taskSelection = 'id,title,description,owner_role,owner_user_id,status,priority,due_at,snoozed_until,created_at,updated_at,source,support_payout_case_id,loss_case_id,recovery_case_id,blocking_reason,source_metadata,task_kind,waiting_party,state_version';
  const legacyTaskSelection = 'id,title,description,owner_role,owner_user_id,status,priority,due_at,created_at,updated_at,source,support_payout_case_id,loss_case_id,recovery_case_id,blocking_reason,source_metadata';
  let taskResult = await queryClient
    .from(TABLES.WORK_TASKS)
    .select(taskSelection, { count: 'exact' })
    .eq('merchant_id', merchantId)
    .order('id', { ascending: true })
    .range(0, limit - 1);
  if (taskResult.error && /column .* does not exist|schema cache/i.test(taskResult.error.message)) {
    taskResult = await queryClient
      .from(TABLES.WORK_TASKS)
      .select(legacyTaskSelection, { count: 'exact' })
      .eq('merchant_id', merchantId)
      .order('id', { ascending: true })
      .range(0, limit - 1);
  }
  const exceptionResult = await queryClient
    .from(TABLES.CASE_EXCEPTIONS)
    .select('id,title,detail,status,priority,assigned_to,due_at,created_at,updated_at,source_system,support_payout_case_id,exception_type,context,state_version,deadline_kind', { count: 'exact' })
    .eq('merchant_id', merchantId)
    .order('id', { ascending: true })
    .range(0, limit - 1);
  if (taskResult.error) throw new Error(`work_queue_tasks_failed: ${taskResult.error.message}`);
  if (exceptionResult.error) throw new Error(`work_queue_exceptions_failed: ${exceptionResult.error.message}`);
  if ((taskResult.count ?? 0) > limit || (exceptionResult.count ?? 0) > limit) {
    throw new Error('work_queue_projection_pending_population_exceeds_safe_bound');
  }

  const tasks = (taskResult.data ?? []).map((value: unknown) => rawRow({
    ...record(value),
    kind: 'task',
    snoozed_until: record(value).snoozed_until ?? null,
    task_kind: record(value).task_kind ?? 'general',
    waiting_party: record(value).waiting_party ?? null,
    state_version: record(value).state_version ?? 1,
    exception_type: null,
    exception_context: null,
    deadline_kind: null,
  })).filter((value: RawWorkQueueRow | null): value is RawWorkQueueRow => value != null);
  const exceptions = (exceptionResult.data ?? []).map((value: unknown) => {
    const source = record(value);
    return rawRow({
      kind: 'exception',
      id: source.id,
      title: source.title,
      description: source.detail,
      status: source.status,
      priority: source.priority ?? 'high',
      owner_user_id: source.assigned_to,
      owner_role: source.assigned_to ? 'assigned' : null,
      due_at: source.due_at,
      snoozed_until: null,
      created_at: source.created_at,
      updated_at: source.updated_at ?? source.created_at,
      source: source.source_system ?? 'reconciliation',
      support_payout_case_id: source.support_payout_case_id,
      loss_case_id: null,
      recovery_case_id: null,
      blocking_reason: source.exception_type,
      source_metadata: source.context ?? {},
      task_kind: 'reconciliation_exception',
      waiting_party: 'merchant',
      state_version: source.state_version ?? 1,
      exception_type: source.exception_type,
      exception_context: source.context ?? {},
      deadline_kind: source.deadline_kind,
    });
  }).filter((value: RawWorkQueueRow | null): value is RawWorkQueueRow => value != null);
  return [...tasks, ...exceptions];
}

export async function loadWorkQueuePage(input: {
  client: SupabaseClient;
  merchantId: string;
  currentUserId: string;
  canManage: boolean;
  canManageAnyAssignment: boolean;
  filters: WorkQueueFilters;
  asOf: Date;
}): Promise<WorkQueuePage> {
  const rpc = await input.client.rpc('work_queue_page_v1' as never, {
    p_merchant_id: input.merchantId,
    p_user_id: input.currentUserId,
    p_view: input.filters.view,
    p_search: input.filters.search || null,
    p_priority: input.filters.priority,
    p_state: input.filters.state,
    p_assignee: input.filters.assignee,
    p_sort: input.filters.sort,
    p_page: input.filters.page,
    p_page_size: input.filters.pageSize,
    p_now: input.asOf.toISOString(),
  } as never);
  if (!rpc.error) {
    const payload = record(rpc.data);
    const rows = Array.isArray(payload.items) ? payload.items.map(rawRow).filter((row): row is RawWorkQueueRow => row != null) : [];
    return {
      items: rows.map((row) => toWorkQueueItem(row, {
        currentUserId: input.currentUserId,
        canManage: input.canManage,
        canManageAnyAssignment: input.canManageAnyAssignment,
        nowMs: input.asOf.getTime(),
      })),
      total: finiteCount(payload.total),
      page: Math.max(1, finiteCount(payload.page)),
      pageSize: Math.max(1, finiteCount(payload.page_size)),
      viewCounts: viewCounts(payload.view_counts),
      source: 'canonical_rpc',
      notice: null,
    };
  }
  if (!/work_queue_page_v1|schema cache|does not exist|PGRST202/i.test(rpc.error.message)) {
    throw new Error(`work_queue_projection_failed: ${rpc.error.message}`);
  }
  const rows = await loadBoundedCompatibilityRows(input.client, input.merchantId);
  return projectBoundedWorkQueue({
    rows,
    filters: input.filters,
    currentUserId: input.currentUserId,
    canManage: input.canManage,
    canManageAnyAssignment: input.canManageAnyAssignment,
    nowMs: input.asOf.getTime(),
  });
}

export async function loadWorkNavigationCount(
  client: SupabaseClient,
  merchantId: string,
  userId: string,
): Promise<number | null> {
  const result = await client.rpc('work_queue_page_v1' as never, {
    p_merchant_id: merchantId,
    p_user_id: userId,
    p_view: 'open',
    p_search: null,
    p_priority: null,
    p_state: null,
    p_assignee: null,
    p_sort: 'deadline',
    p_page: 1,
    p_page_size: 1,
    p_now: now().toISOString(),
  } as never);
  if (!result.error) return finiteCount(record(record(result.data).view_counts).open);
  if (!/work_queue_page_v1|schema cache|does not exist|PGRST202/i.test(result.error.message)) return null;
  try {
    const { count: exceptionCount, error: exceptionError } = await client
      .from(TABLES.CASE_EXCEPTIONS)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .eq('status', 'open');
    if (exceptionError) return null;
    const counts = await countWorkViews(client, merchantId, userId, exceptionCount ?? 0);
    return counts.open;
  } catch {
    return null;
  }
}

/**
 * Counts the work views without loading every task into the page process.
 * The Work page is a queue, not a reporting export: counts should be cheap
 * indexed queries and the current view should be the only row payload.
 */
export async function countWorkViews(
  client: SupabaseClient,
  merchantId: string,
  userId: string,
  openExceptionCount: number,
) {
  const rpcResult = typeof client.rpc === 'function'
    ? await client.rpc('work_view_counts', {
      p_merchant_id: merchantId,
      p_user_id: userId,
      p_now: now().toISOString(),
    })
    : null;
  if (rpcResult && !rpcResult.error && rpcResult.data && typeof rpcResult.data === 'object') {
    const counts = rpcResult.data as Record<string, unknown>;
    const numberValue = (key: string, fallback = 0) => typeof counts[key] === 'number' ? counts[key] as number : fallback;
    return {
      includesExceptions: true,
      open: numberValue('open', openExceptionCount),
      mine: numberValue('mine'),
      unassigned: numberValue('unassigned'),
      'due-today': numberValue('due_today'),
      overdue: numberValue('overdue'),
      'no-sla': numberValue('no_sla'),
      blocked: numberValue('blocked'),
      'evidence-needed': numberValue('evidence_needed'),
      'decision-needed': numberValue('decision_needed'),
      'integration-exceptions': numberValue('integration_exceptions', openExceptionCount),
      completed: numberValue('completed'),
      deadlineBands: {
        overdue: numberValue('overdue'),
        dueToday: numberValue('due_today'),
        upcoming: numberValue('upcoming'),
        unscheduled: numberValue('unscheduled', openExceptionCount),
        invalid: 0,
      },
    };
  }
  const asOf = now();
  const todayStart = new Date(asOf);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

  const [
    activeCount,
    mine,
    unassigned,
    dueToday,
    blocked,
    evidenceNeeded,
    decisionNeeded,
    completed,
    overdue,
    upcoming,
    unscheduled,
  ] = await Promise.all([
    readCount(active(base(client, merchantId)), 'active'),
    readCount(active(base(client, merchantId)).eq('owner_user_id', userId), 'mine'),
    readCount(active(base(client, merchantId)).is('owner_user_id', null), 'unassigned'),
    readCount(active(base(client, merchantId)).gte('due_at', todayStart.toISOString()).lt('due_at', todayEnd.toISOString()), 'due_today'),
    readCount(active(base(client, merchantId)).eq('status', 'blocked'), 'blocked'),
    readCount(active(base(client, merchantId)).ilike('blocking_reason', '%evidence%'), 'evidence_needed'),
    readCount(active(base(client, merchantId)).or('title.ilike.%decision%,blocking_reason.ilike.%decision%'), 'decision_needed'),
    readCount(base(client, merchantId).eq('status', 'completed'), 'completed'),
    readCount(active(base(client, merchantId)).lt('due_at', asOf.toISOString()), 'overdue'),
    readCount(active(base(client, merchantId)).gte('due_at', todayEnd.toISOString()), 'upcoming'),
    readCount(active(base(client, merchantId)).is('due_at', null), 'unscheduled'),
  ]);

  return {
    includesExceptions: false,
    open: activeCount + openExceptionCount,
    mine,
    unassigned,
    'due-today': dueToday,
    overdue,
    'no-sla': unscheduled + openExceptionCount,
    blocked,
    'evidence-needed': evidenceNeeded,
    'decision-needed': decisionNeeded,
    'integration-exceptions': openExceptionCount,
    completed,
    deadlineBands: {
      overdue,
      dueToday,
      upcoming,
      unscheduled: unscheduled + openExceptionCount,
      invalid: 0,
    },
  };
}

/**
 * Due-band aggregate for the Work queue pulse (§6.8: "When will the queue
 * become risky?").
 *
 * This is a server aggregate over the full scoped active task set, as §6.8's
 * aggregate-ownership table requires — a chart built from the current 25-row
 * page would be a claim about the whole queue made from a paginated slice.
 * Bands are mutually exclusive and cover the population, so the pulse never
 * needs an "Other".
 */
export type WorkDueBandKey = 'overdue' | 'due-today' | 'due-1-3' | 'due-4-7' | 'due-later' | 'no-sla';
export type WorkAgeBandKey = 'age-0-1' | 'age-1-3' | 'age-4-7' | 'age-8-plus';

export type WorkRouteSummary = {
  viewCounts: {
    open: number;
    mine: number;
    unassigned: number;
    'due-today': number;
    overdue: number;
    'no-sla': number;
    blocked: number;
    'evidence-needed': number;
    'decision-needed': number;
    'integration-exceptions': number;
    completed: number;
  };
  dueBands: Record<WorkDueBandKey, number>;
  ageBands: Record<WorkAgeBandKey, number>;
};

type WorkFacetRow = { id: string; due_at: string | null; created_at: string };

async function loadWorkFacetRows(
  client: SupabaseClient,
  merchantId: string,
  kind: 'task' | 'exception',
): Promise<WorkFacetRow[] | null> {
  const pageSize = 1000;
  const maxInteractiveRows = 10_000;
  const loadPage = async (offset: number, includeCount: boolean) => {
    let query = client
      .from(kind === 'task' ? TABLES.WORK_TASKS : TABLES.CASE_EXCEPTIONS)
      .select('id,due_at,created_at', includeCount ? { count: 'exact' } : undefined)
      .eq('merchant_id', merchantId);
    query = kind === 'task'
      ? query.neq('status', 'completed').neq('status', 'cancelled')
      : query.eq('status', 'open');
    return query.order('id', { ascending: true }).range(offset, offset + pageSize - 1);
  };

  const first = await loadPage(0, true);
  if (first.error) return null;
  const total = first.count ?? first.data?.length ?? 0;
  if (total > maxInteractiveRows) return null;
  const pages = [];
  for (let offset = pageSize; offset < total; offset += pageSize) {
    pages.push(loadPage(offset, false));
  }
  const rest = await Promise.all(pages);
  if (rest.some((page) => page.error)) return null;
  const rows = [
    ...((first.data ?? []) as WorkFacetRow[]),
    ...rest.flatMap((page) => (page.data ?? []) as WorkFacetRow[]),
  ];
  return rows.length === total ? rows : null;
}

/**
 * Loads every full-queue facet in three bounded requests for ordinary
 * workspaces: the existing count RPC plus one narrow task scan and one narrow
 * exception scan. Oversized/erroring populations return null and retain the
 * exact count-query compatibility path in the route.
 */
export async function loadWorkRouteSummary(
  client: SupabaseClient,
  merchantId: string,
  userId: string,
  asOf: Date,
): Promise<WorkRouteSummary | null> {
  const [counts, taskRows, exceptionRows] = await Promise.all([
    countWorkViews(client, merchantId, userId, 0),
    loadWorkFacetRows(client, merchantId, 'task'),
    loadWorkFacetRows(client, merchantId, 'exception'),
  ]);
  if (!taskRows || !exceptionRows) return null;

  const dayAfterToday = new Date(asOf);
  dayAfterToday.setUTCHours(0, 0, 0, 0);
  dayAfterToday.setUTCDate(dayAfterToday.getUTCDate() + 1);
  const dayFour = new Date(dayAfterToday);
  dayFour.setUTCDate(dayFour.getUTCDate() + 3);
  const dayEight = new Date(dayAfterToday);
  dayEight.setUTCDate(dayEight.getUTCDate() + 7);
  const ageOne = asOf.getTime() - 86_400_000;
  const ageFour = asOf.getTime() - 4 * 86_400_000;
  const ageEight = asOf.getTime() - 8 * 86_400_000;
  const dueBands: WorkRouteSummary['dueBands'] = {
    overdue: 0,
    'due-today': 0,
    'due-1-3': 0,
    'due-4-7': 0,
    'due-later': 0,
    'no-sla': 0,
  };
  const ageBands: WorkRouteSummary['ageBands'] = {
    'age-0-1': 0,
    'age-1-3': 0,
    'age-4-7': 0,
    'age-8-plus': 0,
  };
  for (const row of [...taskRows, ...exceptionRows]) {
    if (!row.due_at) dueBands['no-sla'] += 1;
    else {
      const dueAt = Date.parse(row.due_at);
      if (!Number.isFinite(dueAt)) return null;
      if (dueAt < asOf.getTime()) dueBands.overdue += 1;
      else if (dueAt < dayAfterToday.getTime()) dueBands['due-today'] += 1;
      else if (dueAt < dayFour.getTime()) dueBands['due-1-3'] += 1;
      else if (dueAt < dayEight.getTime()) dueBands['due-4-7'] += 1;
      else dueBands['due-later'] += 1;
    }
    const createdAt = Date.parse(row.created_at);
    if (!Number.isFinite(createdAt)) return null;
    if (createdAt >= ageOne) ageBands['age-0-1'] += 1;
    else if (createdAt >= ageFour) ageBands['age-1-3'] += 1;
    else if (createdAt >= ageEight) ageBands['age-4-7'] += 1;
    else ageBands['age-8-plus'] += 1;
  }
  const exceptionNoSla = exceptionRows.filter((row) => !row.due_at).length;
  const viewCounts = counts.includesExceptions
    ? counts
    : {
        ...counts,
        open: counts.open + exceptionRows.length,
        'no-sla': counts['no-sla'] + exceptionNoSla,
        'integration-exceptions': exceptionRows.length,
      };
  return {
    viewCounts: {
      open: viewCounts.open,
      mine: viewCounts.mine,
      unassigned: viewCounts.unassigned,
      'due-today': dueBands['due-today'],
      overdue: dueBands.overdue,
      'no-sla': dueBands['no-sla'],
      blocked: viewCounts.blocked,
      'evidence-needed': viewCounts['evidence-needed'],
      'decision-needed': viewCounts['decision-needed'],
      'integration-exceptions': viewCounts['integration-exceptions'],
      completed: viewCounts.completed,
    },
    dueBands,
    ageBands,
  };
}

export async function countWorkDueBands(
  client: SupabaseClient,
  merchantId: string,
  asOf: Date,
): Promise<Record<WorkDueBandKey, number>> {
  const todayStart = new Date(asOf);
  todayStart.setUTCHours(0, 0, 0, 0);
  const dayAfterToday = new Date(todayStart);
  dayAfterToday.setUTCDate(dayAfterToday.getUTCDate() + 1);
  const dayFour = new Date(todayStart);
  dayFour.setUTCDate(dayFour.getUTCDate() + 4);
  const dayEight = new Date(todayStart);
  dayEight.setUTCDate(dayEight.getUTCDate() + 8);

  const [overdue, dueToday, days1to3, days4to7, later, unscheduled] = await Promise.all([
    readCount(active(base(client, merchantId)).lt('due_at', asOf.toISOString()), 'band_overdue'),
    readCount(
      active(base(client, merchantId))
        .gte('due_at', asOf.toISOString())
        .lt('due_at', dayAfterToday.toISOString()),
      'band_due_today',
    ),
    readCount(
      active(base(client, merchantId))
        .gte('due_at', dayAfterToday.toISOString())
        .lt('due_at', dayFour.toISOString()),
      'band_days_1_3',
    ),
    readCount(
      active(base(client, merchantId))
        .gte('due_at', dayFour.toISOString())
        .lt('due_at', dayEight.toISOString()),
      'band_days_4_7',
    ),
    readCount(active(base(client, merchantId)).gte('due_at', dayEight.toISOString()), 'band_later'),
    readCount(active(base(client, merchantId)).is('due_at', null), 'band_unscheduled'),
  ]);

  return {
    overdue,
    'due-today': dueToday,
    'due-1-3': days1to3,
    'due-4-7': days4to7,
    'due-later': later,
    'no-sla': unscheduled,
  };
}

export async function countWorkAgeBands(
  client: SupabaseClient,
  merchantId: string,
  asOf: Date,
): Promise<Record<WorkAgeBandKey, number>> {
  const dayOne = new Date(asOf.getTime() - 86_400_000).toISOString();
  const dayFour = new Date(asOf.getTime() - 4 * 86_400_000).toISOString();
  const dayEight = new Date(asOf.getTime() - 8 * 86_400_000).toISOString();
  const [newest, days1to3, days4to7, oldest] = await Promise.all([
    readCount(active(base(client, merchantId)).gte('created_at', dayOne), 'age_0_1'),
    readCount(active(base(client, merchantId)).gte('created_at', dayFour).lt('created_at', dayOne), 'age_1_3'),
    readCount(active(base(client, merchantId)).gte('created_at', dayEight).lt('created_at', dayFour), 'age_4_7'),
    readCount(active(base(client, merchantId)).lt('created_at', dayEight), 'age_8_plus'),
  ]);
  return {
    'age-0-1': newest,
    'age-1-3': days1to3,
    'age-4-7': days4to7,
    'age-8-plus': oldest,
  };
}

export async function loadWorkLifecycleRecords(
  client: SupabaseClient,
  merchantId: string,
  rangeStart: Date,
): Promise<{ records: WorkLifecycleRecord[]; unavailableReason?: string }> {
  const start = rangeStart.toISOString();
  const limit = 5000;
  const [tasks, exceptions] = await Promise.all([
    client
      .from(TABLES.WORK_TASKS)
      .select('id,status,created_at,updated_at,completed_at')
      .eq('merchant_id', merchantId)
      .or(`created_at.gte.${start},completed_at.gte.${start},updated_at.gte.${start},status.in.(open,in_progress,blocked)`)
      .order('created_at', { ascending: true })
      .limit(limit),
    client
      .from(TABLES.CASE_EXCEPTIONS)
      .select('id,status,created_at,resolved_at')
      .eq('merchant_id', merchantId)
      .or(`created_at.gte.${start},resolved_at.gte.${start},status.eq.open`)
      .order('created_at', { ascending: true })
      .limit(limit),
  ]);

  if (tasks.error || exceptions.error) {
    return {
      records: [],
      unavailableReason: 'Queue history could not be loaded. The live registry remains available below.',
    };
  }
  if ((tasks.data?.length ?? 0) >= limit || (exceptions.data?.length ?? 0) >= limit) {
    return {
      records: [],
      unavailableReason: 'Queue history exceeds the safe interactive range. Use the records export for a complete history.',
    };
  }

  const taskRecords: WorkLifecycleRecord[] = (tasks.data ?? []).map((row) => ({
    id: String(row.id),
    kind: 'task',
    createdAt: String(row.created_at),
    closedAt: row.status === 'completed'
      ? (row.completed_at ? String(row.completed_at) : null)
      : row.status === 'cancelled'
        ? String(row.updated_at)
        : null,
  }));
  const exceptionRecords: WorkLifecycleRecord[] = (exceptions.data ?? []).map((row) => ({
    id: String(row.id),
    kind: 'exception',
    createdAt: String(row.created_at),
    closedAt: row.status === 'resolved' || row.status === 'dismissed'
      ? (row.resolved_at ? String(row.resolved_at) : null)
      : null,
  }));
  return { records: [...taskRecords, ...exceptionRecords] };
}
