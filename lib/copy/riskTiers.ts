export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

export interface RiskTierCopy {
  label: string;
  description: string;
  default: string;
}

export const RISK_TIER_COPY: Record<RiskTier, RiskTierCopy> = {
  low: {
    label: 'Low',
    description: 'No strong identity match.',
    default: 'No strong identity evidence is present.',
  },
  medium: {
    label: 'Medium',
    description: 'Some identity evidence present — worth monitoring.',
    default: 'Some identity evidence is present and useful as context.',
  },
  high: {
    label: 'High',
    description: 'Probable identity match — review recommended.',
    default: 'The identity evidence is probable and should be read with the order timeline.',
  },
  critical: {
    label: 'Critical',
    description: 'Strong identity match detected — review required.',
    default: 'The identity evidence is strong and connects multiple order signals.',
  },
} as const;
