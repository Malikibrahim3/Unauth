export const IDENTITY_PRODUCT_CONTRACT_PATH = '/Users/malikibrahim/Downloads/Unauth/IDENTITY_RESOLUTION_CORE_IMPLEMENTATION_DOC.md';

export const IDENTITY_PRODUCT_CONTRACT = {
  productType: 'identity-resolution',
  coreQuestion: 'Are these orders/customer records likely the same person, household, or account entity?',
  coreInputs: [
    'email',
    'phone',
    'shipping_address',
    'billing_address',
    'postcode',
    'ip',
    'card_last4',
    'card_bin',
    'device_id',
    'browser_fingerprint',
    'cookie_id',
    'account_id',
    'customer_name',
  ] as const,
  nonCoreContext: [
    'refund_rate',
    'refund_requested',
    'refund_reason',
    'refund_amount',
    'chargeback_filed',
    'dispute_history',
    'refund_timing',
    'ce3_context',
  ] as const,
  rules: [
    'Core identity scoring must not depend on refund/dispute/chargeback context.',
    'Weak signals may corroborate but cannot anchor a same-customer claim.',
    'Customer context is merchant decision support only.',
    'Export and UI must explain matched and changed datapoints.',
  ] as const,
};

export function isCoreIdentityField(field: string): boolean {
  return (IDENTITY_PRODUCT_CONTRACT.coreInputs as readonly string[]).includes(field);
}

export function isContextField(field: string): boolean {
  return (IDENTITY_PRODUCT_CONTRACT.nonCoreContext as readonly string[]).includes(field);
}
