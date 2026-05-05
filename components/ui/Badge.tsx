import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone =
  | 'neutral'
  | 'info'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'critical';

export type BadgeVariant = 'solid' | 'subtle' | 'outline';
export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

const TONE_SUBTLE: Record<BadgeTone, string> = {
  neutral:  'bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
  info:     'bg-[var(--info-bg)] text-[var(--info-fg)] border-[var(--info-line)]',
  accent:   'bg-[var(--accent-50)] text-[var(--accent-700)] border-[var(--accent-200)]',
  success:  'bg-[var(--risk-low-bg)] text-[var(--risk-low-fg)] border-[var(--risk-low-line)]',
  warning:  'bg-[var(--risk-medium-bg)] text-[var(--risk-medium-fg)] border-[var(--risk-medium-line)]',
  danger:   'bg-[var(--risk-high-bg)] text-[var(--risk-high-fg)] border-[var(--risk-high-line)]',
  critical: 'bg-[var(--risk-critical-bg)] text-[var(--risk-critical-fg)] border-[var(--risk-critical-line)]',
};

const TONE_SOLID: Record<BadgeTone, string> = {
  neutral:  'bg-[var(--text-secondary)] text-white border-transparent',
  info:     'bg-[var(--info-fg)] text-white border-transparent',
  accent:   'bg-[var(--accent-500)] text-white border-transparent',
  success:  'bg-[var(--risk-low-fg)] text-white border-transparent',
  warning:  'bg-[var(--risk-medium-fg)] text-white border-transparent',
  danger:   'bg-[var(--risk-high-fg)] text-white border-transparent',
  critical: 'bg-[var(--risk-critical-fg)] text-white border-transparent',
};

const TONE_OUTLINE: Record<BadgeTone, string> = {
  neutral:  'bg-transparent text-[var(--text-secondary)] border-[var(--border-default)]',
  info:     'bg-transparent text-[var(--info-fg)] border-[var(--info-line)]',
  accent:   'bg-transparent text-[var(--accent-600)] border-[var(--accent-200)]',
  success:  'bg-transparent text-[var(--risk-low-fg)] border-[var(--risk-low-line)]',
  warning:  'bg-transparent text-[var(--risk-medium-fg)] border-[var(--risk-medium-line)]',
  danger:   'bg-transparent text-[var(--risk-high-fg)] border-[var(--risk-high-line)]',
  critical: 'bg-transparent text-[var(--risk-critical-fg)] border-[var(--risk-critical-line)]',
};

const DOT_COLOR: Record<BadgeTone, string> = {
  neutral:  'bg-[var(--text-tertiary)]',
  info:     'bg-[var(--info-fg)]',
  accent:   'bg-[var(--accent-500)]',
  success:  'bg-[var(--risk-low-fg)]',
  warning:  'bg-[var(--risk-medium-fg)]',
  danger:   'bg-[var(--risk-high-fg)]',
  critical: 'bg-[var(--risk-critical-fg)]',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'h-5 px-[6px] text-[11px]',
  md: 'h-6 px-[8px] text-[12px]',
};

export function Badge({
  tone = 'neutral',
  variant = 'subtle',
  size = 'md',
  dot = false,
  children,
  className,
}: BadgeProps) {
  const toneClass =
    variant === 'solid'
      ? TONE_SOLID[tone]
      : variant === 'outline'
      ? TONE_OUTLINE[tone]
      : TONE_SUBTLE[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium leading-none rounded-[var(--radius-1)] border',
        SIZE_CLASSES[size],
        toneClass,
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', DOT_COLOR[tone])}
        />
      )}
      {children}
    </span>
  );
}
