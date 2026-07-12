/**
 * Evidence Scoring Engine — pure scoring function.
 *
 * No database calls, no side effects, fully unit-testable. Consumes already-
 * resolved behavioural signals and returns an evidence score (0–100) with a
 * fully decomposed, plain-language breakdown.
 *
 * Confidence grade is deliberately ABSENT from this module: evidence and
 * confidence are two separate axes and are never merged here (see config.ts).
 * No "risk"/"fraud" wording appears in any output string.
 */
import { CLAIM_TYPE_LABELS } from '@/lib/claims/claimTypes';
import {
  CLAIM_TYPE_SEVERITY,
  EVIDENCE_LEVEL_THRESHOLDS,
  EVIDENCE_SCORING_CONFIG_VERSION,
  MAX_BREADTH_POINTS,
  MAX_FREQUENCY_POINTS,
  MAX_RECENCY_POINTS,
  MAX_SEVERITY_POINTS,
  NETWORK_BREADTH_TIERS,
  NETWORK_CLAIM_FREQUENCY_TIERS,
  NETWORK_FLAG_BONUS,
  RECENCY_TIERS,
} from './config';

export type EvidenceLevel = 'minimal' | 'some' | 'substantial' | 'extensive';

export interface BehavioralSignals {
  network_claim_count: number;
  network_merchant_count: number;
  days_since_last_claim: number | null;
  claim_types: string[];
  is_network_flagged: boolean;
}

export interface ScoreFactor {
  factor: string;
  label: string;
  points: number;
  max_points: number;
  reason: string;
}

export interface EvidenceScoreResult {
  evidence_score: number;
  evidence_level: EvidenceLevel;
  has_sufficient_data: boolean;
  breakdown: ScoreFactor[];
  scoring_config_version: string;
}

function severityOf(claimType: string): number {
  return CLAIM_TYPE_SEVERITY[claimType as keyof typeof CLAIM_TYPE_SEVERITY] ?? 0;
}

function labelOf(claimType: string): string {
  return CLAIM_TYPE_LABELS[claimType as keyof typeof CLAIM_TYPE_LABELS] ?? claimType;
}

export function computeEvidenceScore(signals: BehavioralSignals): EvidenceScoreResult {
  const breakdown: ScoreFactor[] = [];

  // Factor 1 — claims across the network.
  // Every tier array ends in a `max: Infinity` catch-all, so `.find(...)!` is sound.
  const freqTier = NETWORK_CLAIM_FREQUENCY_TIERS.find((t) => signals.network_claim_count <= t.max)!;
  breakdown.push({
    factor: 'network_claim_frequency',
    label: 'Claims across the network',
    points: freqTier.points,
    max_points: MAX_FREQUENCY_POINTS,
    reason: `${signals.network_claim_count} claim(s) recorded across all merchants in the network`,
  });

  // Factor 2 — distinct merchants claimed at.
  const breadthTier = NETWORK_BREADTH_TIERS.find((t) => signals.network_merchant_count <= t.max)!;
  breakdown.push({
    factor: 'network_breadth',
    label: 'Distinct merchants claimed at',
    points: breadthTier.points,
    max_points: MAX_BREADTH_POINTS,
    reason: `Claims recorded at ${signals.network_merchant_count} distinct merchant(s) in the network`,
  });

  // Factor 3 — recency of the most recent claim.
  let recencyPoints = 0;
  let recencyReason = 'No claims on record';
  if (signals.days_since_last_claim !== null) {
    const days = signals.days_since_last_claim;
    const recTier = RECENCY_TIERS.find((t) => days <= t.maxDays)!;
    recencyPoints = recTier.points;
    recencyReason = `Most recent claim was ${days} day(s) ago`;
  }
  breakdown.push({
    factor: 'claim_recency',
    label: 'Recency of claim activity',
    points: recencyPoints,
    max_points: MAX_RECENCY_POINTS,
    reason: recencyReason,
  });

  // Factor 4 — severity of the single most significant claim type present.
  let severityPoints = 0;
  let severityReason = 'No claim types on record';
  if (signals.claim_types.length > 0) {
    severityPoints = Math.max(...signals.claim_types.map(severityOf));
    const topType = signals.claim_types.reduce((a, b) => (severityOf(b) > severityOf(a) ? b : a));
    severityReason = `Most significant claim type on record: ${labelOf(topType)}`;
  }
  breakdown.push({
    factor: 'claim_severity',
    label: 'Severity of claim types',
    points: severityPoints,
    max_points: MAX_SEVERITY_POINTS,
    reason: severityReason,
  });

  // Factor 5 — flagged on another merchant's watchlist in the network.
  breakdown.push({
    factor: 'network_flag',
    label: 'Flagged by another merchant',
    points: signals.is_network_flagged ? NETWORK_FLAG_BONUS : 0,
    max_points: NETWORK_FLAG_BONUS,
    reason: signals.is_network_flagged
      ? 'Flagged on at least one other merchant watchlist in the network'
      : 'Not on any other merchant watchlist',
  });

  const rawScore = breakdown.reduce((sum, f) => sum + f.points, 0);
  const evidence_score = Math.min(100, rawScore);

  const has_sufficient_data = signals.network_claim_count > 0 || signals.is_network_flagged;

  const levelTier = EVIDENCE_LEVEL_THRESHOLDS.find((t) => evidence_score <= t.max)!;
  const evidence_level: EvidenceLevel = has_sufficient_data ? levelTier.level : 'minimal';

  return {
    evidence_score,
    evidence_level,
    has_sufficient_data,
    breakdown,
    scoring_config_version: EVIDENCE_SCORING_CONFIG_VERSION,
  };
}
