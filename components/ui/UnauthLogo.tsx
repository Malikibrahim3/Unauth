interface UnauthLogoProps {
  variant?:
    | 'auto'
    | 'light'
    | 'dark'
    | 'mono'
    | 'mono-dark'
    | 'mono-light'
    | 'wordmark-light'
    | 'wordmark-dark'
    | 'mark';
  size?: number | 'nav' | 'footer' | 'display';
  className?: string;
  compact?: boolean;
}

const SIZE_MAP = {
  nav: 22,
  footer: 12,
  display: 156,
} as const;

export function UnauthLogo({ variant = 'light', size = 'nav', className, compact = false }: UnauthLogoProps) {
  const px = typeof size === 'number' ? size : SIZE_MAP[size];
  const normalized =
    variant === 'auto' ? '' :
    variant === 'wordmark-dark' || variant === 'dark' ? 'reversed' :
    variant === 'mono-dark' ? 'mono-dark' :
    variant === 'mono-light' || variant === 'mono' ? 'mono-light' :
    'primary';

  const knownSizeClass =
    px === 9 ? 's9' :
    px === 10 ? 's10' :
    px === 12 ? 's12' :
    px === 18 ? 's18' :
    px === 22 ? 'nav' :
    px === 28 ? 's28' :
    px === 48 ? 's48' :
    px >= 96 ? 'display' :
    '';

  return (
    <span
      className={['ua-mark', compact && 'compact', normalized, knownSizeClass, className].filter(Boolean).join(' ')}
      aria-label="Unauth."
      style={knownSizeClass && knownSizeClass !== 'display' ? undefined : { fontSize: `${px}px` }}
    >
      {!compact && <span className="word">Unauth</span>}
      <span aria-hidden="true" className="dot" />
    </span>
  );
}
