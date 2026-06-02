import type { GorgiasSupportConnectionSettings } from '@/lib/support/gorgias/supportConnectionShared';

export type GorgiasEphemeralSecret = {
  secret: string;
  webhookUrl: string;
  headerName: string;
  warning: string;
};

export type GorgiasSyncMessage = {
  type: 'success' | 'error' | 'warning';
  text: string;
};

export type GorgiasSupportSyncState = {
  accountOrDomain: string;
  displayName: string;
  gorgiasApiEmail: string;
  gorgiasApiKey: string;
  busy: boolean;
  message: GorgiasSyncMessage | null;
  ephemeralSecret: GorgiasEphemeralSecret | null;
  showSetupInstructions: boolean;
  showCredHelp: boolean;
  copiedField: string | null;
};

export type GorgiasSupportSyncAction =
  | { type: 'patch'; patch: Partial<GorgiasSupportSyncState> }
  | { type: 'seedFromConnection'; connection: GorgiasSupportConnectionSettings | null };

export function createInitialGorgiasSupportSyncState(loadError: string | null): GorgiasSupportSyncState {
  return {
    accountOrDomain: '',
    displayName: '',
    gorgiasApiEmail: '',
    gorgiasApiKey: '',
    busy: false,
    message: loadError ? { type: 'error', text: loadError } : null,
    ephemeralSecret: null,
    showSetupInstructions: false,
    showCredHelp: false,
    copiedField: null,
  };
}

function accountOrDomainFromConnection(connection: GorgiasSupportConnectionSettings): string {
  const host = connection.provider_base_url?.replace(/^https?:\/\//i, '').split('/')[0];
  return host || connection.provider_account_id || '';
}

export function gorgiasSupportSyncReducer(
  state: GorgiasSupportSyncState,
  action: GorgiasSupportSyncAction,
): GorgiasSupportSyncState {
  if (action.type === 'patch') return { ...state, ...action.patch };
  if (action.type === 'seedFromConnection') {
    return {
      ...state,
      accountOrDomain: action.connection ? accountOrDomainFromConnection(action.connection) : '',
    };
  }
  return state;
}
