import type { WooCommerceConnectionSettings } from '@/lib/commerce/woocommerce/woocommerceConnectionShared';

export type WooCommerceSupportSyncState = {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  busy: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
};

export function createInitialWooCommerceSupportSyncState(
  loadError: string | null,
): WooCommerceSupportSyncState {
  return {
    storeUrl: '',
    consumerKey: '',
    consumerSecret: '',
    busy: false,
    message: loadError ? { type: 'error', text: loadError } : null,
  };
}

export type WooCommerceSupportSyncAction =
  | { type: 'patch'; patch: Partial<WooCommerceSupportSyncState> }
  | { type: 'seedFromConnection'; connection: WooCommerceConnectionSettings | null };

export function woocommerceSupportSyncReducer(
  state: WooCommerceSupportSyncState,
  action: WooCommerceSupportSyncAction,
): WooCommerceSupportSyncState {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'seedFromConnection':
      return {
        ...state,
        storeUrl: action.connection?.store_url ?? '',
        consumerKey: '',
        consumerSecret: '',
      };
    default:
      return state;
  }
}
