import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { BADGE_LAYOUT_STYLE, badgeToneStyle } from '@/components/ui/badgeStyles';

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

const DOT_STYLE = { background: 'currentColor', opacity: 0.6 } as const;

export function Badge({
  tone = 'neutral',
  variant = 'subtle',
  size = 'md',
  dot = false,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 leading-none', className)}
      style={{ ...BADGE_LAYOUT_STYLE[size], ...badgeToneStyle(tone, variant) }}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={DOT_STYLE}
        />
      )}
      {children}
    </span>
  );
}
