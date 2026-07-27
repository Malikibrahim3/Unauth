export type UnauthLogoKind = 'lockup' | 'wordmark' | 'symbol';
export type UnauthLogoTone = 'auto' | 'black' | 'graphite' | 'white';
export type UnauthLogoBackground = 'transparent' | 'graphite' | 'white';

export type UnauthLogoAsset = {
  src: string;
  width: number;
  height: number;
};

const R1_ROOT = '/brand/unauth-r1';

export const UNAUTH_LOGO_ASSETS = {
  lockup: {
    black: { src: `${R1_ROOT}/unauth-r1-lockup-black.svg`, width: 300, height: 56 },
    graphite: { src: `${R1_ROOT}/unauth-r1-lockup-graphite.svg`, width: 300, height: 56 },
    white: { src: `${R1_ROOT}/unauth-r1-lockup-white.svg`, width: 300, height: 56 },
    whiteOnGraphite: {
      src: `${R1_ROOT}/unauth-r1-lockup-horizontal-white-on-graphite.svg`,
      width: 300,
      height: 56,
    },
  },
  wordmark: {
    black: { src: `${R1_ROOT}/unauth-r1-wordmark-black.svg`, width: 220, height: 56 },
    graphite: { src: `${R1_ROOT}/unauth-r1-wordmark-graphite.svg`, width: 220, height: 56 },
    white: { src: `${R1_ROOT}/unauth-r1-wordmark-white.svg`, width: 220, height: 56 },
    whiteOnGraphite: {
      src: `${R1_ROOT}/unauth-r1-wordmark-white-on-graphite.svg`,
      width: 220,
      height: 56,
    },
  },
  symbol: {
    black: { src: `${R1_ROOT}/unauth-r1-symbol-black-64px.svg`, width: 64, height: 64 },
    graphite: { src: `${R1_ROOT}/unauth-r1-symbol-graphite-64px.svg`, width: 64, height: 64 },
    white: { src: `${R1_ROOT}/unauth-r1-symbol-white-64px.svg`, width: 64, height: 64 },
    graphiteOnWhite: {
      src: `${R1_ROOT}/unauth-r1-favicon-graphite-on-white.svg`,
      width: 64,
      height: 64,
    },
    whiteOnGraphite: {
      src: `${R1_ROOT}/unauth-r1-symbol-white-on-graphite.svg`,
      width: 64,
      height: 64,
    },
  },
} satisfies Record<UnauthLogoKind, Record<string, UnauthLogoAsset>>;

export function assetForLogo(
  kind: UnauthLogoKind,
  tone: Exclude<UnauthLogoTone, 'auto'>,
  background: UnauthLogoBackground = 'transparent',
): UnauthLogoAsset {
  if (background === 'graphite') {
    return kind === 'symbol'
      ? UNAUTH_LOGO_ASSETS.symbol.whiteOnGraphite
      : kind === 'wordmark'
        ? UNAUTH_LOGO_ASSETS.wordmark.whiteOnGraphite
        : UNAUTH_LOGO_ASSETS.lockup.whiteOnGraphite;
  }

  if (background === 'white') {
    return kind === 'symbol'
      ? UNAUTH_LOGO_ASSETS.symbol.graphiteOnWhite
      : UNAUTH_LOGO_ASSETS[kind][tone];
  }

  return UNAUTH_LOGO_ASSETS[kind][tone];
}
