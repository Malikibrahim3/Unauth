export type CustomerIntelligenceDrawerUiState = {
  ordersExpanded: boolean;
  evidenceOpen: boolean;
  evidenceOrderId: string | undefined;
};

export type CustomerIntelligenceDrawerUiAction =
  | { type: 'toggle_orders' }
  | { type: 'open_evidence'; orderId?: string }
  | { type: 'close_evidence' };

export const initialCustomerIntelligenceDrawerUi: CustomerIntelligenceDrawerUiState = {
  ordersExpanded: false,
  evidenceOpen: false,
  evidenceOrderId: undefined,
};

export function customerIntelligenceDrawerUiReducer(
  state: CustomerIntelligenceDrawerUiState,
  action: CustomerIntelligenceDrawerUiAction,
): CustomerIntelligenceDrawerUiState {
  switch (action.type) {
    case 'toggle_orders':
      return { ...state, ordersExpanded: !state.ordersExpanded };
    case 'open_evidence':
      return {
        ...state,
        evidenceOpen: true,
        evidenceOrderId: action.orderId,
      };
    case 'close_evidence':
      return { ...state, evidenceOpen: false };
    default:
      return state;
  }
}
