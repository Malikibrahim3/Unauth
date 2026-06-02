import type { CSSProperties } from 'react';
import {
  GRADE_COLOURS,
  GRADE_FILL_COLOURS,
  GRADE_LABELS,
} from '@/lib/utils/confidenceStyles';
import type { ConfidenceGrade } from '@/lib/engine/weights';
import type { CustomerIntelligencePanel } from '@/app/api/customers/[id]/route';

export type DrawerProfile = CustomerIntelligencePanel['profile'] & {
  investigation_status?: string;
  identity_signals?: string[];
};

function riskLevelToConfidenceGrade(riskLevel: string): ConfidenceGrade {
  switch ((riskLevel ?? '').toLowerCase()) {
    case 'definite':
      return 'definite';
    case 'probable':
      return 'probable';
    case 'possible':
    case 'candidate':
      return 'possible';
    default:
      return 'weak';
  }
}

export function tierChipGradeClass(grade: string): string {
  return `cid-tier-chip cid-tier-chip--${riskLevelToConfidenceGrade(grade)}`;
}

function orderGlyphClass(isCritical: boolean, hasClaim: boolean): string {
  if (isCritical) return 'cid-order-glyph cid-order-glyph--critical';
  if (hasClaim) return 'cid-order-glyph cid-order-glyph--claim';
  return 'cid-order-glyph cid-order-glyph--neutral';
}

function orderCardClass(isCritical: boolean, hasClaim: boolean): string {
  if (isCritical) return 'cid-order-card cid-order-card--critical';
  if (hasClaim) return 'cid-order-card cid-order-card--claim';
  return 'cid-order-card cid-order-card--neutral';
}

export function tierLabel(grade: string): string {
  const mapped = riskLevelToConfidenceGrade(grade);
  const base = GRADE_LABELS[mapped];
  return mapped === 'weak' ? 'Weak signals' : `${base} match`;
}

export function gradeDotStyle(grade: string): CSSProperties {
  return { background: GRADE_COLOURS[riskLevelToConfidenceGrade(grade)] };
}

export function buildPlainVerdict(
  linkedCount: number,
  _riskScore: number,
  _grade: string,
  variantCount: number,
  _profileConfidence: number,
): string {
  if (linkedCount > 0) {
    const accountWord = linkedCount === 1 ? 'account' : 'accounts';
    return `Resolves to the same shopper as ${linkedCount} other ${accountWord}, based on your store data.`;
  }
  if (variantCount > 0) {
    return `Multiple identity signals on this customer (${variantCount} variant${variantCount !== 1 ? 's' : ''}) in your store data.`;
  }
  return 'Identity resolved from your store data - no linked accounts found.';
}

export function signalSummary(_riskScore: number, claimCount: number, variantCount: number): string {
  const parts: string[] = [];
  if (claimCount > 0) parts.push(`${claimCount} claim${claimCount !== 1 ? 's' : ''} on record`);
  if (variantCount > 0) parts.push(`${variantCount} identity variant${variantCount !== 1 ? 's' : ''} observed`);
  if (parts.length === 0) return 'No overlapping signals detected in this dataset.';
  return `Signals include: ${parts.join(', ')}.`;
}

function profileIdentitySignals(profile: DrawerProfile): string[] {
  return profile.identity_signals ?? profile.fraud_flags ?? [];
}

export function profileInvestigationStatus(profile: DrawerProfile): string {
  return profile.investigation_status ?? 'new';
}

export function getDrawerFooterProps(
  profile: DrawerProfile,
  orderHistory: {
    refundRequested?: boolean;
    returnRequested?: boolean;
    chargebackFiled?: boolean;
    transactionId: string;
  }[],
) {
  const hasProfileId = Boolean(profile.id?.trim());
  const isEligibleForEvidence =
    orderHistory.some((o) => o.refundRequested || o.returnRequested || o.chargebackFiled) ||
    profile.total_chargebacks > 0 ||
    profile.total_refund_claims > 0;
  const disputedOrder = orderHistory.find((o) => o.refundRequested || o.chargebackFiled);
  const identitySignals = profileIdentitySignals(profile);
  return { hasProfileId, isEligibleForEvidence, disputedOrder, identitySignals };
}
