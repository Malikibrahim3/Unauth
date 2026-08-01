import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Canonical Instrument Grade surface anatomy.
 *
 * One primitive expresses every structural surface in the product so the
 * scattered `Card` / `Panel` / `SectionCard` / `AuthenticatedPanel` families
 * resolve to a single grammar:
 *
 *  - `working`  — a primary working region on the canvas: 1px default border,
 *                 no shadow, 10px radius. May contain joined sections and inset
 *                 groups. This is the dominant surface.
 *  - `joined`   — a section that lives *inside* a working surface, divided by a
 *                 1px top rule rather than becoming its own free-standing card.
 *  - `inset`    — a recessed group for controls or compact facts: subtle border,
 *                 secondary fill, 6px radius. Never contains another working
 *                 surface.
 *  - `floating` — overlay content only (menu, popover, drawer body): default
 *                 border plus the approved overlay shadow, 14px radius.
 *  - `unframed` — page-level grouping through spacing alone; no border, radius,
 *                 or shadow.
 *
 * Structural rule (§8.2): never place a standard bordered card directly inside
 * another standard bordered card. Compose `working` → `joined`/`inset` instead
 * of nesting two `working` surfaces.
 *
 * Inline surfaces are flat; elevation belongs to `floating` layers only. `pad`
 * is optional because `joined` and `inset` carry their own inset — supply it
 * only when a `working`/`floating` surface owns its padding directly rather
 * than delegating it to inner sections.
 */
export type SurfaceStructure = 'working' | 'joined' | 'inset' | 'floating' | 'unframed';
export type SurfacePad = 'none' | 'dense' | 'standard' | 'relaxed';

const STRUCTURE_CLASS: Record<SurfaceStructure, string> = {
  working: 'ua-working-surface',
  joined: 'ua-joined-section',
  inset: 'ua-inset-group',
  floating: 'ua-floating-surface',
  unframed: 'ua-unframed-surface',
};

const PAD_CLASS: Record<SurfacePad, string | null> = {
  none: null,
  dense: 'ua-surface--pad-dense',
  standard: 'ua-surface--pad-standard',
  relaxed: 'ua-surface--pad-relaxed',
};

type SurfaceProps = {
  structure?: SurfaceStructure;
  pad?: SurfacePad;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, 'style' | 'className' | 'children'> & {
    [dataAttribute: `data-${string}`]: string | undefined;
  };

export function Surface({
  structure = 'working',
  pad = 'none',
  as,
  className,
  style,
  children,
  ...props
}: SurfaceProps) {
  const Component = as ?? 'div';
  return (
    <Component
      className={cn(STRUCTURE_CLASS[structure], PAD_CLASS[pad], className)}
      style={style}
      {...props}
    >
      {children}
    </Component>
  );
}
