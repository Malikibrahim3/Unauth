'use client';

import { STATUS_CONFIG, resolveStatusVariant, type StatusVariant } from '@/lib/status';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  /** Semantic status — resolves to the appropriate variant and label */
  status: string | StatusVariant;
  /** Show a status dot */
  dot?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * StatusBadge — renders status using the centralized status config
 * All status colors and labels flow through lib/status.ts
 */
export function StatusBadge({ status, dot = false, size = 'md', className }: StatusBadgeProps) {
  const variant = resolveStatusVariant(status);
  const config = STATUS_CONFIG[variant];

  const sizeStyles = size === 'sm'
    ? 'px-2 py-0.5 text-[11px] h-[18px]'
    : 'px-2.5 py-1 text-[12px] h-[22px]';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[4px] border font-medium leading-none',
        sizeStyles,
        className
      )}
      style={{
        color: `var(${config.fgToken})`,
        backgroundColor: `var(${config.bgToken})`,
        borderColor: `var(${config.bdToken})`,
      }}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: 'currentColor', opacity: 0.7 }}
        />
      )}
      {config.label}
    </span>
  );
}
