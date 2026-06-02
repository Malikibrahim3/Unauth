import type { FreshdeskSupportConnectionSettings } from '@/lib/support/freshdesk/supportConnectionShared';

export type FreshdeskEphemeralSecret = {
  secret: string;
  webhookUrl: string;
  headerName: string;
  warning: string;
};

export type FreshdeskSyncMessage = {
  type: 'success' | 'error' | 'warning';
  text: string;
};

export type FreshdeskSupportSyncState = {
  domain: string;
  displayName: string;
  freshdeskApiKey: string;
  busy: boolean;
  message: FreshdeskSyncMessage | null;
  ephemeralSecret: FreshdeskEphemeralSecret | null;
  showCredHelp: boolean;
  copiedField: string | null;
};

export type FreshdeskSupportSyncAction =
  | { type: 'patch'; patch: Partial<FreshdeskSupportSyncState> }
  | { type: 'seedFromConnection'; connection: FreshdeskSupportConnectionSettings | null };

export function createInitialFreshdeskSupportSyncState(
  loadError: string | null
): FreshdeskSupportSyncState {
  return {
    domain: '',
    displayName: '',
    freshdeskApiKey: '',
    busy: false,
    message: loadError ? { type: 'error', text: loadError } : null,
    ephemeralSecret: null,
    showCredHelp: false,
    copiedField: null,
  };
}

function domainFromConnection(connection: FreshdeskSupportConnectionSettings): string {
  const host = connection.provider_base_url?.replace(/^https?:\/\//i, '').split('/')[0];
  return host || connection.provider_account_id || '';
}

export function freshdeskSupportSyncReducer(
  state: FreshdeskSupportSyncState,
  action: FreshdeskSupportSyncAction
): FreshdeskSupportSyncState {
  if (action.type === 'patch') return { ...state, ...action.patch };
  if (action.type === 'seedFromConnection') {
    return {
      ...state,
      domain: action.connection ? domainFromConnection(action.connection) : '',
    };
  }
  return state;
}
