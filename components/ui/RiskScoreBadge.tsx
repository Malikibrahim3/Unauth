import { cn } from '@/lib/utils';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface RiskScoreBadgeProps {
  score: number;
  level: RiskLevel;
  size?: 'sm' | 'md';
  className?: string;
}

const LEVEL_STYLES: Record<RiskLevel, { bg: string; fg: string; dot: string }> = {
  low:      { bg: 'bg-[var(--risk-low-bg)]',      fg: 'text-[var(--risk-low-fg)]',      dot: 'bg-[var(--risk-low-fg)]' },
  medium:   { bg: 'bg-[var(--risk-medium-bg)]',   fg: 'text-[var(--risk-medium-fg)]',   dot: 'bg-[var(--risk-medium-fg)]' },
  high:     { bg: 'bg-[var(--risk-high-bg)]',     fg: 'text-[var(--risk-high-fg)]',     dot: 'bg-[var(--risk-high-fg)]' },
  critical: { bg: 'bg-[var(--risk-critical-bg)]', fg: 'text-[var(--risk-critical-fg)]', dot: 'bg-[var(--risk-critical-fg)]' },
};

const BORDER_STYLES: Record<RiskLevel, string> = {
  low:      'border-[var(--risk-low-line)]',
  medium:   'border-[var(--risk-medium-line)]',
  high:     'border-[var(--risk-high-line)]',
  critical: 'border-[var(--risk-critical-line)]',
};

export function RiskScoreBadge({ score, level, size = 'md', className }: RiskScoreBadgeProps) {
  const styles = LEVEL_STYLES[level] ?? LEVEL_STYLES.medium;
  const border = BORDER_STYLES[level] ?? BORDER_STYLES.medium;
  const height = size === 'sm' ? 'h-5 px-[6px]' : 'h-6 px-[8px]';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium text-[12px] leading-none rounded-[var(--radius-1)] border num',
        height,
        styles.bg,
        styles.fg,
        border,
        className,
      )}
      title={`Identity confidence ${score}/100 — ${level}`}
    >
      <span aria-hidden="true" className={cn('w-1.5 h-1.5 rounded-full shrink-0', styles.dot)} />
      {score}
    </span>
  );
}

/** Maps a numeric score to a risk level */
export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 85) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}
