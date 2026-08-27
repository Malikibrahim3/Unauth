import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
/** `critical` merges into `danger` (F-42) — one red tone, not two. `accent` is UI-selection state only, never a record status. */
export type BadgeTone = 'neutral' | 'info' | 'accent' | 'success' | 'warning' | 'danger';
export type BadgeVariant = 'solid' | 'subtle' | 'outline';
export type BadgeSize = 'sm' | 'md';
export function Badge({ tone = 'neutral', variant = 'subtle', size = 'md', dot = false, children, className }: { tone?: BadgeTone; variant?: BadgeVariant; size?: BadgeSize; dot?: boolean; children: ReactNode; className?: string }) { return <span className={cn('ua-badge', `ua-badge--${tone}`, `ua-badge--${variant}`, `ua-badge--${size}`, className)}>{dot ? <span className="ua-badge__dot" aria-hidden="true" /> : null}{children}</span>; }
