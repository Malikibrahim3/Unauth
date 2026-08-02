import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { StatusBadge, type StatusTone } from './StatusBadge';
import type { LabelFamily } from '@/lib/ui/labels';

interface StatusWithReasonProps {
  family: LabelFamily;
  value: string;
  reason: ReactNode;
  tone?: StatusTone;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * A qualified status and its plain-language cause. Use this whenever a short
 * badge such as degraded, partial, stale, or unavailable would otherwise make
 * an operator guess what is limited or what to do next.
 */
export function StatusWithReason({
  family,
  value,
  reason,
  tone,
  size = 'md',
  className,
}: StatusWithReasonProps) {
  return (
    <div className={cn('flex min-w-0 items-start gap-3', className)}>
      <StatusBadge family={family} value={value} tone={tone} size={size} className="shrink-0" />
      <div className="min-w-0 text-caption text-[var(--ua-text-secondary)]">
        {reason}
      </div>
    </div>
  );
}
