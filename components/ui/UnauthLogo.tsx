interface UnauthLogoProps {
  variant?:
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
}

const SIZE_MAP = {
  nav: 22,
  footer: 12,
  display: 156,
} as const;

export function UnauthLogo({ variant = 'light', size = 'nav', className }: UnauthLogoProps) {
  const px = typeof size === 'number' ? size : SIZE_MAP[size];
  const normalized = variant === 'wordmark-dark' || variant === 'dark' ? 'reversed' : variant === 'mono-dark' ? 'mono-dark' : variant === 'mono-light' ? 'mono-light' : '';

  const knownSizeClass =
    px === 12 ? 's12' :
    px === 18 ? 's18' :
    px === 22 ? 'nav' :
    px === 28 ? 's28' :
    px === 48 ? 's48' :
    px >= 96 ? 'display' :
    '';

  return (
    <span
      className={['ua-mark', normalized, knownSizeClass, className].filter(Boolean).join(' ')}
      role="img"
      aria-label="Unauth"
      style={knownSizeClass ? undefined : { fontSize: `${px}px` }}
    >
      <span className="word">Unauth</span>
      <span aria-hidden="true" className="dot" />
    </span>
  );
}
