import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SurfaceStructure =
  | 'working'
  | 'joined'
  | 'inset'
  | 'floating'
  | 'unframed'
  | 'raised'
  | 'overlay'
  | 'selected'
  | 'muted';
export type SurfacePad = 'none' | 'dense' | 'standard' | 'relaxed';
export type SurfaceRadius = 'control' | 'surface' | 'overlay';

const STRUCTURE: Record<SurfaceStructure, string> = {
  working: 'ua-working-surface',
  joined: 'ua-joined-section',
  inset: 'ua-inset-group',
  floating: 'ua-floating-surface',
  unframed: 'ua-unframed-surface',
  raised: 'ua-raised-surface',
  // 'overlay' reuses the floating-surface treatment — same elevation contract.
  overlay: 'ua-floating-surface',
  selected: 'ua-selected-surface',
  muted: 'ua-muted-surface',
};

const RADIUS_VAR: Record<SurfaceRadius, string> = {
  control: 'var(--uo-route-radius-control)',
  surface: 'var(--uo-route-radius-surface)',
  overlay: 'var(--uo-route-radius-overlay)',
};

export function Surface({
  structure = 'working',
  pad = 'none',
  bordered,
  radius,
  as: Component = 'div',
  className,
  style,
  children,
  ...props
}: {
  structure?: SurfaceStructure;
  pad?: SurfacePad;
  /** Overrides the structure's default border presence. */
  bordered?: boolean;
  /** Overrides the structure's default radius token. */
  radius?: SurfaceRadius;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, 'children'> & { [dataAttribute: `data-${string}`]: string | undefined }) {
  const resolvedStyle = radius ? { ...style, borderRadius: RADIUS_VAR[radius] } : style;
  return (
    <Component
      className={cn(
        STRUCTURE[structure],
        pad !== 'none' && `ua-surface--pad-${pad}`,
        bordered === false && 'ua-surface--borderless',
        bordered === true && 'ua-surface--bordered',
        className,
      )}
      style={resolvedStyle}
      data-material={structure === 'working' ? 'ledger-sheet' : undefined}
      {...props}
    >
      {children}
    </Component>
  );
}
