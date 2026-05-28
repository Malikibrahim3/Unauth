import type { LookupResponse } from '../shared/types';

export type RiskVisual = {
  label: string;
  className: 'risk-critical' | 'risk-high' | 'risk-medium' | 'risk-low';
};

export function riskVisualForLookup(lookup: LookupResponse): RiskVisual {
  const grade = lookup.risk_grade;
  const score = lookup.risk_score;

  if (grade === 'A' || lookup.confidence === 'definite' || score >= 75) {
    return { label: 'HIGH RISK', className: 'risk-critical' };
  }
  if (grade === 'B' || lookup.confidence === 'probable' || score >= 55) {
    return { label: 'ELEVATED RISK', className: 'risk-high' };
  }
  if (grade === 'C' || lookup.confidence === 'possible' || score >= 35) {
    return { label: 'MODERATE RISK', className: 'risk-medium' };
  }
  return { label: 'LOW RISK', className: 'risk-low' };
}

export function confidenceLabel(confidence: string): string {
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

export function maskApiKey(key: string): string {
  if (!key.startsWith('unauth_sk_')) return '••••••••';
  return `${key.slice(0, 18)}...`;
}
