import type { ClaimQueueCounts } from './queueCounts';

export type ClaimsListView =
  | { kind: 'active' }
  | { kind: 'unread' }
  | { kind: 'assigned_me' }
  | { kind: 'unassigned' }
  | { kind: 'snoozed' }
  | { kind: 'history' }
  | { kind: 'status'; status: string }
  | { kind: 'sla'; sla: 'overdue' | 'approaching' };

export function resolveClaimsListView(input: {
  queue?: string | null;
  owner?: string | null;
  viewed?: string | null;
  status?: string | null;
  sla?: string | null;
}): ClaimsListView {
  if (input.sla === 'overdue' || input.sla === 'approaching') return { kind: 'sla', sla: input.sla };
  if (input.viewed === 'unread') return { kind: 'unread' };
  if (input.owner === 'me') return { kind: 'assigned_me' };
  if (input.owner === 'unassigned') return { kind: 'unassigned' };
  if (input.queue === 'snoozed') return { kind: 'snoozed' };
  if (input.queue === 'history') return { kind: 'history' };
  if (input.status) return { kind: 'status', status: input.status };
  return { kind: 'active' };
}

export function claimsListTotalForView(view: ClaimsListView, counts: ClaimQueueCounts): number {
  switch (view.kind) {
    case 'active': return counts.active;
    case 'unread': return counts.unread;
    case 'assigned_me': return counts.assignedToMe;
    case 'unassigned': return counts.unassigned;
    case 'sla':
      return view.sla === 'overdue' ? counts.overdue : counts.active;
    case 'snoozed': return counts.snoozed;
    case 'history': return counts.resolved;
    case 'status':
      if (view.status === 'open') return counts.open;
      if (view.status === 'pending') return counts.awaitingInfo;
      if (view.status === 'escalated') return counts.escalated;
      return counts.active;
    default: return counts.active;
  }
}

export function formatClaimsResultText(input: {
  showing: number;
  totalMatching: number;
  view: ClaimsListView;
}): string {
  const { showing, totalMatching, view } = input;
  const pagePart = `Showing ${showing.toLocaleString('en-US')} of ${totalMatching.toLocaleString('en-US')}`;

  switch (view.kind) {
    case 'active':
      return `${pagePart} active claims`;
    case 'unread':
      return `${pagePart} new unread claims`;
    case 'assigned_me':
      return `${pagePart} claims assigned to you`;
    case 'unassigned':
      return `${pagePart} unassigned claims`;
    case 'snoozed':
      return `${pagePart} snoozed claims`;
    case 'history':
      return `${pagePart} resolved claims in history`;
    case 'sla':
      return `${pagePart} ${view.sla === 'approaching' ? 'claims approaching SLA' : 'overdue claims'}`;
    case 'status': {
      const labels: Record<string, string> = {
        open: 'open claims',
        pending: 'claims awaiting info',
        escalated: 'escalated claims',
        resolved_refunded: 'refunded claims',
        resolved_won: 'won claims',
        resolved_lost: 'lost claims',
        resolved_denied: 'denied claims',
        resolved_exchanged: 'exchanged claims',
        voided: 'voided claims',
        stale: 'stale claims',
      };
      return `${pagePart} ${labels[view.status] ?? view.status.replace(/_/g, ' ')}`;
    }
    default:
      return `${pagePart} matching claims`;
  }
}
