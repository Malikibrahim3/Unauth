import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { now } from '@/lib/time/clock';

type WorkTaskCountResult = { count: number | null; error: { message: string } | null };

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
