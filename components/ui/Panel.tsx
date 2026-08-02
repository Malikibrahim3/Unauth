import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Canonical structural surface for product UI (§7.1).
 *
 * Variants describe *structure*, not appearance:
 *  - `panel` — the dominant working region on the canvas. Elevated
 *    (`--ua-elev-1`) rather than bordered — the ring is the shadow's first
 *    layer, never both (§6.1 amendment 1).
 *  - `muted` — a recessed group inside a panel (secondary configuration).
 *  - `inset`  — an explanatory or read-only region inside a panel.
 *
 * `muted`/`inset` stay flat: only one elevated surface per view. Do not nest
 * a `panel` directly inside another `panel` — use a joined section divided by
 * a 1px rule instead.
 */
export type PanelVariant = 'panel' | 'muted' | 'inset';

const PANEL_VARIANTS: Record<PanelVariant, string> = {
  panel: 'ua-working-surface',
  muted: 'ua-card--muted',
  inset: 'ua-inset-group',
};

type PanelProps = {
  children: ReactNode;
  as?: ElementType;
  variant?: PanelVariant;
  className?: string;
  style?: CSSProperties;
} & HTMLAttributes<HTMLElement>;

export function Panel({
  children,
  as,
  variant = 'panel',
  className,
  style,
  ...props
}: PanelProps) {
  const Component = as ?? 'div';
  return (
    <Component className={cn(PANEL_VARIANTS[variant], className)} style={style} {...props}>
      {children}
    </Component>
  );
}
