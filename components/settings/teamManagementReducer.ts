export type TeamManagementState = {
  email: string;
  role: 'analyst' | 'admin' | 'viewer';
  submitting: boolean;
  busyMemberId: string | null;
  confirmingId: string | null;
  message: { type: 'success' | 'error'; text: string } | null;
};

export type TeamManagementAction =
  | { type: 'patch'; patch: Partial<TeamManagementState> };

export const initialTeamManagementState: TeamManagementState = {
  email: '',
  role: 'analyst' as const,
  submitting: false,
  busyMemberId: null,
  confirmingId: null,
  message: null,
};

export function teamManagementReducer(
  state: TeamManagementState,
  action: TeamManagementAction,
): TeamManagementState {
  if (action.type === 'patch') return { ...state, ...action.patch };
  return state;
}
