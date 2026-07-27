import type { ClaimQueueCounts } from './queueCounts';
import { formatNumber } from '@/lib/utils/format';

export type ClaimsListView =
  | { kind: 'active' }
  | { kind: 'unread' }
  | { kind: 'assigned_me' }
  | { kind: 'unassigned' }
  | { kind: 'snoozed' }
  | { kind: 'history' }
  | { kind: 'workflow'; workflow: string }
  | { kind: 'status'; status: string }
  | { kind: 'sla'; sla: 'overdue' | 'approaching' };

export function resolveClaimsListView(input: {
  queue?: string | null;
  owner?: string | null;
  viewed?: string | null;
  workflow?: string | null;
  status?: string | null;
  sla?: string | null;
}): ClaimsListView {
  if (input.sla === 'overdue' || input.sla === 'approaching') return { kind: 'sla', sla: input.sla };
  if (input.viewed === 'unread') return { kind: 'unread' };
  if (input.owner === 'me') return { kind: 'assigned_me' };
  if (input.owner === 'unassigned') return { kind: 'unassigned' };
  if (input.workflow) return { kind: 'workflow', workflow: input.workflow };
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
    case 'workflow':
      if (view.workflow === 'needs_evidence') return counts.awaitingEvidence;
      if (view.workflow === 'awaiting_carrier') return counts.awaitingCarrier;
      if (view.workflow === 'awaiting_3pl') return counts.awaiting3pl;
      if (view.workflow === 'awaiting_supplier') return counts.awaitingSupplier;
      if (view.workflow === 'ready_for_decision') return counts.readyForDecision;
      if (view.workflow === 'manual_review') return counts.manualReview;
      if (view.workflow === 'closed') return counts.closed;
      return counts.active;
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
  search?: string;
}): string {
  const { showing, totalMatching, view, search } = input;
  const pagePart = `Showing ${formatNumber(showing)} of ${formatNumber(totalMatching)}`;

  if (search) return `${pagePart} cases matching “${search}”`;

  switch (view.kind) {
    case 'active':
      return `${pagePart} case reviews`;
    case 'unread':
      return `${pagePart} cases with new evidence`;
    case 'assigned_me':
      return `${pagePart} case reviews`;
    case 'unassigned':
      return `${pagePart} cases needing review`;
    case 'snoozed':
      return `${pagePart} deferred cases`;
    case 'history':
      return `${pagePart} cases with recorded outcomes`;
    case 'workflow': {
      const labels: Record<string, string> = {
        needs_evidence: 'cases needing evidence',
        awaiting_carrier: 'cases awaiting carrier clarification',
        awaiting_3pl: 'cases awaiting 3PL clarification',
        awaiting_supplier: 'cases awaiting supplier clarification',
        ready_for_decision: 'cases ready for a decision',
        manual_review: 'cases in manual review',
        closed: 'closed cases',
      };
      return `${pagePart} ${labels[view.workflow] ?? view.workflow.replace(/_/g, ' ')}`;
    }
    case 'sla':
      return `${pagePart} ${view.sla === 'approaching' ? 'cases approaching review threshold' : 'ageing unresolved cases'}`;
    case 'status': {
      const labels: Record<string, string> = {
        open: 'cases with strong identity links',
        pending: 'cases waiting on source data',
        escalated: 'cases with high evidence density',
        resolved_refunded: 'refunded outcomes',
        resolved_won: 'won outcomes',
        resolved_lost: 'lost outcomes',
        resolved_denied: 'denied outcomes',
        resolved_exchanged: 'exchanged outcomes',
        voided: 'voided cases',
        stale: 'stale cases',
      };
      return `${pagePart} ${labels[view.status] ?? view.status.replace(/_/g, ' ')}`;
    }
    default:
      return `${pagePart} matching case reviews`;
  }
}
