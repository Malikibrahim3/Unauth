import Image from 'next/image';
import { FileUp, PlugZap } from 'lucide-react';
import { cn } from '@/lib/utils';

const PROVIDER_LOGOS: Record<string, string> = {
  bigcommerce: '/integrations/bigcommerce.svg',
  document_upload: '/integrations/document-upload.svg',
  freshdesk: '/integrations/freshdesk.png',
  fedex: '/integrations/fedex.svg',
  gorgias: '/integrations/gorgias.png',
  shipbob: '/integrations/shipbob.svg',
  shopify: '/integrations/shopify.svg',
  ups: '/integrations/ups.svg',
  woocommerce: '/integrations/woocommerce.svg',
  zendesk: '/integrations/zendesk.svg',
};

const SOURCE_ALIASES: Record<string, string> = {
  helpdesk: 'gorgias',
  shop: 'shopify',
  store: 'shopify',
  warehouse: 'shipbob',
};

export function providerLogoSrc(provider: string | null | undefined) {
  if (!provider) return null;
  const key = provider.toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
  return PROVIDER_LOGOS[key] ?? PROVIDER_LOGOS[SOURCE_ALIASES[key]] ?? null;
}

export function ProviderLogo({
  provider,
  name,
  size = 'md',
  className,
}: {
  provider: string | null | undefined;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const src = providerLogoSrc(provider);
  const dimensions = size === 'xs' ? 22 : size === 'sm' ? 30 : size === 'lg' ? 48 : 38;
  const iconSize = size === 'xs' ? 11 : size === 'sm' ? 14 : size === 'lg' ? 22 : 18;
  const label = name ?? provider ?? 'Provider';
  const isDocument = provider === 'document_upload';

  return (
    <span
      className={cn('ua-identity-tile inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: dimensions, height: dimensions }}
      title={label}
      aria-hidden="true"
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={dimensions - 10}
          height={dimensions - 10}
          className="max-h-[70%] max-w-[70%] object-contain"
        />
      ) : isDocument ? (
        <FileUp size={iconSize} strokeWidth={1.8} />
      ) : (
        <PlugZap size={iconSize} strokeWidth={1.8} />
      )}
    </span>
  );
}

export function SourceMark({
  source,
  label,
  compact = false,
}: {
  source: string | null | undefined;
  label?: string;
  compact?: boolean;
}) {
  const display = label ?? source?.replaceAll('_', ' ') ?? 'Manual';
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <ProviderLogo provider={source} name={display} size="sm" />
      {!compact ? <span className="truncate capitalize text-xs font-medium text-[var(--text-secondary)]">{display}</span> : null}
    </span>
  );
}
