export type CustomerNotesState = {
  notes: Array<{ id: string; body: string; created_at: string }>;
  draft: string;
  saving: boolean;
  savedMsg: string;
  loading: boolean;
  deletingId: string | null;
  selectedIds: Set<string>;
  bulkDeleting: boolean;
};

export type CustomerNotesAction =
  | { type: 'patch'; patch: Partial<Omit<CustomerNotesState, 'selectedIds'>> & { selectedIds?: Set<string> } }
  | { type: 'toggleSelected'; id: string; checked: boolean }
  | { type: 'clearSelected' };

export const initialCustomerNotesState: CustomerNotesState = {
  notes: [],
  draft: '',
  saving: false,
  savedMsg: '',
  loading: true,
  deletingId: null,
  selectedIds: new Set(),
  bulkDeleting: false,
};

export function customerNotesReducer(state: CustomerNotesState, action: CustomerNotesAction): CustomerNotesState {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'toggleSelected': {
      const next = new Set(state.selectedIds);
      if (action.checked) next.add(action.id);
      else next.delete(action.id);
      return { ...state, selectedIds: next };
    }
    case 'clearSelected':
      return { ...state, selectedIds: new Set() };
    default:
      return state;
  }
}
