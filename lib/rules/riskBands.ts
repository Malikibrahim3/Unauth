import type { ConditionOperator, MerchantRule, RuleAction, RuleCondition } from '@/lib/rules-engine';

export interface RiskScoreRange {
  lower: number;
  upper: number;
}

export interface DefaultRiskControl extends RiskScoreRange {
  name: string;
  description: string;
  action: RuleAction;
}

export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

export const DEFAULT_RISK_CONTROLS: DefaultRiskControl[] = [
  {
    name: 'Default low-risk control',
    description: 'Low behaviour risk. Recommend approval.',
    lower: 0,
    upper: 39,
    action: 'approve',
  },
  {
    name: 'Default review control',
    description: 'Moderate behaviour risk. Recommend manual review.',
    lower: 40,
    upper: 74,
    action: 'manual_review',
  },
  {
    name: 'Default high-risk control',
    description: 'High behaviour risk. Recommend denial.',
    lower: 75,
    upper: 100,
    action: 'deny',
  },
];

export const DEFAULT_MANUAL_REVIEW_RANGE: RiskScoreRange = {
  lower: DEFAULT_RISK_CONTROLS[1]!.lower,
  upper: DEFAULT_RISK_CONTROLS[1]!.upper,
};

export function clampRiskScore(value: number): number {
  if (!Number.isFinite(value)) return SCORE_MIN;
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(value)));
}

export function makeRiskScoreRangeConditions(range: RiskScoreRange): RuleCondition[] {
  const lower = clampRiskScore(range.lower);
  const upper = clampRiskScore(range.upper);
  return [
    { id: 'risk-score-min', field: 'evidence_score', operator: 'gte', value: lower },
    { id: 'risk-score-max', field: 'evidence_score', operator: 'lte', value: upper },
  ];
}

export function formatRiskScoreRange(range: RiskScoreRange): string {
  return `risk score is between ${range.lower} and ${range.upper}`;
}

export function rangesOverlap(a: RiskScoreRange, b: RiskScoreRange): boolean {
  return Math.max(a.lower, b.lower) <= Math.min(a.upper, b.upper);
}

export function parseRiskScoreRange(input: {
  conditions: RuleCondition[];
  condition_operator: ConditionOperator;
}): RiskScoreRange | null {
  if (input.conditions.length === 0 || input.condition_operator !== 'and') return null;
  let lower = SCORE_MIN;
  let upper = SCORE_MAX;

  for (const condition of input.conditions) {
    if (condition.field !== 'evidence_score' || typeof condition.value !== 'number') {
      return null;
    }
    const value = clampRiskScore(condition.value);
    switch (condition.operator) {
      case 'eq':
        lower = Math.max(lower, value);
        upper = Math.min(upper, value);
        break;
      case 'gte':
        lower = Math.max(lower, value);
        break;
      case 'gt':
        lower = Math.max(lower, clampRiskScore(value + 1));
        break;
      case 'lte':
        upper = Math.min(upper, value);
        break;
      case 'lt':
        upper = Math.min(upper, clampRiskScore(value - 1));
        break;
      default:
        return null;
    }
  }

  return lower <= upper ? { lower, upper } : null;
}

export function findOverlappingRiskControl(
  rules: MerchantRule[],
  candidate: RiskScoreRange,
  excludeRuleId?: string | null,
): MerchantRule | null {
  for (const rule of rules) {
    if (!rule.is_active || rule.id === excludeRuleId) continue;
    const range = parseRiskScoreRange(rule);
    if (range && rangesOverlap(range, candidate)) return rule;
  }
  return null;
}

export function activeRiskScoreRanges(
  rules: MerchantRule[],
  candidate?: { range: RiskScoreRange; excludeRuleId?: string | null },
): RiskScoreRange[] {
  const ranges: RiskScoreRange[] = [];
  for (const rule of rules) {
    if (!rule.is_active || rule.id === candidate?.excludeRuleId) continue;
    const range = parseRiskScoreRange(rule);
    if (range) ranges.push(range);
  }
  if (candidate) ranges.push(candidate.range);
  return ranges.sort((a, b) => a.lower - b.lower || a.upper - b.upper);
}

export function findRiskScoreCoverageGap(ranges: RiskScoreRange[]): RiskScoreRange | null {
  if (ranges.length === 0) return { lower: SCORE_MIN, upper: SCORE_MAX };

  let expectedLower = SCORE_MIN;
  for (const range of ranges) {
    if (range.lower > expectedLower) return { lower: expectedLower, upper: range.lower - 1 };
    expectedLower = Math.max(expectedLower, range.upper + 1);
  }

  return expectedLower <= SCORE_MAX ? { lower: expectedLower, upper: SCORE_MAX } : null;
}

export function formatRiskScoreGap(gap: RiskScoreRange): string {
  return gap.lower === gap.upper
    ? `score ${gap.lower}`
    : `scores ${gap.lower}-${gap.upper}`;
}

export function riskScorePolicyCoverageError(ranges: RiskScoreRange[]): string | null {
  const gap = findRiskScoreCoverageGap(ranges);
  return gap ? `Risk score policy must cover every score from 0-100. Missing ${formatRiskScoreGap(gap)}.` : null;
}
