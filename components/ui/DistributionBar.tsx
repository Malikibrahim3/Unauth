'use client';

import { cn } from '@/lib/utils';

export interface DistributionSegment {
  label: string;
  value: number;
  /** Token name for the segment color (e.g., '--success', '--warning') */
  colorToken: string;
}

interface DistributionBarProps {
  segments: DistributionSegment[];
  /** Height in px */
  height?: number;
  /** Show segment labels */
  showLabels?: boolean;
  className?: string;
}

/**
 * DistributionBar — pure CSS stacked bar for status/confidence distributions
 * Used in Overview and other dashboard surfaces.
 */
export function DistributionBar({
  segments,
  height = 24,
  showLabels = false,
  className,
}: DistributionBarProps) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  if (total === 0) {
    return (
      <div
        className={cn('rounded-[6px] border border-[var(--border)] bg-[var(--surface-sunken)]', className)}
        style={{ height: `${height}px` }}
      />
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className="flex overflow-hidden rounded-[6px] border border-[var(--border)]"
        style={{ height: `${height}px` }}
      >
        {segments.map((seg, idx) => {
          const percent = (seg.value / total) * 100;
          if (percent === 0) return null;
          return (
            <div
              key={idx}
              className="transition-all duration-300"
              style={{
                width: `${percent}%`,
                backgroundColor: `var(${seg.colorToken})`,
              }}
              title={`${seg.label}: ${seg.value}`}
            />
          );
        })}
      </div>
      {showLabels && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
          {segments.map((seg, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: `var(${seg.colorToken})` }}
              />
              <span className="text-[var(--text-secondary)]">
                {seg.label}: <span className="text-[var(--text-primary)] font-medium tabular-nums">{seg.value}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
