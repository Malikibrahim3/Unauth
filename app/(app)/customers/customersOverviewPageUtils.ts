import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { MerchantSetupState } from '@/lib/connections/getMerchantSetupState';

const INTEGRATIONS_HREF = '/integrations';

export function resolveCustomerActions(
  setupState: MerchantSetupState,
  connection: ConnectionState,
): { primary: { label: string; href: string }; subtitle: string } {
  if (connection.bothConnected) {
    return {
      primary: { label: 'Open cases', href: '/claims' },
      subtitle: 'Merchant-owned customer context for loss decisions — order history, case history, prior outcomes, and evidence patterns.',
    };
  }
  if (connection.orderSourceOnlyConnected) {
    return {
      primary: { label: 'Connect helpdesk', href: INTEGRATIONS_HREF },
      subtitle: 'Customer history from your order source. Connect a helpdesk to add case reasons, prior outcomes, and decision context.',
    };
  }
  if (connection.helpdeskOnlyConnected) {
    return {
      primary: { label: 'Connect order source', href: INTEGRATIONS_HREF },
      subtitle: 'Customer case history from your helpdesk. Connect an order source to add order value, purchase history, and account context.',
    };
  }
  if (setupState === 'csv_only') {
    return {
      primary: { label: 'Connect order source and helpdesk', href: INTEGRATIONS_HREF },
      subtitle: 'Customer and case history from imported data. Connect live sources to keep the evidence record current.',
    };
  }
  return {
    primary: { label: 'Reconnect sources', href: INTEGRATIONS_HREF },
    subtitle: 'Customer history from existing merchant data. Reconnect an order source and helpdesk to keep case context current.',
  };
}

export function buildRemoveHref(sp: Record<string, string | undefined>, key: string) {
  const copy = { ...sp };
  delete copy[key];
  delete copy['page'];
  const qs = new URLSearchParams(copy as Record<string, string>).toString();
  return `/customers${qs ? `?${qs}` : ''}`;
}

export function customersListHref(
  sp: Record<string, string | undefined>,
  overrides: Record<string, string | undefined> = {},
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...sp, ...overrides })) {
    if (value != null && value !== '') params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/customers?${qs}` : '/customers';
}
