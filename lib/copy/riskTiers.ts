export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

export interface RiskTierCopy {
  label: string;
  description: string;
  default: string;
}

export const RISK_TIER_COPY: Record<RiskTier, RiskTierCopy> = {
  low: {
    label: 'Low',
    description: 'No strong identity match signals.',
    default: 'No action needed.',
  },
  medium: {
    label: 'Medium',
    description: 'Some identity signals present — worth monitoring.',
    default: 'Keep on review list for their next order.',
  },
  high: {
    label: 'High',
    description: 'Probable identity match — review recommended.',
    default: 'Review this refund claim manually before approving.',
  },
  critical: {
    label: 'Critical',
    description: 'Strong identity match detected — review required.',
    default: 'Hold any pending refund and request additional verification.',
  },
} as const;
