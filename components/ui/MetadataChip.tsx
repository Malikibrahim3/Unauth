import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Quiet, non-semantic metadata. Actions and statuses must use another primitive. */
export function MetadataChip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex h-[var(--uo-route-control-height-sm)] items-center rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-border-subtle)] bg-[var(--uo-route-surface-secondary)] px-2 text-xs text-[var(--uo-route-text-secondary)]', className)}>{children}</span>;
}
