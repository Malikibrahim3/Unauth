import { cn } from '@/lib/utils';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface RiskScoreBadgeProps {
  score: number;
  level: RiskLevel;
  size?: 'sm' | 'md';
  className?: string;
}

/** Maps a numeric score to a risk level */
export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 85) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

const LEVEL_STYLES: Record<RiskLevel, React.CSSProperties> = {
  low:      { background: 'var(--risk-low-bg)',      color: 'var(--risk-low-fg)',      border: '1px solid var(--risk-low-line)' },
  medium:   { background: 'var(--risk-medium-bg)',   color: 'var(--risk-medium-fg)',   border: '1px solid var(--risk-medium-line)' },
  high:     { background: '#FBEFEC',                 color: '#7B2D26',                 border: '1px solid #F0C8BE' },
  critical: { background: '#1A1814',                 color: '#E8E4D8',                 border: '1px solid #1A1814' },
};

/** Formats score 0–100 as "0.92" */
function formatScore(score: number) {
  return (score / 100).toFixed(2);
}

export function RiskScoreBadge({ score, level, size = 'md', className }: RiskScoreBadgeProps) {
  const chipStyle = LEVEL_STYLES[level] ?? LEVEL_STYLES.medium;
  const height = size === 'sm' ? 16 : 18;

  return (
    <span
      className={cn('inline-flex items-center gap-1 leading-none', className)}
      style={{
        height,
        paddingLeft: '7px',
        paddingRight: '7px',
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        ...chipStyle,
      }}
      title={`Identity confidence ${score}/100 — ${level}`}
    >
      RISK {formatScore(score)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// StatusChip — DEFINITE / PROBABLE / CANDIDATE / INCONCLUSIVE
// ---------------------------------------------------------------------------

export type StatusTier = 'definite' | 'probable' | 'candidate' | 'inconclusive';

const STATUS_STYLES: Record<StatusTier, React.CSSProperties> = {
  definite:     { background: '#1A1814', color: '#E8E4D8', border: '1px solid #1A1814' },
  probable:     { background: '#FBEFEC', color: '#7B2D26', border: '1px solid #F0C8BE' },
  candidate:    { background: '#F2EDE3', color: '#4A4640', border: '1px solid #D2C9B5' },
  inconclusive: { background: '#F5F3EF', color: '#888078', border: '1px solid #D8D1C5' },
};

const STATUS_LABELS: Record<StatusTier, string> = {
  definite:     'DEFINITE',
  probable:     'PROBABLE',
  candidate:    'CANDIDATE',
  inconclusive: 'INCONCLUSIVE',
};

interface StatusChipProps {
  tier: StatusTier;
  className?: string;
}

export function StatusChip({ tier, className }: StatusChipProps) {
  return (
    <span
      className={cn('inline-flex items-center leading-none', className)}
      style={{
        height: 18,
        paddingLeft: '7px',
        paddingRight: '7px',
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        whiteSpace: 'nowrap',
        ...STATUS_STYLES[tier],
      }}
    >
      {STATUS_LABELS[tier]}
    </span>
  );
}

/** Maps a RiskLevel to a StatusTier */
export function riskLevelToStatus(level: RiskLevel): StatusTier {
  switch (level) {
    case 'critical': return 'definite';
    case 'high':     return 'probable';
    case 'medium':   return 'candidate';
    default:         return 'inconclusive';
  }
}
