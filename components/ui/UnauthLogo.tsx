interface UnauthLogoProps {
  variant?: 'mark' | 'wordmark-light' | 'wordmark-dark';
  size?: number;
  className?: string;
}

export function UnauthLogo({ variant = 'wordmark-light', size = 28, className }: UnauthLogoProps) {
  if (variant === 'mark') {
    const width = Math.round(size * (120 / 110));
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 110"
        width={width}
        height={size}
        fill="none"
        className={className}
        aria-label="Unauth"
        role="img"
      >
        <path d="M18 14 H32 V74 H68 V14 H82 V88 H18 Z" fill="#111014" />
        <polygon points="92,88 102,88 108,14 98,14" fill="#2563EB" />
        <rect x="42" y="96" width="16" height="3" fill="#2563EB" />
      </svg>
    );
  }

  const uFill = variant === 'wordmark-dark' ? '#F5F2EE' : '#111014';
  const width = Math.round(size * (120 / 100));

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 100"
      width={width}
      height={size}
      fill="none"
      className={className}
      aria-label="Unauth"
      role="img"
    >
      <path d="M18 14 H32 V74 H68 V14 H82 V88 H18 Z" fill={uFill} />
      <polygon points="92,88 102,88 108,14 98,14" fill="#2563EB" />
    </svg>
  );
}
