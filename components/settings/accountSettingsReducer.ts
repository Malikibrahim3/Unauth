export interface MerchantData {
  id: string;
  name: string;
  monthly_order_volume: string | null;
  primary_fraud_concern: string | null;
  setup_complete: boolean;
}

export type AccountSettingsState = {
  userEmail: string;
  merchant: MerchantData | null;
  storeName: string;
  monthlyVolume: string;
  fraudConcern: string;
  saving: boolean;
  saveSuccess: boolean;
  saveError: string;
  newPassword: string;
  confirmPassword: string;
  showPasswords: boolean;
  passwordSaving: boolean;
  passwordSuccess: string;
  passwordError: string;
  deleteConfirm: string;
  deleteLoading: boolean;
};

export type AccountSettingsAction =
  | { type: 'patch'; patch: Partial<AccountSettingsState> }
  | { type: 'loadAccount'; userEmail: string; merchant: MerchantData | null }
  | { type: 'profileSaved'; merchant: MerchantData };

export const initialAccountSettingsState: AccountSettingsState = {
  userEmail: '',
  merchant: null,
  storeName: '',
  monthlyVolume: '',
  fraudConcern: '',
  saving: false,
  saveSuccess: false,
  saveError: '',
  newPassword: '',
  confirmPassword: '',
  showPasswords: false,
  passwordSaving: false,
  passwordSuccess: '',
  passwordError: '',
  deleteConfirm: '',
  deleteLoading: false,
};

export function accountSettingsReducer(
  state: AccountSettingsState,
  action: AccountSettingsAction,
): AccountSettingsState {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'loadAccount': {
      const merchant = action.merchant;
      return {
        ...state,
        userEmail: action.userEmail,
        merchant,
        storeName: merchant?.name ?? '',
        monthlyVolume: merchant?.monthly_order_volume ?? '',
        fraudConcern: merchant?.primary_fraud_concern ?? '',
      };
    }
    case 'profileSaved':
      return {
        ...state,
        merchant: action.merchant,
        saving: false,
        saveSuccess: true,
        saveError: '',
      };
    default:
      return state;
  }
}
