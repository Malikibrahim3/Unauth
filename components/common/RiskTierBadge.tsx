'use client';

import type { RiskTier } from '@/lib/copy/riskTiers';
import { RISK_TIER_COPY } from '@/lib/copy/riskTiers';

/** CSS-var-based classes per §5.7 — risk colors are the ONLY valid use of red/amber/green */
const BADGE_STYLES: Record<RiskTier | 'unknown', { bg: string; text: string; border: string; dot: string }> = {
  critical: {
    bg:     'bg-[var(--risk-critical-bg)]',
    text:   'text-[var(--risk-critical)]',
    border: 'border-[var(--risk-critical-bd)]',
    dot:    'bg-[var(--risk-critical)]',
  },
  high: {
    bg:     'bg-[var(--risk-high-bg)]',
    text:   'text-[var(--risk-high)]',
    border: 'border-[var(--risk-high-bd)]',
    dot:    'bg-[var(--risk-high)]',
  },
  medium: {
    bg:     'bg-[var(--risk-medium-bg)]',
    text:   'text-[var(--risk-medium)]',
    border: 'border-[var(--risk-medium-bd)]',
    dot:    'bg-[var(--risk-medium)]',
  },
  low: {
    bg:     'bg-[var(--risk-low-bg)]',
    text:   'text-[var(--risk-low)]',
    border: 'border-[var(--risk-low-bd)]',
    dot:    'bg-[var(--risk-low)]',
  },
  unknown: {
    bg:     'bg-[var(--risk-none-bg)]',
    text:   'text-[var(--risk-none)]',
    border: 'border-[var(--risk-none-bd)]',
    dot:    'bg-[var(--risk-none)]',
  },
};

const VALID_TIERS = new Set(['low', 'medium', 'high', 'critical']);

interface RiskTierBadgeProps {
  tier: RiskTier | string | null | undefined;
  className?: string;
}

export default function RiskTierBadge({ tier, className = '' }: RiskTierBadgeProps) {
  const safeTier = (tier && VALID_TIERS.has(tier) ? tier : 'unknown') as RiskTier | 'unknown';
  const copy = safeTier !== 'unknown'
    ? RISK_TIER_COPY[safeTier as RiskTier]
    : { label: 'Unknown', description: 'Risk tier not available' };
  const s = BADGE_STYLES[safeTier];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-xs font-medium ${s.bg} ${s.text} ${s.border} ${className}`}
      title={copy.description}
    >
      {/* Leading dot — makes tier instantly scannable at low size */}
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${s.dot}`} aria-hidden="true" />
      {copy.label}
    </span>
  );
}
