import type { ClaimReviewDraft } from '@/components/claims/claimReviewDraft';
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
  decisionAmount: string;
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

function readDraftField<T>(draft: Partial<ClaimReviewDraft> | null, key: keyof ClaimReviewDraft, fallback: T): T {
  if (!draft || typeof draft !== 'object') return fallback;
  const value = (draft as Record<string, unknown>)[key];
  return (value as T) ?? fallback;
}

/**
 * Keep the first render deterministic. Browser storage is restored in an
 * effect by the workbench so a saved draft cannot change server-rendered form
 * controls during hydration.
 */
export function createClaimReviewInitialState(_profileId: string, initialClaimId?: string | null): ClaimReviewState {
  return {
    selectedOrderId: '',
    claimType: 'missing_parcel',
    customerReason: '',
    notes: '',
    claimId: initialClaimId ?? '',
    decision: '' as Decision,
    outcome: 'pending',
    decisionAmount: '',
    evidenceType: 'tracking',
    source: 'manual',
    evidenceUrl: '',
    evidenceHash: '',
    metaRows: DEFAULT_META_ROWS,
    showMeta: false,
    busy: false,
    message: '',
    messageTone: 'neutral',
    statusToSet: 'pending',
    statusNote: '',
    reopenNote: '',
    reverseDecision: 'approved',
    reverseOutcome: 'pending',
    reverseNote: '',
    nextClaimHref: null,
    noMoreClaims: false,
    auditTab: 'timeline',
    claimFormOpen: false,
    railOpen: defaultRailOpen(),
    manualOrderRef: '',
    manualOrderSource: 'manual',
    manualModeExplicit: false,
    orderValue: '',
    snoozeDays: '3',
    snoozeReason: 'Awaiting carrier or customer evidence',
    shopDomain: '',
  };
}

/** Restore only persisted fields after hydration; transient UI state stays local. */
export function draftPatchFromSavedDraft(
  draft: Partial<ClaimReviewDraft> | null,
  initialClaimId?: string | null,
): Partial<ClaimReviewState> {
  const patch: Partial<ClaimReviewState> = {
    selectedOrderId: readDraftField(draft, 'selectedOrderId', ''),
    claimType: readDraftField(draft, 'claimType', 'missing_parcel') as ClaimType,
    customerReason: readDraftField(draft, 'customerReason', ''),
    notes: readDraftField(draft, 'notes', ''),
    claimId: initialClaimId ?? readDraftField(draft, 'claimId', ''),
    decision: readDraftField(draft, 'decision', '' as Decision) as Decision,
    outcome: readDraftField(draft, 'outcome', 'pending') as Outcome,
    decisionAmount: readDraftField(draft, 'decisionAmount', ''),
    evidenceType: readDraftField(draft, 'evidenceType', 'tracking') as EvidenceType,
    source: readDraftField(draft, 'source', 'manual') as EvidenceSource,
    evidenceUrl: readDraftField(draft, 'evidenceUrl', ''),
    evidenceHash: readDraftField(draft, 'evidenceHash', ''),
    statusToSet: readDraftField(draft, 'statusToSet', 'pending') as ClaimStatus,
    manualOrderRef: readDraftField(draft, 'manualOrderRef', ''),
    manualOrderSource: readDraftField(draft, 'manualOrderSource', 'manual'),
    manualModeExplicit: readDraftField(draft, 'manualModeExplicit', false),
    orderValue: readDraftField(draft, 'orderValue', ''),
  };

  if (Array.isArray(draft?.metaRows) && draft.metaRows.length > 0) {
    patch.metaRows = normalizeMetaRows(draft.metaRows);
  }

  return patch;
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
