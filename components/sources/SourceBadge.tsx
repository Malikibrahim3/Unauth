import { getIntegrationProvider } from '@/lib/integrations/registry';
import { ProviderLogo } from '@/components/identity/ProviderLogo';

/**
 * Source-agnostic provenance badge. Renders the human name of whichever system
 * a record came from (Shopify, Gorgias, WooCommerce, a CSV import, …) so no UI
 * has to assume a specific provider. Falls back to a title-cased id.
 */
export function sourceLabel(source: string | null | undefined): string {
  if (!source) return 'Unknown source';
  const provider = getIntegrationProvider(source.toLowerCase());
  if (provider) return provider.name;
  const known: Record<string, string> = {
    csv: 'CSV import',
    csv_import: 'CSV import',
    manual: 'Manual entry',
    shopify: 'Shopify',
    gorgias: 'Gorgias',
    other: 'Other source',
    legacy_claim: 'Imported',
  };
  const key = source.toLowerCase();
  if (known[key]) return known[key];
  return key
    .split(/[_\s]+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

export function SourceBadge({ source, className }: { source: string | null | undefined; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--ua-badge-radius-meta)] py-0.5 pr-2 text-[length:var(--ua-text-micro-size)] font-medium ${className ?? ''}`}
      style={{
        color: 'var(--ua-text-secondary)',
        backgroundColor: 'var(--ua-surface-muted)',
        border: '1px solid var(--ua-border-subtle)',
      }}
      title={`Source: ${sourceLabel(source)}`}
    >
      <ProviderLogo provider={source} name={sourceLabel(source)} size="xs" />
      {sourceLabel(source)}
    </span>
  );
}
