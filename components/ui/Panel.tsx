import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
export type PanelVariant = 'panel' | 'muted' | 'inset';
const CLASS: Record<PanelVariant, string> = { panel: 'ua-working-surface', muted: 'ua-card--muted', inset: 'ua-inset-group' };
export function Panel({ children, as: Component = 'div', variant = 'panel', className, ...props }: { children: ReactNode; as?: ElementType; variant?: PanelVariant; className?: string; style?: CSSProperties } & HTMLAttributes<HTMLElement>) { return <Component className={cn(CLASS[variant], className)} {...props}>{children}</Component>; }
