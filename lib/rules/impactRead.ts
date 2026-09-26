import { readImpactRevision } from '@/lib/rules/impactToken';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { buildClaimDecisionContext } from '@/lib/claims/decision/context';
import { claimDecisionContextToSignals } from '@/lib/claims/decision/signals';
import { buildSupportPayoutCase } from '@/lib/payouts/supportPayoutCase';
import { mapRuleRow, RULE_COLUMNS } from '@/lib/rules/store';
import { compareRuleImpact, impactWindow, type ImpactCase } from '@/lib/rules/impact';
import type { MerchantRule } from '@/lib/rules-engine';

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]));
  return value;
}
export function impactHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

/** Uses the live context and pure signal mapper, never the auditing evaluator. */
export async function readRuleImpact(client: SupabaseClient, merchantId: string, days: number,
  propose: (rules: MerchantRule[]) => MerchantRule[], cutoff = new Date().toISOString()) {
  const revision = await readImpactRevision(client, merchantId);
  const window = impactWindow(days, cutoff);
  const [rulesResult, claimsResult] = await Promise.all([
    client.from(TABLES.MERCHANT_RULES).select(RULE_COLUMNS).eq('merchant_id', merchantId)
      .eq('is_active', true).is('archived_at', null).order('priority').order('id').limit(501),
    client.from(TABLES.MERCHANT_CLAIMS).select('id,submitted_at', { count: 'exact' }).eq('merchant_id', merchantId)
      .gte('submitted_at', window.startAt).lt('submitted_at', window.endAt).order('submitted_at').order('id').limit(501),
  ]);
  if (rulesResult.error || claimsResult.error || claimsResult.count == null) throw new Error('Policy or case scope could not be read completely.');
  if (claimsResult.count > 500) throw new Error('More than 500 cases qualify. Choose a narrower scope.');
  if (claimsResult.data?.length !== claimsResult.count || (rulesResult.data?.length ?? 0) > 500) throw new Error('The policy or case scope is incomplete.');
  const rules = (rulesResult.data ?? []).map(row => mapRuleRow(row as never));
  const proposed = propose(rules);
  const cases: ImpactCase[] = [];
  // Bounded concurrency avoids flooding the live context's source queries.
  for (let offset = 0; offset < claimsResult.data.length; offset += 5) {
    const batch = await Promise.all(claimsResult.data.slice(offset, offset + 5).map(async row => {
      const context = await buildClaimDecisionContext(client, merchantId, row.id, Date.parse(cutoff));
      if (!context) throw new Error('A case changed during preview. Run it again.');
      const payout = buildSupportPayoutCase(context);
      return { id: row.id, submittedAt: row.submitted_at as string, sourceHash: impactHash(context),
        signals: claimDecisionContextToSignals(context, payout), exposure: context.claim.amountAtRisk, currency: context.claim.currency };
    }));
    cases.push(...batch);
  }
  if (await readImpactRevision(client, merchantId) !== revision) throw new Error('Policy or source evidence changed during preview. Run it again.');
  return { revision, contractVersion: 2 as const, window, policyHash: impactHash(rules), proposedHash: impactHash(proposed),
    sourceHash: impactHash(cases), ...compareRuleImpact(cases, rules, proposed),
    notice: 'Current-evidence comparison at the stated cutoff. Affected exposure is not savings. No policy, decision, provider, audit, credit or Work changes are made.' };
}
