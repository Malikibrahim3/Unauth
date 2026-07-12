import { getIntegrationProvider } from '@/lib/integrations/registry';

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
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${className ?? ''}`}
      style={{
        color: 'var(--text-secondary)',
        backgroundColor: 'var(--surface-muted, rgba(0,0,0,0.04))',
        border: '1px solid var(--border-subtle, rgba(0,0,0,0.08))',
      }}
      title={`Source: ${sourceLabel(source)}`}
    >
      {sourceLabel(source)}
    </span>
  );
}
