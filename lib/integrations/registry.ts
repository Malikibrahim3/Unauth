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
import { plannedCatalogueProviders } from '@/lib/integrations/providers/plannedCatalogue';
import type {
  CapabilityEvidenceLevel,
  IntegrationCodeMaturity,
  IntegrationCategory,
  IntegrationProvider,
  LifecycleCapability,
  LifecycleCapabilityId,
  ProviderDisplayStage,
} from '@/lib/integrations/types';

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
  ...plannedCatalogueProviders,
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

export function listProvidersByCodeMaturity(status: IntegrationCodeMaturity): IntegrationProvider[] {
  return INTEGRATION_PROVIDERS.filter((provider) => provider.codeMaturity === status);
}

const EVIDENCE_RANK: Record<CapabilityEvidenceLevel, number> = {
  unavailable: 0,
  implemented: 1,
  automated_tested: 2,
  controlled_runtime_verified: 3,
};

/** Controlled proof must be refreshed at least quarterly. */
export const CONTROLLED_RUNTIME_EVIDENCE_MAX_AGE_DAYS = 90;

/**
 * A `controlled_runtime_verified` claim only counts if it carries a COMPLETE
 * passing evidence record (environment, account, date, build, scenario,
 * result, limitations, artifact). A bare claim, failed result, incomplete
 * record, future date, or proof older than the freshness window is treated as
 * unproven, so missing/stale proof downgrades truthfully.
 */
export function hasValidControlledRuntimeEvidence(
  cap: LifecycleCapability,
  now: Date = new Date(),
): boolean {
  if (cap.evidence !== 'controlled_runtime_verified') return false;
  const e = cap.runtimeEvidence;
  if (
    !e ||
    !e.environment?.trim() ||
    !e.account?.trim() ||
    !e.verifiedAt?.trim() ||
    !e.build?.trim() ||
    !e.scenario?.trim() ||
    e.result !== 'passed' ||
    !Array.isArray(e.limitations) ||
    !e.artifactRef?.trim()
  ) {
    return false;
  }

  const verifiedAt = Date.parse(e.verifiedAt);
  const nowMs = now.getTime();
  if (!Number.isFinite(verifiedAt) || !Number.isFinite(nowMs) || verifiedAt > nowMs) return false;
  const ageMs = nowMs - verifiedAt;
  return ageMs <= CONTROLLED_RUNTIME_EVIDENCE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * The single place a provider's merchant-facing build-maturity label is
 * decided, driven ONLY by the provider manifest's lifecycle matrix — never by
 * per-merchant connection health, provider kind, or a hand-set flag. Every
 * catalogue/list/detail surface must call this.
 *
 * - `slot_only` providers are never connectable: `planned`.
 * - `live` requires EVERY applicable capability to carry valid
 *   controlled-runtime evidence. Code presence, automated tests, and
 *   `manual_upload` provider kind confer NO shortcut.
 * - `beta`: a genuinely-exercised ongoing sync relationship (webhook or
 *   incremental pull) at >= automated_tested, but not fully runtime-verified.
 * - `partial`: connects and does something real (>= implemented on any
 *   applicable capability), but no ongoing sync and not fully runtime-verified.
 * - `planned`: nothing applicable has even been implemented.
 */
export function deriveProviderDisplayStage(provider: IntegrationProvider): ProviderDisplayStage {
  if (provider.codeMaturity === 'slot_only') return 'planned';

  const dims = provider.lifecycle ?? [];
  const applicable = dims.filter((dim) => dim.applicability === 'applicable');
  if (applicable.length === 0) return 'planned';

  // LIVE requires controlled-runtime evidence on every applicable capability.
  if (applicable.every((dim) => hasValidControlledRuntimeEvidence(dim))) return 'live';

  // BETA requires a genuinely-exercised ongoing sync relationship.
  const hasOngoingSync = dims.some(
    (dim) =>
      (dim.id === 'webhook' || dim.id === 'incremental_pull') &&
      dim.applicability === 'applicable' &&
      EVIDENCE_RANK[dim.evidence] >= EVIDENCE_RANK.automated_tested,
  );
  if (hasOngoingSync) return 'beta';

  // PARTIAL: connects and does something real.
  const hasSomethingReal = applicable.some(
    (dim) => EVIDENCE_RANK[dim.evidence] >= EVIDENCE_RANK.implemented,
  );
  return hasSomethingReal ? 'partial' : 'planned';
}

/**
 * The applicable capabilities that have NOT reached valid controlled-runtime
 * evidence — i.e. what a merchant-facing "Runtime verification pending" note
 * must enumerate.
 */
export function pendingRuntimeCapabilities(
  provider: IntegrationProvider,
): LifecycleCapabilityId[] {
  return (provider.lifecycle ?? [])
    .filter((dim) => dim.applicability === 'applicable' && !hasValidControlledRuntimeEvidence(dim))
    .map((dim) => dim.id);
}

/**
 * True when a connectable (non-planned) provider is not fully runtime-verified,
 * so the UI must surface "Runtime verification pending" and list the gaps.
 */
export function isRuntimeVerificationPending(provider: IntegrationProvider): boolean {
  const stage = deriveProviderDisplayStage(provider);
  if (stage === 'live' || stage === 'planned') return false;
  return pendingRuntimeCapabilities(provider).length > 0;
}
