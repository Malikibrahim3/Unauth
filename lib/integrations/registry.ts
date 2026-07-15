import { carrierClaimsProvider } from '@/lib/integrations/providers/carrierClaims';
import { csvImportProvider } from '@/lib/integrations/providers/csvImport';
import { bigcommerceProvider } from '@/lib/integrations/providers/bigcommerce';
import { documentUploadProvider } from '@/lib/integrations/providers/documentUpload';
import { fedexProvider } from '@/lib/integrations/providers/fedex';
import { freshdeskProvider } from '@/lib/integrations/providers/freshdesk';
import { gorgiasProvider } from '@/lib/integrations/providers/gorgias';
import { selfFulfillmentProvider } from '@/lib/integrations/providers/selfFulfillment';
import { shipbobProvider } from '@/lib/integrations/providers/shipbob';
import { shopifyProvider } from '@/lib/integrations/providers/shopify';
import { stripeProvider } from '@/lib/integrations/providers/stripe';
import { upsProvider } from '@/lib/integrations/providers/ups';
import { woocommerceProvider } from '@/lib/integrations/providers/woocommerce';
import { zendeskProvider } from '@/lib/integrations/providers/zendesk';
import type { IntegrationBuildStatus, IntegrationCategory, IntegrationProvider } from '@/lib/integrations/types';

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  shopifyProvider,
  woocommerceProvider,
  bigcommerceProvider,
  gorgiasProvider,
  zendeskProvider,
  freshdeskProvider,
  upsProvider,
  fedexProvider,
  csvImportProvider,
  documentUploadProvider,
  selfFulfillmentProvider,
  shipbobProvider,
  stripeProvider,
  carrierClaimsProvider,
];

const providerById = new Map(INTEGRATION_PROVIDERS.map((provider) => [provider.id, provider]));

export function getIntegrationProvider(providerId: string): IntegrationProvider | null {
  return providerById.get(providerId) ?? null;
}

const PROVIDER_ALIASES: Record<string, string> = {
  csv: 'csv_import',
  helpdesk: 'gorgias',
  shop: 'shopify',
  store: 'shopify',
  warehouse: 'shipbob',
  manual: 'csv_import',
};

export function normalizeProviderId(providerId: string): string {
  const normalized = providerId.toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
  return PROVIDER_ALIASES[normalized] ?? normalized;
}

export function getProviderLogoSrc(providerId: string | null | undefined): string | null {
  if (!providerId) return null;
  return getIntegrationProvider(normalizeProviderId(providerId))?.logoSrc ?? null;
}

export function requireIntegrationProvider(providerId: string): IntegrationProvider {
  const provider = getIntegrationProvider(providerId);
  if (!provider) throw new Error(`unknown_integration_provider:${providerId}`);
  return provider;
}

export function integrationProvidersByCategory(): Record<IntegrationCategory, IntegrationProvider[]> {
  return INTEGRATION_PROVIDERS.reduce((groups, provider) => {
    groups[provider.category].push(provider);
    return groups;
  }, {
    commerce: [],
    helpdesk: [],
    tracking: [],
    carrier: [],
    warehouse_3pl: [],
    returns: [],
    payments_disputes: [],
    documents: [],
  } as Record<IntegrationCategory, IntegrationProvider[]>);
}

export function listProvidersByBuildStatus(status: IntegrationBuildStatus): IntegrationProvider[] {
  return INTEGRATION_PROVIDERS.filter((provider) => provider.buildStatus === status);
}
