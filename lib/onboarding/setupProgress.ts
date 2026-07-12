import type { IntegrationCategory, ProviderConnectionView } from '@/lib/integrations/types';

export type SetupRequirement = { key: string; label: string; minutes: number; complete: boolean; broken: boolean };
export type SetupProgress = { requirements: SetupRequirement[]; completed: number; total: number; percent: number; remainingMinutes: number; complete: boolean };

const isConnected = (provider: ProviderConnectionView) => ['connected', 'syncing'].includes(provider.status);
const isHealthy = (provider: ProviderConnectionView) => isConnected(provider) && !['sync_failed', 'attention_required', 'stale', 'disconnected'].includes(provider.syncState ?? 'import_complete');

export function deduplicateProviders(providers: ProviderConnectionView[]) {
  const byId = new Map<string, ProviderConnectionView>();
  for (const provider of providers) {
    const current = byId.get(provider.id);
    if (!current || (isHealthy(provider) && !isHealthy(current)) || (isConnected(provider) && !isConnected(current))) byId.set(provider.id, provider);
  }
  return [...byId.values()];
}

export function deriveSetupProgress(input: { providers: ProviderConnectionView[]; activeRules: number; paymentConfirmed: boolean; warehouseRequired: boolean }): SetupProgress {
  const providers = deduplicateProviders(input.providers);
  const source = (categories: IntegrationCategory[]) => providers.find((provider) => categories.includes(provider.category) && isConnected(provider)) ?? providers.find((provider) => categories.includes(provider.category));
  const requirement = (key: string, label: string, minutes: number, categories: IntegrationCategory[]): SetupRequirement => {
    const provider = source(categories);
    return { key, label, minutes, complete: Boolean(provider && isHealthy(provider)), broken: Boolean(provider && (isConnected(provider) || ['revoked', 'error', 'connection_error', 'degraded'].includes(provider.status)) && !isHealthy(provider)) };
  };
  const requirements = [
    requirement('commerce', 'Connect commerce', 2, ['commerce']),
    requirement('helpdesk', 'Connect helpdesk', 2, ['helpdesk']),
    requirement('tracking', 'Connect tracking', 2, ['tracking', 'carrier']),
    { key: 'payments', label: 'Confirm payments', minutes: 1, complete: input.paymentConfirmed, broken: false },
    { key: 'rules', label: 'Configure a rule', minutes: 2, complete: input.activeRules > 0, broken: false },
    ...(input.warehouseRequired ? [requirement('warehouse', 'Connect warehouse', 2, ['warehouse_3pl'])] : []),
  ];
  const completed = requirements.filter((item) => item.complete).length;
  const remainingMinutes = requirements.filter((item) => !item.complete).reduce((sum, item) => sum + item.minutes, 0);
  return { requirements, completed, total: requirements.length, percent: Math.round(completed / requirements.length * 100), remainingMinutes, complete: completed === requirements.length && !requirements.some((item) => item.broken) };
}
