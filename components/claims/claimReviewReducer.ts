import { loadClaimDraft } from '@/components/claims/claimReviewDraft';
import { DEFAULT_META_ROWS } from '@/components/claims/claimReviewLabels';
import { defaultRailOpen, normalizeMetaRows } from '@/components/claims/claimReviewLogic';

let metaRowCounter = 0;
export function nextMetaRowId() {
  metaRowCounter += 1;
  return `meta-row-${metaRowCounter}`;
}
import type {
  ClaimStatus,
  ClaimType,
  Decision,
  EvidenceSource,
  EvidenceType,
  MessageTone,
  MetaRow,
  Outcome,
} from '@/components/claims/claimReviewTypes';

export type ClaimReviewState = {
  selectedOrderId: string;
  claimType: ClaimType;
  customerReason: string;
  notes: string;
  claimId: string;
  decision: Decision;
  outcome: Outcome;
  evidenceType: EvidenceType;
  source: EvidenceSource;
  evidenceUrl: string;
  evidenceHash: string;
  metaRows: MetaRow[];
  showMeta: boolean;
  busy: boolean;
  message: string;
  messageTone: MessageTone;
  statusToSet: ClaimStatus;
  statusNote: string;
  reopenNote: string;
  reverseDecision: Decision;
  reverseOutcome: Outcome;
  reverseNote: string;
  nextClaimHref: string | null;
  noMoreClaims: boolean;
  auditTab: 'timeline' | 'history';
  claimFormOpen: boolean;
  railOpen: Record<string, boolean>;
  manualOrderRef: string;
  manualOrderSource: string;
  manualModeExplicit: boolean;
  orderValue: string;
  snoozeDays: string;
  snoozeReason: string;
  shopDomain: string;
};

export type ClaimReviewAction =
  | { type: 'patch'; patch: Partial<ClaimReviewState> }
  | { type: 'setMetaRows'; updater: (rows: MetaRow[]) => MetaRow[] }
  | { type: 'toggleRail'; id: string }
  | { type: 'openRail'; section: string }
  | { type: 'setRailOpen'; railOpen: Record<string, boolean> };

function readDraftField<T>(draft: ReturnType<typeof loadClaimDraft>, key: string, fallback: T): T {
  if (!draft || typeof draft !== 'object') return fallback;
  const value = (draft as Record<string, unknown>)[key];
  return (value as T) ?? fallback;
}

export function createClaimReviewInitialState(profileId: string, initialClaimId?: string | null): ClaimReviewState {
  const draft = loadClaimDraft(profileId);
  const metaRows =
    draft?.metaRows && Array.isArray(draft.metaRows) && draft.metaRows.length > 0
      ? normalizeMetaRows(draft.metaRows)
      : DEFAULT_META_ROWS;

  return {
    selectedOrderId: readDraftField(draft, 'selectedOrderId', ''),
    claimType: (readDraftField(draft, 'claimType', 'missing_parcel') as ClaimType) ?? 'missing_parcel',
    customerReason: readDraftField(draft, 'customerReason', ''),
    notes: readDraftField(draft, 'notes', ''),
    claimId: initialClaimId ?? readDraftField(draft, 'claimId', ''),
    decision: (readDraftField(draft, 'decision', 'escalated') as Decision) ?? 'escalated',
    outcome: (readDraftField(draft, 'outcome', 'pending') as Outcome) ?? 'pending',
    evidenceType: (readDraftField(draft, 'evidenceType', 'tracking') as EvidenceType) ?? 'tracking',
    source: (readDraftField(draft, 'source', 'manual') as EvidenceSource) ?? 'manual',
    evidenceUrl: readDraftField(draft, 'evidenceUrl', ''),
    evidenceHash: readDraftField(draft, 'evidenceHash', ''),
    metaRows,
    showMeta: false,
    busy: false,
    message: '',
    messageTone: 'neutral',
    statusToSet: (readDraftField(draft, 'statusToSet', 'pending') as ClaimStatus) ?? 'pending',
    statusNote: '',
    reopenNote: '',
    reverseDecision: 'approved',
    reverseOutcome: 'legitimate',
    reverseNote: '',
    nextClaimHref: null,
    noMoreClaims: false,
    auditTab: 'timeline',
    claimFormOpen: false,
    railOpen: defaultRailOpen(),
    manualOrderRef: readDraftField(draft, 'manualOrderRef', ''),
    manualOrderSource: readDraftField(draft, 'manualOrderSource', 'manual'),
    manualModeExplicit: readDraftField(draft, 'manualModeExplicit', false),
    orderValue: readDraftField(draft, 'orderValue', ''),
    snoozeDays: '2',
    snoozeReason: 'Awaiting carrier or customer evidence',
    shopDomain: '',
  };
}

export function claimReviewReducer(state: ClaimReviewState, action: ClaimReviewAction): ClaimReviewState {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'setMetaRows':
      return { ...state, metaRows: action.updater(state.metaRows) };
    case 'toggleRail':
      return { ...state, railOpen: { ...state.railOpen, [action.id]: !state.railOpen[action.id] } };
    case 'openRail':
      return { ...state, railOpen: { ...state.railOpen, [action.section]: true } };
    case 'setRailOpen':
      return { ...state, railOpen: action.railOpen };
    default:
      return state;
  }
}
