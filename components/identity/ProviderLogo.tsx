import type { CSSProperties } from 'react';

function initials(value: string) {
  const words = value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return 'S';
  if (words.length === 1) return words[0]!.slice(0, 1).toUpperCase();
  return `${words[0]![0] ?? ''}${words.at(-1)?.[0] ?? ''}`.toUpperCase();
}

export function ProviderLogo({
  provider,
  name,
  size = 'md',
  className: _className,
}: {
  provider: string | null | undefined;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dimensions = size === 'xs' ? 18 : size === 'sm' ? 22 : size === 'lg' ? 38 : 30;
  const label = name ?? provider?.replaceAll('_', ' ') ?? 'Source';
  const style: CSSProperties = {
    width: dimensions,
    height: dimensions,
    flex: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: size === 'lg' ? 10 : 7,
    background: '#efece7',
    color: '#40454a',
    font: `${size === 'lg' ? 10.5 : size === 'xs' ? 8 : 9.5}px/1 'IBM Plex Mono',monospace`,
    textTransform: 'uppercase',
  };

  return (
    <span style={style} title={label} aria-hidden="true" data-provider-mark={provider ?? 'manual'}>
      {initials(label)}
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
    <span style={{ minWidth: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <ProviderLogo provider={source} name={display} size="sm" />
      {!compact ? (
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64686d', font: "500 11px/1.3 'Inter',sans-serif", textTransform: 'capitalize' }}>
          {display}
        </span>
      ) : null}
    </span>
  );
}
