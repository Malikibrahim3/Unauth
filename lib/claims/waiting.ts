/**
 * Waiting time and deadlines (RUN-19).
 *
 * "How long has this been waiting?" is not the same question as "how old is
 * this case?", and neither is answered by `updated_at`. A case updated by an
 * unrelated internal edit showed `0d waiting` while genuinely sitting untouched
 * for six weeks, because the clock being read was the row's last write rather
 * than the transition being described.
 *
 * Each work state names the clock that governs it:
 *
 *   waiting on an external party   the moment we entered that state
 *   waiting on the merchant        the moment action became required
 *   resolved                       nothing is waiting
 *
 * `statusEnteredAt` must come from the status transition itself. It falls back
 * to the case's opening time — never to `updated_at`, which is the defect.
 */
import { isFinalClaimStatus } from '@/lib/claims/sla';

export type WaitingClock = 'external_response' | 'merchant_action' | 'none';

export type WaitingInput = {
  status?: string | null;
  /** When the case entered its current status, from the transition record. */
  statusEnteredAt?: string | null;
  /** When merchant action became required, when that is the governing clock. */
  actionRequiredAt?: string | null;
  createdAt?: string | null;
  submittedAt?: string | null;
  /** Explicit deadline, when one exists. */
  dueAt?: string | null;
};

export type WaitingState = {
  clock: WaitingClock;
  /** The instant the current wait began, or null when nothing is waiting. */
  since: string | null;
  waitingDays: number | null;
  deadlineState: 'no_deadline' | 'upcoming' | 'due_today' | 'overdue';
  dueAt: string | null;
};

const DAY_MS = 86_400_000;

/** States where the product is waiting on somebody outside the merchant. */
const EXTERNAL_WAIT_STATUSES = new Set([
  'awaiting_carrier_response',
  'awaiting_3pl_response',
  'awaiting_supplier_response',
  'awaiting_customer_evidence',
]);

/** States where the merchant is the one who must act. */
const MERCHANT_ACTION_STATUSES = new Set([
  'evidence_needed',
  'ready_for_decision',
  'manual_review',
  'open',
  'new',
  'pending',
  'escalated',
]);

export function waitingClockFor(status: string | null | undefined): WaitingClock {
  if (isFinalClaimStatus(status)) return 'none';
  if (EXTERNAL_WAIT_STATUSES.has(status ?? '')) return 'external_response';
  if (MERCHANT_ACTION_STATUSES.has(status ?? '')) return 'merchant_action';
  return 'none';
}

function parse(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Calendar days between two instants in a given timezone. Waiting age is a
 * calendar question — "since Tuesday" — so a fixed 24h divisor drifts by a day
 * around DST and across timezone boundaries.
 */
export function calendarDaysBetween(fromMs: number, toMs: number, timeZone: string): number {
  const dayKey = (ms: number) =>
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
      new Date(ms),
    );
  const from = Date.parse(`${dayKey(fromMs)}T00:00:00Z`);
  const to = Date.parse(`${dayKey(toMs)}T00:00:00Z`);
  return Math.round((to - from) / DAY_MS);
}

export function resolveWaitingState(
  input: WaitingInput,
  nowMs: number,
  timeZone = 'Europe/London',
): WaitingState {
  const clock = waitingClockFor(input.status);

  if (clock === 'none') {
    return { clock, since: null, waitingDays: null, deadlineState: 'no_deadline', dueAt: input.dueAt ?? null };
  }

  // The governing instant, in order of authority. `updated_at` is deliberately
  // absent: an unrelated write must never reset a wait.
  const since =
    clock === 'merchant_action'
      ? (input.actionRequiredAt ?? input.statusEnteredAt ?? input.submittedAt ?? input.createdAt ?? null)
      : (input.statusEnteredAt ?? input.submittedAt ?? input.createdAt ?? null);

  const sinceMs = parse(since);
  const waitingDays = sinceMs === null ? null : Math.max(0, calendarDaysBetween(sinceMs, nowMs, timeZone));

  return {
    clock,
    since,
    waitingDays,
    deadlineState: resolveDeadlineState(input.dueAt ?? null, nowMs, timeZone),
    dueAt: input.dueAt ?? null,
  };
}

export function resolveDeadlineState(
  dueAt: string | null,
  nowMs: number,
  timeZone = 'Europe/London',
): WaitingState['deadlineState'] {
  const due = parse(dueAt);
  if (due === null) return 'no_deadline';
  const days = calendarDaysBetween(nowMs, due, timeZone);
  if (days < 0) return 'overdue';
  if (days === 0) return 'due_today';
  return 'upcoming';
}
