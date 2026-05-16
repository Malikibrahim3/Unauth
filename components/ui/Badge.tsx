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

const CHIP_STYLES: Record<BadgeTone, { background: string; color: string; border: string }> = {
  neutral:  { background: '#F2EDE3', color: '#4A4640', border: '#D2C9B5' },
  info:     { background: '#EDF3FB', color: '#2D5A8E', border: '#BDD1ED' },
  accent:   { background: '#EDF3FB', color: '#2D5A8E', border: '#BDD1ED' },
  success:  { background: '#EDF5EC', color: '#2A6634', border: '#B8DDB8' },
  warning:  { background: '#FBF4EC', color: '#7A4F1C', border: '#E8D0A8' },
  danger:   { background: '#FBEFEC', color: '#7B2D26', border: '#F0C8BE' },
  critical: { background: '#1A1814', color: '#E8E4D8', border: '#1A1814' },
};

const SOLID_STYLES: Record<BadgeTone, { background: string; color: string }> = {
  neutral:  { background: '#4A4640', color: '#F2EDE3' },
  info:     { background: '#2D5A8E', color: '#FFFFFF' },
  accent:   { background: '#2D5A8E', color: '#FFFFFF' },
  success:  { background: '#2A6634', color: '#FFFFFF' },
  warning:  { background: '#7A4F1C', color: '#FFFFFF' },
  danger:   { background: '#7B2D26', color: '#FBEFEC' },
  critical: { background: '#1A1814', color: '#E8E4D8' },
};

export function Badge({
  tone = 'neutral',
  variant = 'subtle',
  size = 'md',
  dot = false,
  children,
  className,
}: BadgeProps) {
  const isSolid = variant === 'solid';
  const solidStyle = SOLID_STYLES[tone];
  const subtleStyle = CHIP_STYLES[tone];

  const inlineStyle = isSolid
    ? { background: solidStyle.background, color: solidStyle.color, border: `1px solid transparent` }
    : variant === 'outline'
    ? { background: 'transparent', color: subtleStyle.color, border: `1px solid ${subtleStyle.border}` }
    : { background: subtleStyle.background, color: subtleStyle.color, border: `1px solid ${subtleStyle.border}` };

  const height = size === 'sm' ? 16 : 18;
  const px = size === 'sm' ? '5px' : '7px';

  return (
    <span
      className={cn('inline-flex items-center gap-1 leading-none', className)}
      style={{
        height,
        paddingLeft: px,
        paddingRight: px,
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        ...inlineStyle,
      }}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: 'currentColor', opacity: 0.6 }}
        />
      )}
      {children}
    </span>
  );
}
