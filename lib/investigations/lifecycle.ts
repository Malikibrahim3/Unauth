import type {
  CaseInvestigation,
  InvestigationStatus,
} from '@/lib/investigations/types';

export type InvestigationAction =
  | 'update'
  | 'mark_sent'
  | 'send_accepted'
  | 'chase'
  | 'response'
  | 'close'
  | 'cancel';

const ALLOWED_ACTIONS: Record<InvestigationStatus, readonly InvestigationAction[]> = {
  draft: ['update', 'mark_sent', 'send_accepted', 'cancel'],
  sent: ['chase', 'response', 'close', 'cancel'],
  waiting_response: ['chase', 'response', 'close', 'cancel'],
  response_received: ['close', 'cancel'],
  closed: [],
  cancelled: [],
};

export function canApplyInvestigationAction(
  status: InvestigationStatus,
  action: InvestigationAction,
): boolean {
  return ALLOWED_ACTIONS[status].includes(action);
}

export function availableInvestigationActions(
  investigation: Pick<CaseInvestigation, 'status'>,
): readonly InvestigationAction[] {
  return ALLOWED_ACTIONS[investigation.status];
}

