import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Quiet, non-semantic metadata. Actions and statuses must use another primitive. */
export function MetadataChip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex h-[var(--ua-control-height-sm)] items-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-secondary)] px-2 text-xs text-[var(--ua-text-secondary)]', className)}>{children}</span>;
}
