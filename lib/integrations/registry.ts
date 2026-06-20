import { adyenProvider } from '@/lib/integrations/providers/adyen';
import { aftershipProvider } from '@/lib/integrations/providers/aftership';
import { carrierClaimsProvider } from '@/lib/integrations/providers/carrierClaims';
import { documentUploadProvider } from '@/lib/integrations/providers/documentUpload';
import { extensivProvider } from '@/lib/integrations/providers/extensiv';
import { fedexProvider } from '@/lib/integrations/providers/fedex';
import { gorgiasProvider } from '@/lib/integrations/providers/gorgias';
import { loopReturnsProvider } from '@/lib/integrations/providers/loopReturns';
import { narvarProvider } from '@/lib/integrations/providers/narvar';
import { paypalProvider } from '@/lib/integrations/providers/paypal';
import { returngoProvider } from '@/lib/integrations/providers/returngo';
import { selfFulfillmentProvider } from '@/lib/integrations/providers/selfFulfillment';
import { shipbobProvider } from '@/lib/integrations/providers/shipbob';
import { shipheroProvider } from '@/lib/integrations/providers/shiphero';
import { shipmonkProvider } from '@/lib/integrations/providers/shipmonk';
import { shopifyProvider } from '@/lib/integrations/providers/shopify';
import { stripeProvider } from '@/lib/integrations/providers/stripe';
import { upsProvider } from '@/lib/integrations/providers/ups';
import type { IntegrationBuildStatus, IntegrationCategory, IntegrationProvider } from '@/lib/integrations/types';

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  shopifyProvider,
  gorgiasProvider,
  aftershipProvider,
  upsProvider,
  fedexProvider,
  documentUploadProvider,
  selfFulfillmentProvider,
  shipbobProvider,
  shipheroProvider,
  extensivProvider,
  shipmonkProvider,
  loopReturnsProvider,
  returngoProvider,
  narvarProvider,
  stripeProvider,
  paypalProvider,
  adyenProvider,
  carrierClaimsProvider,
];

const providerById = new Map(INTEGRATION_PROVIDERS.map((provider) => [provider.id, provider]));

export function getIntegrationProvider(providerId: string): IntegrationProvider | null {
  return providerById.get(providerId) ?? null;
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
