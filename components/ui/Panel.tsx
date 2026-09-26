import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
export type PanelVariant = 'panel' | 'muted' | 'inset';
const CLASS: Record<PanelVariant, string> = { panel: 'rounded-xl border border-[#e4e3e0] bg-white', muted: 'rounded-xl border border-[#e4e3e0] bg-white', inset: 'rounded-xl border border-[#e4e3e0] bg-white' };
export function Panel({ children, as: Component = 'div', variant = 'panel', className, ...props }: { children: ReactNode; as?: ElementType; variant?: PanelVariant; className?: string; style?: CSSProperties } & HTMLAttributes<HTMLElement>) { return <Component className={cn(CLASS[variant], className)} {...props}>{children}</Component>; }
