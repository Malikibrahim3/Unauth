import { evaluateRules, type MerchantRule, type RuleSignalBag } from '@/lib/rules-engine';
import { normaliseCurrencyOrNull, toMinorUnits } from '@/lib/canonical/money';

export type ImpactCase = {
  id: string;
  submittedAt: string;
  sourceHash: string;
  signals: RuleSignalBag;
  exposure: number | null;
  currency: string | null;
};
export const IMPACT_DAYS = [7, 30, 90] as const;
export type ImpactDays = typeof IMPACT_DAYS[number];
export function impactWindow(days: number, cutoff: string) {
  if (!IMPACT_DAYS.includes(days as ImpactDays) || !Number.isFinite(Date.parse(cutoff))) throw new Error('Choose 7, 30 or 90 days.');
  return { days: days as ImpactDays, startAt: new Date(Date.parse(cutoff) - days * 86400000).toISOString(), endAt: cutoff, timezone: 'UTC' as const };
}

/** Pure comparison. All rows travel together; pagination never re-reads facts. */
export function compareRuleImpact(cases: ImpactCase[], beforeRules: MerchantRule[], afterRules: MerchantRule[]) {
  if (cases.length > 500) throw new Error('More than 500 cases qualify. Choose a narrower scope.');
  const before = { approve: 0, deny: 0, manual_review: 0, no_match: 0 };
  const after = { ...before };
  const affectedExposureMinor: Record<string, number> = {};
  let unvaluedChangedCases = 0;
  const rows = cases.map(claim => {
    const previous = evaluateRules(claim.signals, beforeRules);
    const proposed = evaluateRules(claim.signals, afterRules);
    const insufficient = previous.certainty === 'insufficient_evidence' || proposed.certainty === 'insufficient_evidence';
    const state = insufficient ? 'insufficient_evidence' : previous.recommendation === proposed.recommendation ? 'unchanged' : 'changed';
    // Recommendation distributions refer to the same conclusive comparison population.
    if (!insufficient) { before[previous.recommendation]++; after[proposed.recommendation]++; }
    const currency = normaliseCurrencyOrNull(claim.currency);
    const amountMinor = currency && claim.exposure != null && Number.isFinite(claim.exposure) && claim.exposure >= 0
      ? toMinorUnits(claim.exposure, currency) : null;
    if (state === 'changed') {
      if (currency && amountMinor != null && Number.isSafeInteger(amountMinor)) {
        const sum = (affectedExposureMinor[currency] ?? 0) + amountMinor;
        if (!Number.isSafeInteger(sum)) throw new Error('Exposure exceeds the supported amount range.');
        affectedExposureMinor[currency] = sum;
      } else unvaluedChangedCases++;
    }
    return { id: claim.id, href: `/cases/${encodeURIComponent(claim.id)}`, sourceHash: claim.sourceHash, state,
      before: previous, after: proposed, currency, amountMinor,
      missingInputs: [...new Set([...(previous.missing_inputs ?? []), ...(proposed.missing_inputs ?? [])])] };
  });
  return {
    evaluatedCount: rows.length,
    changedCount: rows.filter(r => r.state === 'changed').length,
    unchangedCount: rows.filter(r => r.state === 'unchanged').length,
    insufficientEvidenceCount: rows.filter(r => r.state === 'insufficient_evidence').length,
    before, after, affectedExposureMinor, unvaluedChangedCases, rows, pageSize: 50 as const,
    writesPerformed: 0 as const,
  };
}
export type RuleImpact = ReturnType<typeof compareRuleImpact>;
