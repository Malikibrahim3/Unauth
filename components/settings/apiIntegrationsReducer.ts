import type { ApiKeyRow } from '@/components/settings/apiIntegrationsTypes';

export type ApiIntegrationsState = {
  keyName: string;
  creating: boolean;
  createdSecret: string | null;
  createdWidgetToken: string | null;
  revokeTarget: ApiKeyRow | null;
  busyId: string | null;
  message: { type: 'success' | 'error'; text: string } | null;
  copied: boolean;
};

export type ApiIntegrationsAction =
  | { type: 'patch'; patch: Partial<ApiIntegrationsState> }
  | { type: 'clearCreated' };

export const initialApiIntegrationsState: ApiIntegrationsState = {
  keyName: '',
  creating: false,
  createdSecret: null,
  createdWidgetToken: null,
  revokeTarget: null,
  busyId: null,
  message: null,
  copied: false,
};

export function apiIntegrationsReducer(
  state: ApiIntegrationsState,
  action: ApiIntegrationsAction,
): ApiIntegrationsState {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'clearCreated':
      return {
        ...state,
        createdSecret: null,
        createdWidgetToken: null,
        keyName: '',
        copied: false,
      };
    default:
      return state;
  }
}
