import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Quiet, non-semantic metadata. Actions and statuses must use another primitive. */
export function MetadataChip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex h-7 items-center rounded-[8px] border border-[#eae8e5] bg-[#f4f3f1] px-2 text-xs text-[#64686d]', className)}>{children}</span>;
}
