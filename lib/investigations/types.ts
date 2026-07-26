import type { Partner } from '@/lib/partners/types';

export const INVESTIGATION_TARGETS = [
  'carrier',
  '3pl',
  'warehouse',
  'supplier',
  'customer',
  'internal',
] as const;
export type InvestigationTarget = (typeof INVESTIGATION_TARGETS)[number];

export const INVESTIGATION_STATUSES = [
  'draft',
  'sent',
  'waiting_response',
  'response_received',
  'closed',
  'cancelled',
] as const;
export type InvestigationStatus = (typeof INVESTIGATION_STATUSES)[number];

export const INVESTIGATION_CHANNELS = [
  'email',
  'api',
  'manual',
  'portal',
  'gorgias',
] as const;
export type InvestigationChannel = (typeof INVESTIGATION_CHANNELS)[number];

export const INVESTIGATION_RESPONSE_OUTCOMES = [
  'issue_confirmed',
  'no_issue_found',
  'inconclusive',
  'referred_elsewhere',
  'no_response',
] as const;
export type InvestigationResponseOutcome =
  (typeof INVESTIGATION_RESPONSE_OUTCOMES)[number];

export type CaseInvestigation = {
  id: string;
  merchant_id: string;
  support_payout_case_id: string;
  partner_id: string | null;
  is_primary: boolean;
  target_type: InvestigationTarget;
  target_name: string | null;
  status: InvestigationStatus;
  evidence_gap: string;
  recommended_reason: string | null;
  override_rationale: string | null;
  requested_evidence: string[];
  request_summary: string;
  subject: string;
  request_body: string;
  recipient: string | null;
  source_channel: InvestigationChannel | null;
  due_at: string | null;
  sent_at: string | null;
  external_reference: string | null;
  external_url: string | null;
  response_outcome: InvestigationResponseOutcome | null;
  response_summary: string | null;
  response_body: string | null;
  responder_name: string | null;
  response_received_at: string | null;
  created_by: string | null;
  sent_by: string | null;
  response_recorded_by: string | null;
  closed_by: string | null;
  closed_at: string | null;
  closure_reason: string | null;
  idempotency_key: string | null;
  state_version: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  partner?: Partner | null;
};

export type InvestigationRecommendation = {
  targetType: InvestigationTarget;
  targetName: string | null;
  partnerId: string | null;
  evidenceGap: string;
  reason: string;
  requestedEvidence: string[];
  priority: 'medium' | 'high' | 'urgent';
  dueAt: string;
  secondaryJustified: boolean;
};

export type InvestigationAggregate = {
  total: number;
  open: number;
  waiting: number;
  overdue: number;
  awaitingReview: number;
  primary: CaseInvestigation | null;
  nextDueAt: string | null;
};

export function isOpenInvestigation(status: InvestigationStatus): boolean {
  return !['closed', 'cancelled'].includes(status);
}

export function isInvestigationOverdue(
  investigation: Pick<CaseInvestigation, 'status' | 'due_at'>,
  now = new Date(),
): boolean {
  if (investigation.status !== 'waiting_response' || !investigation.due_at) return false;
  const due = Date.parse(investigation.due_at);
  return Number.isFinite(due) && due < now.getTime();
}
