import type { CustomerIntelligencePanel } from '@/app/api/customers/[id]/route';

export type AuditCustomersTableState = {
  drawerOpen: boolean;
  drawerResolving: boolean;
  drawerProfileId: string | null;
  drawerPanel: CustomerIntelligencePanel | null;
  search: string;
  gradeFilter: string;
};

export type AuditCustomersTableAction =
  | { type: 'patch'; patch: Partial<AuditCustomersTableState> }
  | { type: 'openDrawer' }
  | { type: 'closeDrawer' }
  | { type: 'drawerResolved'; profileId: string | null; panel: CustomerIntelligencePanel | null }
  | { type: 'drawerFailed' };

export function createAuditCustomersInitialState(initialEmail: string | null | undefined): AuditCustomersTableState {
  return {
    drawerOpen: Boolean(initialEmail),
    drawerResolving: Boolean(initialEmail),
    drawerProfileId: null,
    drawerPanel: null,
    search: '',
    gradeFilter: '',
  };
}

export function auditCustomersTableReducer(
  state: AuditCustomersTableState,
  action: AuditCustomersTableAction,
): AuditCustomersTableState {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'openDrawer':
      return {
        ...state,
        drawerOpen: true,
        drawerResolving: true,
        drawerProfileId: null,
        drawerPanel: null,
      };
    case 'closeDrawer':
      return {
        ...state,
        drawerOpen: false,
        drawerResolving: false,
        drawerProfileId: null,
        drawerPanel: null,
      };
    case 'drawerResolved':
      return {
        ...state,
        drawerResolving: false,
        drawerProfileId: action.profileId,
        drawerPanel: action.panel,
      };
    case 'drawerFailed':
      return {
        ...state,
        drawerOpen: false,
        drawerResolving: false,
        drawerProfileId: null,
        drawerPanel: null,
      };
    default:
      return state;
  }
}
