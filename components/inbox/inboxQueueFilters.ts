export interface InboxTransaction {
  id: string;
  order_id: string;
  identity_score?: number | null;
  identity_confidence_grade?: string | null;
  match_status?: string | null;
  processed_at: string;
  processing_job_id: string;
  customer_profile_id?: string | null;
  order_value?: number | null;
  reason?: string;
  claim_id?: string | null;
  first_viewed_at?: string | null;
  assigned_to?: string | null;
  snoozed_until?: string | null;
  status?: string | null;
}

export type QueueFilter = 'active' | 'new' | 'viewed' | 'overdue' | 'decision_ready' | 'unassigned';

const REVIEW_SLA_HOURS = 72;

function hoursSince(iso: string): number {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, (Date.now() - time) / (1000 * 60 * 60));
}

function queueMeta(tx: InboxTransaction) {
  const viewed = !!tx.first_viewed_at;
  const ageHours = hoursSince(tx.processed_at);
  const overdue = ageHours >= REVIEW_SLA_HOURS;
  const decisionReady = tx.match_status === 'definite' || (tx.identity_score ?? 0) >= 85;
  const dueHours = Math.ceil(REVIEW_SLA_HOURS - ageHours);
  const dueLabel = overdue ? 'Overdue' : dueHours <= 24 ? `Due in ${Math.max(1, dueHours)}h` : `Due in ${Math.ceil(dueHours / 24)}d`;
  const stage = !viewed ? 'New / unread' : decisionReady ? 'High confidence' : 'Viewed';
  const nextAction = !viewed
    ? 'Open identity evidence'
    : decisionReady
      ? 'Record merchant decision'
      : 'Review identity details';

  return { viewed, overdue, decisionReady, dueLabel, stage, nextAction };
}

export function matchesInboxQueueFilter(tx: InboxTransaction, queueFilter: QueueFilter): boolean {
  const meta = queueMeta(tx);
  switch (queueFilter) {
    case 'new':
      return !meta.viewed;
    case 'viewed':
      return meta.viewed;
    case 'overdue':
      return meta.overdue;
    case 'decision_ready':
      return meta.decisionReady;
    case 'unassigned':
      return !tx.assigned_to;
    case 'active':
    default:
      return true;
  }
}

export function countInboxQueues(items: InboxTransaction[]): Record<QueueFilter, number> {
  return items.reduce<Record<QueueFilter, number>>(
    (acc, tx) => {
      const meta = queueMeta(tx);
      acc.active += 1;
      if (!meta.viewed) acc.new += 1;
      if (meta.viewed) acc.viewed += 1;
      if (meta.overdue) acc.overdue += 1;
      if (meta.decisionReady) acc.decision_ready += 1;
      if (!tx.assigned_to) acc.unassigned += 1;
      return acc;
    },
    { active: 0, new: 0, viewed: 0, overdue: 0, decision_ready: 0, unassigned: 0 },
  );
}
