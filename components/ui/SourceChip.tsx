'use client';

import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';
import { formatDateMode } from '@/lib/utils/format';

interface SourceChipProps {
  /** Origin system name (e.g., "Shopify", "Gorgias", "Zendesk") */
  source: string;
  /** Received timestamp */
  timestamp?: string | Date | null;
  /** Size variant */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * SourceChip — renders evidence source + timestamp
 * Used on EvidenceCard and throughout detail pages to show provenance.
 */
export function SourceChip({ source, timestamp, size = 'md', className }: SourceChipProps) {
  const sizeStyles = size === 'sm'
    ? 'px-2 py-0.5 text-[11px] h-[18px] gap-1'
    : 'px-2.5 py-1 text-[12px] h-[22px] gap-1.5';

  const formattedTime = timestamp ? formatDateMode(timestamp, 'recent') : null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[4px] border font-medium leading-none',
        'text-[var(--text-secondary)] bg-[var(--surface)] border-[var(--border)]',
        sizeStyles,
        className
      )}
    >
      <span className="shrink-0">{source}</span>
      {formattedTime && (
        <>
          <span className="text-[var(--border-muted)]">·</span>
          <Clock className="w-3 h-3 shrink-0 opacity-60" />
          <span className="text-[var(--text-tertiary)] whitespace-nowrap">{formattedTime}</span>
        </>
      )}
    </span>
  );
}
