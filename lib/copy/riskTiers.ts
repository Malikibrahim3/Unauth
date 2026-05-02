export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

export interface RiskTierCopy {
  label: string;
  description: string;
  default: string;
}

export const RISK_TIER_COPY: Record<RiskTier, RiskTierCopy> = {
  low: {
    label: 'Low',
    description: 'Normal customer behaviour.',
    default: 'No action needed.',
  },
  medium: {
    label: 'Medium',
    description: 'Worth watching — something looks off.',
    default: 'Keep on watchlist for their next order.',
  },
  high: {
    label: 'High',
    description: 'Likely review priority.',
    default: 'Review this refund claim manually before approving.',
  },
  critical: {
    label: 'Critical',
    description: 'Act now — strong identity match detected.',
    default: 'Hold any pending refund and contact the customer.',
  },
} as const;
