import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { MerchantSetupState } from '@/lib/connections/getMerchantSetupState';

const INTEGRATIONS_HREF = '/settings/integrations';

export function resolveCustomerActions(
  setupState: MerchantSetupState,
  connection: ConnectionState,
): { primary: { label: string; href: string }; subtitle: string } {
  if (connection.bothConnected) {
    return {
      primary: { label: 'Review queue', href: '/customers?risk=high&status=new' },
      subtitle: 'Customer intelligence across your Shopify orders and helpdesk claims - identity confidence, claim history, and linked accounts.',
    };
  }
  if (connection.shopifyOnlyConnected) {
    return {
      primary: { label: 'Connect helpdesk', href: INTEGRATIONS_HREF },
      subtitle: 'Customer intelligence from your Shopify orders. Connect your helpdesk to add claim history and dispute context.',
    };
  }
  if (connection.helpdeskOnlyConnected) {
    return {
      primary: { label: 'Connect Shopify', href: INTEGRATIONS_HREF },
      subtitle: 'Customer intelligence from your helpdesk claims. Connect Shopify to add order and purchase context.',
    };
  }
  if (setupState === 'csv_only') {
    return {
      primary: { label: 'Connect Shopify and your helpdesk', href: INTEGRATIONS_HREF },
      subtitle: 'Customer intelligence from your imported history. Connect Shopify and your helpdesk for live monitoring.',
    };
  }
  return {
    primary: { label: 'Reconnect sources', href: INTEGRATIONS_HREF },
    subtitle: 'Customer intelligence from your existing data. Reconnect Shopify and your helpdesk to keep it current.',
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
