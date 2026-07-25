import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Canonical structural surface for product UI (spec §6.4).
 *
 * Variants describe *structure*, not appearance:
 *  - `panel` — a major working region on the canvas.
 *  - `muted` — a recessed group inside a panel (secondary configuration).
 *  - `inset`  — an explanatory or read-only region inside a panel.
 *
 * Inline surfaces are always flat. Elevation belongs to floating layers only,
 * so no variant here carries a shadow. Do not nest a `panel` directly inside
 * another `panel` — use a joined section divided by a 1px rule instead.
 */
export type PanelVariant = 'panel' | 'muted' | 'inset';

const PANEL_VARIANTS: Record<PanelVariant, string> = {
  panel:
    'rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)]',
  muted:
    'rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-secondary)]',
  inset:
    'rounded-[var(--ua-radius-control)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)]',
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
