/**
 * lib/rules/widgetSignals.ts
 *
 * Maps the Gorgias widget's resolved claim context (ClaimWidgetData) into the
 * IdentitySignals shape the rules engine consumes.
 *
 * Some signals are not available in the widget context (order value, account
 * age). These map to neutral defaults (null / 0 / false) so a condition
 * referencing them simply does not match rather than throwing.
 *
 * Evidence fields use safe neutral values when network disclosure is withheld
 * (k-anonymity). Rules must not treat withheld evidence as a real zero score.
 */

import type { ClaimWidgetData } from '@/lib/gorgias/widgetData';
import type { ConfidenceGrade, EvidenceLevel, IdentitySignals } from '@/lib/rules-engine';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const WITHHELD_EVIDENCE: Pick<IdentitySignals, 'evidence_score' | 'evidence_level' | 'has_sufficient_data'> = {
  evidence_score: 0,
  evidence_level: 'minimal',
  has_sufficient_data: false,
};

function daysSince(iso: string | null, nowMs: number): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((nowMs - then) / MS_PER_DAY));
}

function mostRecent(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

function evidenceSignalsFromWidget(
  data: ClaimWidgetData,
): Pick<IdentitySignals, 'evidence_score' | 'evidence_level' | 'has_sufficient_data'> {
  if (!data.evidenceDisclosed) return WITHHELD_EVIDENCE;
  return {
    evidence_score: data.evidenceScore,
    evidence_level: data.evidenceLevel as EvidenceLevel,
    has_sufficient_data: data.hasSufficientData,
  };
}

export function widgetDataToSignals(
  data: ClaimWidgetData,
  nowMs: number = Date.now(),
): IdentitySignals {
  const network = data.network;
  const lastClaimAt = mostRecent(data.thisStore.lastClaimAt, network?.lastClaimAt ?? null);

  return {
    confidence_grade: (data.confidenceGrade ?? 'weak') as ConfidenceGrade,
    network_claim_count: network?.claimCount ?? 0,
    merchant_claim_count: data.thisStore.claimCount,
    days_since_last_claim: daysSince(lastClaimAt, nowMs),
    has_cross_merchant_identity: network ? network.merchantCount > 1 : false,
    network_merchant_count: network?.merchantCount ?? 0,
    claim_types: data.claimTypes,
    order_value_usd: null,
    account_age_days: null,
    is_network_flagged: data.isNetworkFlagged,
    ...evidenceSignalsFromWidget(data),
  };
}
