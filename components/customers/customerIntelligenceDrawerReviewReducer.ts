export type ReviewStatusState = {
  status: string;
  saving: boolean;
};

export type ReviewStatusAction =
  | { type: 'set_status'; status: string }
  | { type: 'set_saving'; saving: boolean }
  | { type: 'rollback'; status: string };

export function reviewStatusReducer(state: ReviewStatusState, action: ReviewStatusAction): ReviewStatusState {
  switch (action.type) {
    case 'set_status':
      return { ...state, status: action.status };
    case 'set_saving':
      return { ...state, saving: action.saving };
    case 'rollback':
      return { ...state, status: action.status, saving: false };
    default:
      return state;
  }
}
