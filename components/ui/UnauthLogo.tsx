import Image from 'next/image';
import {
  assetForLogo,
  type UnauthLogoBackground,
  type UnauthLogoKind,
  type UnauthLogoTone,
} from '@/lib/brand/unauthLogoAssets';

type LegacyLogoVariant =
  | 'auto'
  | 'light'
  | 'dark'
  | 'mono'
  | 'mono-dark'
  | 'mono-light'
  | 'wordmark-light'
  | 'wordmark-dark'
  | 'mark';

interface UnauthLogoProps {
  /** Preferred API for new placements. */
  kind?: UnauthLogoKind;
  tone?: UnauthLogoTone;
  background?: UnauthLogoBackground;
  height?: number;
  alt?: string;
  decorative?: boolean;
  /** Kept for existing product-shell callers during the R1 migration. */
  variant?: LegacyLogoVariant;
  size?: number | 'nav' | 'footer' | 'display';
  className?: string;
  compact?: boolean;
}

const SIZE_MAP = {
  nav: 22,
  footer: 12,
  display: 156,
} as const;

function legacyKind(variant: LegacyLogoVariant | undefined, compact: boolean, kind: UnauthLogoKind | undefined) {
  if (kind) return kind;
  if (compact || variant === 'mark') return 'symbol' satisfies UnauthLogoKind;
  if (variant === 'wordmark-light' || variant === 'wordmark-dark') return 'wordmark' satisfies UnauthLogoKind;
  return 'lockup' satisfies UnauthLogoKind;
}

function legacyTone(variant: LegacyLogoVariant | undefined, tone: UnauthLogoTone | undefined): UnauthLogoTone {
  if (tone) return tone;
  switch (variant) {
    case 'auto':
      return 'auto';
    case 'dark':
    case 'mono':
    case 'mono-light':
    case 'wordmark-dark':
      return 'white';
    case 'light':
    case 'mono-dark':
    case 'wordmark-light':
      return 'graphite';
    default:
      return 'auto';
  }
}

export function UnauthLogo({
  kind: requestedKind,
  tone: requestedTone,
  background = 'transparent',
  height,
  alt = 'Unauth',
  decorative = false,
  variant,
  size = 'nav',
  className,
  compact = false,
}: UnauthLogoProps) {
  const kind = legacyKind(variant, compact, requestedKind);
  const tone = legacyTone(variant, requestedTone);
  const px = height ?? (typeof size === 'number' ? size : SIZE_MAP[size]);
  const imageAlt = decorative ? '' : alt;
  const ariaHidden = decorative ? true : undefined;

  const renderAsset = (assetTone: Exclude<UnauthLogoTone, 'auto'>, mode: 'light' | 'dark' | 'fixed') => {
    const asset = assetForLogo(kind, assetTone, background);
    const imageWidth = Math.round((px * asset.width) / asset.height);

    return (
      <Image
        key={`${mode}-${asset.src}`}
        src={asset.src}
        alt={imageAlt}
        width={asset.width}
        height={asset.height}
        unoptimized
        aria-hidden={ariaHidden}
        className={`ua-brand-logo__image${mode === 'fixed' ? '' : ` ua-brand-logo__${mode}`}`}
        style={{ width: imageWidth, height: px }}
      />
    );
  };

  return (
    <span className={['ua-brand-logo', className].filter(Boolean).join(' ')} aria-hidden={ariaHidden}>
      {tone === 'auto' && background === 'transparent' ? (
        <>
          {renderAsset('graphite', 'light')}
          {renderAsset('white', 'dark')}
        </>
      ) : (
        renderAsset(tone === 'auto' ? (background === 'graphite' ? 'white' : 'graphite') : tone, 'fixed')
      )}
    </span>
  );
}
