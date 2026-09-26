import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
/** `critical` merges into `danger` (F-42) — one red tone, not two. `accent` is UI-selection state only, never a record status. */
export type BadgeTone = 'neutral' | 'info' | 'accent' | 'success' | 'warning' | 'danger';
export type BadgeVariant = 'solid' | 'subtle' | 'outline';
export type BadgeSize = 'sm' | 'md';
export function Badge({ tone = 'neutral', variant = 'subtle', size = 'md', dot = false, children, className }: { tone?: BadgeTone; variant?: BadgeVariant; size?: BadgeSize; dot?: boolean; children: ReactNode; className?: string }) { return <span className={cn('inline-flex items-center rounded-md bg-[#f4f3f1] px-2 py-1 text-[10px] font-semibold text-[#40454a]', `inline-flex items-center rounded-md bg-[#f4f3f1] px-2 py-1 text-[10px] font-semibold text-[#40454a]${tone}`, `inline-flex items-center rounded-md bg-[#f4f3f1] px-2 py-1 text-[10px] font-semibold text-[#40454a]${variant}`, `inline-flex items-center rounded-md bg-[#f4f3f1] px-2 py-1 text-[10px] font-semibold text-[#40454a]${size}`, className)}>{dot ? <span className="inline-flex items-center rounded-md bg-[#f4f3f1] px-2 py-1 text-[10px] font-semibold text-[#40454a]" aria-hidden="true" /> : null}{children}</span>; }
