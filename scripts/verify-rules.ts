/**
 * scripts/verify-rules.ts
 *
 * Repeatable, IO-free verification of the merchant rules engine and its
 * integration contract with the scoring/identity pipeline.
 *
 * Run via: npm run verify:rules  (this script runs after the jest unit suite)
 *
 * It asserts the pure, deterministic guarantees that do NOT require a live
 * Supabase: engine outcomes, operator coverage, justification shape, the
 * IdentitySignals contract, the widget signal mapping, the recommendation
 * formatting, server-side validation, and the "Unauth never decides" copy rule.
 *
 * DB-backed route behaviour (RLS scoping, audit-row writes, reorder) is asserted
 * by reading the route source for the invariants it must uphold — see the
 * "API route source invariants" section. Live HTTP/DB checks require external
 * credentials and are listed as manual checks in the final report.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  evaluateRules,
  formatValue,
  type IdentitySignals,
  type MerchantRule,
  type RuleCondition,
} from '@/lib/rules-engine';
import { validateConditions, RULE_FIELDS, operatorsForField, CATEGORY_LABELS, type RuleFieldCategory } from '@/lib/rules/fields';
import { widgetDataToSignals } from '@/lib/rules/widgetSignals';
import { formatRecommendationFields } from '@/lib/gorgias/widgetJson';
import { buildGorgiasSidebarWidgetTemplate } from '@/lib/support/gorgias/registerSidebarWidget';
import type { ClaimWidgetData } from '@/lib/gorgias/widgetData';

// ---------------------------------------------------------------------------
// Tiny assertion harness
// ---------------------------------------------------------------------------

let passed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean): void {
  if (cond) {
    passed += 1;
  } else {
    failures.push(name);
    console.error(`  ✗ ${name}`);
  }
}

function eq<T>(name: string, actual: T, expected: T): void {
  check(`${name} (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`, actual === expected);
}

function signals(overrides: Partial<IdentitySignals> = {}): IdentitySignals {
  return {
    confidence_grade: 'probable',
    network_claim_count: 0,
    merchant_claim_count: 0,
    days_since_last_claim: null,
    has_cross_merchant_identity: false,
    network_merchant_count: 0,
    claim_types: [],
    order_value_usd: null,
    account_age_days: null,
    is_network_flagged: false,
    evidence_score: 0,
    evidence_level: 'minimal',
    has_sufficient_data: false,
    ...overrides,
  };
}

function rule(partial: Partial<MerchantRule>): MerchantRule {
  return {
    id: partial.id ?? 'r1',
    merchant_id: 'm1',
    name: partial.name ?? 'Rule',
    description: null,
    is_active: partial.is_active ?? true,
    priority: partial.priority ?? 0,
    conditions: partial.conditions ?? [],
    action: partial.action ?? 'manual_review',
    condition_operator: partial.condition_operator ?? 'and',
  };
}

function cond(field: string, operator: string, value: unknown): RuleCondition {
  return { id: `${field}-${operator}`, field, operator, value };
}

// ---------------------------------------------------------------------------
// 1. Engine outcomes
// ---------------------------------------------------------------------------

console.log('1. Engine outcomes');

eq('approve outcome', evaluateRules(signals(), [rule({ action: 'approve' })]).recommendation, 'approve');
eq('manual_review outcome', evaluateRules(signals(), [rule({ action: 'manual_review' })]).recommendation, 'manual_review');
eq('deny outcome', evaluateRules(signals(), [rule({ action: 'deny' })]).recommendation, 'deny');
eq('no_match when no rules', evaluateRules(signals(), []).recommendation, 'no_match');
eq('no_match rule_id null', evaluateRules(signals(), []).rule_id, null);

// no_match when a rule exists but does not match
eq(
  'no_match when rule does not match',
  evaluateRules(signals({ network_claim_count: 0 }), [
    rule({ conditions: [cond('network_claim_count', 'gte', 5)] }),
  ]).recommendation,
  'no_match',
);

// ---------------------------------------------------------------------------
// 2. Priority ordering — lower number wins
// ---------------------------------------------------------------------------

console.log('2. Priority ordering');

{
  const rules = [
    rule({ id: 'lo', priority: 5, action: 'deny', conditions: [cond('network_claim_count', 'gte', 1)] }),
    rule({ id: 'hi', priority: 0, action: 'manual_review', conditions: [cond('network_claim_count', 'gte', 1)] }),
  ];
  const r = evaluateRules(signals({ network_claim_count: 3 }), rules);
  eq('lower priority number wins (rule_id)', r.rule_id, 'hi');
  eq('lower priority number wins (action)', r.recommendation, 'manual_review');
}

// ---------------------------------------------------------------------------
// 3. AND vs OR
// ---------------------------------------------------------------------------

console.log('3. AND vs OR logic');

{
  const andRule = rule({
    action: 'deny',
    condition_operator: 'and',
    conditions: [cond('network_claim_count', 'gte', 3), cond('confidence_grade', 'in', ['definite', 'probable'])],
  });
  eq('AND all pass', evaluateRules(signals({ network_claim_count: 3, confidence_grade: 'probable' }), [andRule]).recommendation, 'deny');
  eq('AND one fails -> no_match', evaluateRules(signals({ network_claim_count: 3, confidence_grade: 'weak' }), [andRule]).recommendation, 'no_match');

  const orRule = rule({
    action: 'deny',
    condition_operator: 'or',
    conditions: [cond('is_network_flagged', 'eq', true), cond('network_claim_count', 'gte', 10)],
  });
  eq('OR one passes', evaluateRules(signals({ is_network_flagged: true }), [orRule]).recommendation, 'deny');
  eq('OR none passes -> no_match', evaluateRules(signals(), [orRule]).recommendation, 'no_match');
  // OR reports only the conditions that actually passed
  const orPassed = evaluateRules(signals({ is_network_flagged: true }), [orRule]).matched_conditions;
  eq('OR reports only passing conditions', orPassed.length, 1);
}

// ---------------------------------------------------------------------------
// 4. Every supported operator
// ---------------------------------------------------------------------------

console.log('4. Operator coverage');

function opResult(c: RuleCondition, s: Partial<IdentitySignals>): string {
  return evaluateRules(signals(s), [rule({ action: 'deny', conditions: [c] })]).recommendation;
}

eq('eq true', opResult(cond('confidence_grade', 'eq', 'definite'), { confidence_grade: 'definite' }), 'deny');
eq('eq false', opResult(cond('confidence_grade', 'eq', 'definite'), { confidence_grade: 'weak' }), 'no_match');
eq('neq true', opResult(cond('confidence_grade', 'neq', 'weak'), { confidence_grade: 'definite' }), 'deny');
eq('neq false', opResult(cond('confidence_grade', 'neq', 'weak'), { confidence_grade: 'weak' }), 'no_match');
eq('gt true', opResult(cond('network_claim_count', 'gt', 2), { network_claim_count: 3 }), 'deny');
eq('gt false', opResult(cond('network_claim_count', 'gt', 2), { network_claim_count: 2 }), 'no_match');
eq('gte boundary', opResult(cond('network_claim_count', 'gte', 2), { network_claim_count: 2 }), 'deny');
eq('lt true', opResult(cond('network_claim_count', 'lt', 2), { network_claim_count: 1 }), 'deny');
eq('lt false', opResult(cond('network_claim_count', 'lt', 2), { network_claim_count: 2 }), 'no_match');
eq('lte boundary', opResult(cond('network_claim_count', 'lte', 2), { network_claim_count: 2 }), 'deny');
eq('in true', opResult(cond('confidence_grade', 'in', ['definite', 'probable']), { confidence_grade: 'probable' }), 'deny');
eq('in false', opResult(cond('confidence_grade', 'in', ['definite']), { confidence_grade: 'weak' }), 'no_match');
eq('not_in true', opResult(cond('confidence_grade', 'not_in', ['weak']), { confidence_grade: 'definite' }), 'deny');
eq('not_in false', opResult(cond('confidence_grade', 'not_in', ['weak']), { confidence_grade: 'weak' }), 'no_match');
eq('contains true', opResult(cond('claim_types', 'contains', 'chargeback'), { claim_types: ['refund_request', 'chargeback'] }), 'deny');
eq('contains false', opResult(cond('claim_types', 'contains', 'chargeback'), { claim_types: ['refund_request'] }), 'no_match');
eq('not_contains true', opResult(cond('claim_types', 'not_contains', 'chargeback'), { claim_types: ['refund_request'] }), 'deny');
eq('not_contains false', opResult(cond('claim_types', 'not_contains', 'chargeback'), { claim_types: ['chargeback'] }), 'no_match');
eq('contains_any true', opResult(cond('claim_types', 'contains_any', ['item_not_received', 'chargeback']), { claim_types: ['refund_request', 'item_not_received'] }), 'deny');
eq('contains_any false', opResult(cond('claim_types', 'contains_any', ['item_not_received', 'chargeback']), { claim_types: ['refund_request'] }), 'no_match');

// numeric comparisons against null actuals never match
eq('gte vs null actual', opResult(cond('days_since_last_claim', 'gte', 0), { days_since_last_claim: null }), 'no_match');

// ---------------------------------------------------------------------------
// 5. Empty conditions = always match
// ---------------------------------------------------------------------------

console.log('5. Empty conditions');
eq('empty conditions always match', evaluateRules(signals(), [rule({ action: 'approve', conditions: [] })]).recommendation, 'approve');

// ---------------------------------------------------------------------------
// 6. matched_conditions include actual_value + justification explains the rule
// ---------------------------------------------------------------------------

console.log('6. matched_conditions + justification');

{
  const r = evaluateRules(signals({ network_claim_count: 5 }), [
    rule({ name: 'Serial Network Abuser', action: 'manual_review', conditions: [cond('network_claim_count', 'gte', 3)] }),
  ]);
  check('matched_conditions populated', r.matched_conditions.length === 1);
  eq('matched_conditions carry actual_value', r.matched_conditions[0]!.actual_value, 5);
  check('justification names the fired rule', r.justification_lines[0]!.includes('Serial Network Abuser'));
  check('justification shows actual value', r.justification_lines.some((l) => l.includes('actual: 5')));
  check('justification string is non-empty', r.justification.length > 0);
}

// ---------------------------------------------------------------------------
// 7. Server-side validation rejects bad fields/operators/values
// ---------------------------------------------------------------------------

console.log('7. Condition validation');

check('valid condition accepted', validateConditions([cond('network_claim_count', 'gte', 3)]).length === 0);
check('unknown field rejected', validateConditions([cond('nope', 'eq', 1)]).length === 1);
check('incompatible operator rejected', validateConditions([cond('confidence_grade', 'gt', 1)]).length === 1);
check('non-numeric value for numeric field rejected', validateConditions([cond('order_value_usd', 'gte', 'lots')]).length === 1);
check('invalid enum option rejected', validateConditions([cond('confidence_grade', 'eq', 'amazing')]).length === 1);
check('invalid claim type rejected', validateConditions([cond('claim_types', 'contains', 'nonsense')]).length === 1);
check('empty conditions array allowed', validateConditions([]).length === 0);
check('missing value rejected', validateConditions([{ id: 'x', field: 'network_claim_count', operator: 'gte', value: null }]).length === 1);
check('valid evidence_score >= 45 accepted', validateConditions([cond('evidence_score', 'gte', 45)]).length === 0);
check('invalid operator on evidence_score rejected', validateConditions([cond('evidence_score', 'contains', 45)]).length === 1);
check('invalid evidence_level option rejected', validateConditions([cond('evidence_level', 'eq', 'amazing')]).length === 1);
check('has_sufficient_data rejects non-equality operator', validateConditions([cond('has_sufficient_data', 'gt', true)]).length === 1);

// Evidence category appears before other categories in the UI catalogue.
{
  const CATEGORY_ORDER: RuleFieldCategory[] = ['evidence', 'identity', 'claim_history', 'order'];
  const firstFieldByCategory = CATEGORY_ORDER.map((cat) => RULE_FIELDS.find((f) => f.category === cat)?.field);
  check('evidence category is first in UI order', firstFieldByCategory[0] === 'evidence_score');
  check('evidence category label present', CATEGORY_LABELS.evidence === 'Evidence');
}

// evaluateRules can match on evidence fields.
{
  eq(
    'evidence_score gte matches',
    evaluateRules(signals({ evidence_score: 50 }), [rule({ action: 'manual_review', conditions: [cond('evidence_score', 'gte', 45)] })]).recommendation,
    'manual_review',
  );
  eq(
    'evidence_level eq matches',
    evaluateRules(signals({ evidence_level: 'extensive' }), [rule({ action: 'deny', conditions: [cond('evidence_level', 'eq', 'extensive')] })]).recommendation,
    'deny',
  );
  eq(
    'has_sufficient_data eq matches',
    evaluateRules(signals({ has_sufficient_data: true }), [rule({ action: 'approve', conditions: [cond('has_sufficient_data', 'eq', true)] })]).recommendation,
    'approve',
  );
}

// Every field declares operators; every declared operator is one the engine handles.
{
  const ENGINE_OPS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'not_contains', 'contains_any']);
  const allValid = RULE_FIELDS.every((f) => f.operators.length > 0 && f.operators.every((o) => ENGINE_OPS.has(o)));
  check('every field maps only to engine-supported operators', allValid);
  check('operatorsForField returns [] for unknown field', operatorsForField('nope').length === 0);
}

// ---------------------------------------------------------------------------
// 8. IdentitySignals contract — all required derived fields present + typed
// ---------------------------------------------------------------------------

console.log('8. IdentitySignals contract');

{
  const REQUIRED: Array<keyof IdentitySignals> = [
    'confidence_grade',
    'network_claim_count',
    'merchant_claim_count',
    'days_since_last_claim',
    'has_cross_merchant_identity',
    'network_merchant_count',
    'claim_types',
    'order_value_usd',
    'account_age_days',
    'is_network_flagged',
    'evidence_score',
    'evidence_level',
    'has_sufficient_data',
  ];
  const s = signals();
  for (const key of REQUIRED) {
    check(`IdentitySignals has '${key}'`, Object.prototype.hasOwnProperty.call(s, key));
  }
}

// ---------------------------------------------------------------------------
// 9. Widget signal mapping (identity resolution -> rules engine input)
// ---------------------------------------------------------------------------

console.log('9. Widget -> IdentitySignals mapping');

{
  const widgetData = {
    confidenceGrade: 'definite',
    matchedOn: ['email address'],
    ce3EvidenceAvailable: true,
    thisStore: { claimCount: 2, claimRate: 0.1, lastClaimAt: '2026-05-01T00:00:00.000Z', ordersCountSource: 'network' },
    network: { claimCount: 9, merchantCount: 4, lastClaimAt: '2026-06-01T00:00:00.000Z' },
    storeClaimValue: null,
    storeRecentClaimCount: 1,
    profileUrl: '',
    dataFreshAt: '2026-06-10T00:00:00.000Z',
    watchlisted: false,
  } as unknown as ClaimWidgetData;

  const nowMs = Date.parse('2026-06-17T00:00:00.000Z');
  const s = widgetDataToSignals(widgetData, nowMs);
  eq('maps confidence_grade', s.confidence_grade, 'definite');
  eq('maps network_claim_count', s.network_claim_count, 9);
  eq('maps merchant_claim_count', s.merchant_claim_count, 2);
  eq('derives has_cross_merchant_identity from merchantCount>1', s.has_cross_merchant_identity, true);
  eq('maps network_merchant_count', s.network_merchant_count, 4);
  // days_since_last_claim uses the most-recent of store/network last claim (network = 2026-06-01)
  eq('days_since_last_claim from most-recent claim', s.days_since_last_claim, 16);
  // Fields not available in widget context fall back to neutral defaults
  eq('order_value_usd neutral default', s.order_value_usd, null);
  eq('account_age_days neutral default', s.account_age_days, null);
  eq('is_network_flagged neutral default', s.is_network_flagged, false);
  eq('evidence_score neutral default', s.evidence_score, 0);
  eq('evidence_level neutral default', s.evidence_level, 'minimal');
  eq('has_sufficient_data neutral default', s.has_sufficient_data, false);
  check('claim_types neutral default', Array.isArray(s.claim_types) && s.claim_types.length === 0);

  // No network -> safe defaults, no throw
  const noNet = widgetDataToSignals({ ...widgetData, network: null } as ClaimWidgetData, nowMs);
  eq('no-network network_claim_count', noNet.network_claim_count, 0);
  eq('no-network has_cross_merchant_identity', noNet.has_cross_merchant_identity, false);

  // A null confidence grade degrades to 'weak' rather than throwing.
  const noGrade = widgetDataToSignals({ ...widgetData, confidenceGrade: null } as ClaimWidgetData, nowMs);
  eq('null grade -> weak', noGrade.confidence_grade, 'weak');
}

// ---------------------------------------------------------------------------
// 10. Recommendation formatting for the native widget fields
// ---------------------------------------------------------------------------

console.log('10. Recommendation formatting');

{
  // no_match, no rules configured -> setup prompt
  const noRules = formatRecommendationFields({ recommendation: 'no_match', rule_name: null, justification_lines: [] }, 0);
  check('no rules -> setup prompt heading', /no rules configured/i.test(noRules.recommendation));
  check('no rules -> setup prompt detail', /set up.*rules/i.test(noRules.recommendation_detail));

  // no_match, rules exist -> neutral "no rule matched"
  const noMatch = formatRecommendationFields({ recommendation: 'no_match', rule_name: null, justification_lines: [] }, 3);
  check('rules exist, none matched -> neutral heading', /no rule matched/i.test(noMatch.recommendation));

  // matched rule -> action label + rule name + justification detail
  const matched = formatRecommendationFields(
    { recommendation: 'manual_review', rule_name: 'Serial Network Abuser', justification_lines: ['Rule "Serial Network Abuser" triggered', 'cross-network claim count is at least 3 (actual: 5)'] },
    3,
  );
  check('matched -> action label present', /manual review/i.test(matched.recommendation));
  check('matched -> rule name present', matched.recommendation.includes('Serial Network Abuser'));
  check('matched -> justification in detail', matched.recommendation_detail.includes('actual: 5'));
  check('matched -> based on merchant rules', /based on your configured rules/i.test(matched.recommendation_detail));
}

// ---------------------------------------------------------------------------
// 10b. Gorgias sidebar widget field order (identity before recommendation)
// ---------------------------------------------------------------------------

console.log('10b. Gorgias sidebar widget field order');

{
  const paths = buildGorgiasSidebarWidgetTemplate('https://app.unauth.test')
    .widgets[0].widgets.map((w: { path: string }) => w.path);
  const identityIdx = paths.indexOf('identity');
  const claimsIdx = paths.indexOf('claims');
  const recommendationIdx = paths.indexOf('recommendation');
  const recommendationDetailIdx = paths.indexOf('recommendation_detail');
  check('identity field present', identityIdx >= 0);
  check('recommendation below identity', recommendationIdx > identityIdx);
  check('recommendation below claim history', recommendationIdx > claimsIdx);
  check('recommendation_detail follows recommendation', recommendationDetailIdx === recommendationIdx + 1);
  check('recommendation fields are last rows', recommendationDetailIdx === paths.length - 1);
}

// ---------------------------------------------------------------------------
// 11. Copy guarantee — output never implies Unauth makes the decision
// ---------------------------------------------------------------------------

console.log('11. "Unauth never decides" copy guarantee');

{
  // Forbidden phrasings that would imply Unauth owns the verdict.
  const FORBIDDEN = [/unauth recommends/i, /we recommend/i, /unauth (?:approves|denies|decides|flags)/i];

  // Sample a broad spread of engine + formatter outputs and assert none use forbidden copy.
  const outputs: string[] = [];
  for (const action of ['approve', 'manual_review', 'deny'] as const) {
    const r = evaluateRules(signals({ network_claim_count: 5 }), [
      rule({ name: 'Test Rule', action, conditions: [cond('network_claim_count', 'gte', 3)] }),
    ]);
    outputs.push(r.justification, ...r.justification_lines);
    const fmt = formatRecommendationFields(r, 1);
    outputs.push(fmt.recommendation, fmt.recommendation_detail);
  }
  const noMatchFmt = formatRecommendationFields({ recommendation: 'no_match', rule_name: null, justification_lines: [] }, 0);
  outputs.push(noMatchFmt.recommendation, noMatchFmt.recommendation_detail);

  const offending = outputs.filter((o) => FORBIDDEN.some((re) => re.test(o)));
  check('no engine/formatter output implies Unauth decides', offending.length === 0);
  if (offending.length) console.error('    offending:', offending);

  // formatValue helper renders without claiming a verdict.
  eq('formatValue money', formatValue('order_value_usd', 1234), '$1,234');
  eq('formatValue boolean', formatValue('is_network_flagged', true), 'yes');
}

// ---------------------------------------------------------------------------
// 12. API route source invariants (static assertions, no live DB)
// ---------------------------------------------------------------------------

console.log('12. API route source invariants');

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

{
  const evalRoute = readSrc('app/api/rules/evaluate/route.ts');
  check('evaluate resolves merchant from token, not body', evalRoute.includes('auth.merchantId') && !/merchantId:\s*parsed\.data/.test(evalRoute));
  check('evaluate runs runRuleEvaluation (fetch+evaluate+audit)', evalRoute.includes('runRuleEvaluation'));

  const store = readSrc('lib/rules/store.ts');
  check('runRuleEvaluation fetches active rules fresh', store.includes('fetchActiveMerchantRules'));
  check('runRuleEvaluation always writes audit (incl no_match)', store.includes('writeRuleEvaluationAudit'));
  check('audit row stores all_rules_evaluated', store.includes('all_rules_evaluated'));
  check('audit write failure does not throw', /console\.error\([^)]*rule_evaluations/.test(store));

  const idRoute = readSrc('app/api/rules/[id]/route.ts');
  check('PATCH scopes update to merchant', /\.update\(update\)[\s\S]*?\.eq\('merchant_id', ctx\.merchantId\)/.test(idRoute));
  check('DELETE scopes delete to merchant', /\.delete\(\)[\s\S]*?\.eq\('merchant_id', ctx\.merchantId\)/.test(idRoute));

  const listRoute = readSrc('app/api/rules/route.ts');
  check('GET scopes to merchant_id', listRoute.includes(".eq('merchant_id', ctx.merchantId)"));
  check('POST validates conditions', listRoute.includes('validateConditions'));

  const reorder = readSrc('app/api/rules/reorder/route.ts');
  check('reorder scopes each write to merchant', reorder.includes("eq('merchant_id', ctx.merchantId)"));

  const widgetRoute = readSrc('app/api/gorgias/widget/route.ts');
  check('widget evaluates after identity resolution (inside result.ok)', /if \(result\.ok\)[\s\S]*?evaluateRules/.test(widgetRoute));
  check('widget rules evaluation fails silently (try/catch)', /try \{[\s\S]*?evaluateRules[\s\S]*?\} catch/.test(widgetRoute));
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log('');
if (failures.length === 0) {
  console.log(`✓ verify:rules — all ${passed} checks passed`);
  process.exit(0);
} else {
  console.error(`✗ verify:rules — ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.error(`   - ${f}`);
  process.exit(1);
}
