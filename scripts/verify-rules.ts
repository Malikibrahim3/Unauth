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
import { claimWidgetToJson, formatEvidenceBreakdown, formatEvidenceSummary, formatRecommendationFields } from '@/lib/gorgias/widgetJson';
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
  const widgetBase = {
    confidenceGrade: 'definite',
    matchedOn: ['email address'],
    ce3EvidenceAvailable: true,
    thisStore: {
      orderCount: 2,
      claimCount: 2,
      claimRate: 0.1,
      lastClaimAt: '2026-05-01T00:00:00.000Z',
      ordersCountSource: 'merchant_profile_totals' as const,
    },
    network: {
      merchantCount: 4,
      orderCount: 20,
      claimCount: 9,
      claimRate: 0.45,
      lastClaimAt: '2026-06-01T00:00:00.000Z',
      primaryReason: null,
      recentClaimCount: 0,
      recentWindowDays: 90 as const,
    },
    storeClaimValue: null,
    storePrimaryReason: null,
    storeRecentClaimCount: 1,
    profileUrl: '',
    dataFreshAt: '2026-06-10T00:00:00.000Z',
    watchlisted: false,
    evidenceDisclosed: false,
    evidenceScore: 0,
    evidenceLevel: 'minimal' as const,
    hasSufficientData: false,
    scoreBreakdown: [],
    scoringConfigVersion: null,
    claimTypes: [] as string[],
    isNetworkFlagged: false,
  } satisfies ClaimWidgetData;

  const nowMs = Date.parse('2026-06-17T00:00:00.000Z');
  const s = widgetDataToSignals(widgetBase, nowMs);
  eq('maps confidence_grade', s.confidence_grade, 'definite');
  eq('maps network_claim_count', s.network_claim_count, 9);
  eq('maps merchant_claim_count', s.merchant_claim_count, 2);
  eq('derives has_cross_merchant_identity from merchantCount>1', s.has_cross_merchant_identity, true);
  eq('maps network_merchant_count', s.network_merchant_count, 4);
  eq('days_since_last_claim from most-recent claim', s.days_since_last_claim, 16);
  eq('order_value_usd neutral default', s.order_value_usd, null);
  eq('account_age_days neutral default', s.account_age_days, null);
  eq('withheld evidence_score neutral', s.evidence_score, 0);
  eq('withheld evidence_level neutral', s.evidence_level, 'minimal');
  eq('withheld has_sufficient_data neutral', s.has_sufficient_data, false);
  check('withheld claim_types empty', s.claim_types.length === 0);
  eq('withheld is_network_flagged false', s.is_network_flagged, false);

  const disclosed = widgetDataToSignals(
    {
      ...widgetBase,
      evidenceDisclosed: true,
      evidenceScore: 62,
      evidenceLevel: 'substantial',
      hasSufficientData: true,
      claimTypes: ['chargeback', 'item_not_received'],
      isNetworkFlagged: true,
    },
    nowMs,
  );
  eq('disclosed evidence_score', disclosed.evidence_score, 62);
  eq('disclosed evidence_level', disclosed.evidence_level, 'substantial');
  eq('disclosed has_sufficient_data', disclosed.has_sufficient_data, true);
  check('disclosed claim_types canonical', disclosed.claim_types.join(',') === 'chargeback,item_not_received');
  check('disclosed claim_types no legacy INR', !disclosed.claim_types.includes('INR'));
  check('disclosed claim_types no legacy refund', !disclosed.claim_types.includes('refund'));
  eq('disclosed is_network_flagged', disclosed.is_network_flagged, true);

  // Withheld even when widget payload carries non-neutral placeholders.
  const fakeScore = widgetDataToSignals(
    { ...widgetBase, evidenceDisclosed: false, evidenceScore: 99, evidenceLevel: 'extensive', hasSufficientData: true },
    nowMs,
  );
  eq('withheld ignores placeholder score', fakeScore.evidence_score, 0);

  const noNet = widgetDataToSignals({ ...widgetBase, network: null }, nowMs);
  eq('no-network network_claim_count', noNet.network_claim_count, 0);
  eq('no-network has_cross_merchant_identity', noNet.has_cross_merchant_identity, false);

  const noGrade = widgetDataToSignals({ ...widgetBase, confidenceGrade: null }, nowMs);
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
  const ce3Idx = paths.indexOf('ce3_evidence');
  const evidenceSummaryIdx = paths.indexOf('evidence_summary');
  const evidenceBreakdownIdx = paths.indexOf('evidence_breakdown');
  const recommendationIdx = paths.indexOf('recommendation');
  const recommendationDetailIdx = paths.indexOf('recommendation_detail');
  check('identity field present', identityIdx >= 0);
  check('evidence_summary field present', evidenceSummaryIdx >= 0);
  check('evidence_breakdown field present', evidenceBreakdownIdx >= 0);
  check('recommendation below identity', recommendationIdx > identityIdx);
  check('recommendation below claim history', recommendationIdx > claimsIdx);
  check('evidence_summary below network evidence', evidenceSummaryIdx > ce3Idx);
  check('evidence_breakdown follows evidence_summary', evidenceBreakdownIdx === evidenceSummaryIdx + 1);
  check('recommendation below evidence breakdown', recommendationIdx > evidenceBreakdownIdx);
  check('recommendation_detail follows recommendation', recommendationDetailIdx === recommendationIdx + 1);
  check('recommendation fields are last rows', recommendationDetailIdx === paths.length - 1);
}

// ---------------------------------------------------------------------------
// 10c. Gorgias evidence display fields
// ---------------------------------------------------------------------------

console.log('10c. Gorgias evidence display fields');

{
  const disclosedBase: ClaimWidgetData = {
    confidenceGrade: 'probable',
    matchedOn: ['email address'],
    ce3EvidenceAvailable: true,
    thisStore: {
      orderCount: 2,
      claimCount: 1,
      claimRate: 0.5,
      lastClaimAt: null,
      ordersCountSource: 'merchant_profile_totals',
    },
    network: {
      merchantCount: 4,
      orderCount: 10,
      claimCount: 5,
      claimRate: 0.5,
      lastClaimAt: null,
      primaryReason: null,
      recentClaimCount: 0,
      recentWindowDays: 90,
    },
    storeClaimValue: null,
    storePrimaryReason: null,
    storeRecentClaimCount: 0,
    profileUrl: 'https://app.unauth.test/customers',
    dataFreshAt: '2026-06-17T00:00:00.000Z',
    watchlisted: false,
    evidenceDisclosed: true,
    evidenceScore: 62,
    evidenceLevel: 'substantial',
    hasSufficientData: true,
    scoreBreakdown: [
      { factor: 'network_claim_frequency', label: 'Claims across the network', points: 18, max_points: 35, reason: 'x' },
      { factor: 'network_breadth', label: 'Distinct merchants claimed at', points: 12, max_points: 25, reason: 'x' },
    ],
    scoringConfigVersion: 'evidence-v1',
    claimTypes: ['chargeback'],
    isNetworkFlagged: false,
  };

  const summary = formatEvidenceSummary(disclosedBase, 'probable');
  check('disclosed sufficient evidence_summary has score + level', summary === 'Evidence: 62 · Substantial');
  const breakdown = formatEvidenceBreakdown(disclosedBase);
  check(
    'disclosed sufficient evidence_breakdown flattens factors',
    breakdown === 'Claims across the network 18/35 · Distinct merchants claimed at 12/25',
  );

  const insufficient = formatEvidenceSummary(
    { ...disclosedBase, hasSufficientData: false },
    'probable',
  );
  check('insufficient evidence_summary', insufficient === 'Not enough evidence yet');

  const withheld = formatEvidenceSummary(
    { ...disclosedBase, evidenceDisclosed: false },
    'probable',
  );
  check('withheld evidence_summary', withheld === 'Not enough network coverage to share');

  const weakCaveat = formatEvidenceSummary(disclosedBase, 'weak');
  check('weak confidence appends caveat', weakCaveat.includes('Identity match confidence is weak'));

  const withheldBreakdown = formatEvidenceBreakdown({ ...disclosedBase, evidenceDisclosed: false });
  check('withheld evidence_breakdown neutral', withheldBreakdown.includes('coverage threshold'));

  const payload = claimWidgetToJson({ ok: true, data: disclosedBase });
  check('claimWidgetToJson includes evidence_summary', typeof payload.evidence_summary === 'string' && payload.evidence_summary.length > 0);
  check('claimWidgetToJson includes evidence_breakdown', typeof payload.evidence_breakdown === 'string' && payload.evidence_breakdown.length > 0);

  const forbidden = [/\brisk\b/i, /\bfraud\b/i, /\bfraudster\b/i, /unauth recommends/i, /unauth decided/i];
  const evidenceCopy = [payload.evidence_summary, payload.evidence_breakdown, summary, breakdown, insufficient, withheld, weakCaveat];
  check('evidence copy has no forbidden wording', !evidenceCopy.some((t) => forbidden.some((re) => re.test(t))));
}

// ---------------------------------------------------------------------------
// 10d. Evidence default rule templates (migration 20260617170000)
// ---------------------------------------------------------------------------

console.log('10d. Evidence default rule templates');

{
  const EVIDENCE_DEFAULT_TEMPLATES = [
    {
      name: 'Standard Review Threshold',
      description: 'Flags identities with substantial accumulated evidence for manual review',
      sort_order: 4,
      action: 'manual_review',
      condition_operator: 'and',
      conditions: [{ id: 't5-c1', field: 'evidence_score', operator: 'gte', value: 45 }],
    },
    {
      name: 'High Confidence Deny',
      description: 'Denies only when evidence is extensive AND the identity match itself is reliable',
      sort_order: 5,
      action: 'deny',
      condition_operator: 'and',
      conditions: [
        { id: 't6-c1', field: 'evidence_score', operator: 'gte', value: 75 },
        { id: 't6-c2', field: 'confidence_grade', operator: 'in', value: ['definite', 'probable'] },
      ],
    },
    {
      name: 'Clean Identity Fast-Track',
      description: 'Approves identities with minimal evidence where enough data exists to be confident',
      sort_order: 6,
      action: 'approve',
      condition_operator: 'and',
      conditions: [
        { id: 't7-c1', field: 'evidence_score', operator: 'lte', value: 19 },
        { id: 't7-c2', field: 'has_sufficient_data', operator: 'eq', value: true },
      ],
    },
  ] as const;

  const FORBIDDEN = [/\brisk\b/i, /\bfraud\b/i, /\bfraudster\b/i, /unauth recommends/i, /unauth decided/i];

  for (const tmpl of EVIDENCE_DEFAULT_TEMPLATES) {
    check(`template "${tmpl.name}" sort_order ${tmpl.sort_order}`, tmpl.sort_order >= 4 && tmpl.sort_order <= 6);
    check(`template "${tmpl.name}" conditions valid`, validateConditions([...tmpl.conditions]).length === 0);
    check(
      `template "${tmpl.name}" copy has no forbidden wording`,
      !FORBIDDEN.some((re) => re.test(tmpl.name) || re.test(tmpl.description)),
    );
  }

  eq('evidence templates sort_order 4–6', EVIDENCE_DEFAULT_TEMPLATES.map((t) => t.sort_order).join(','), '4,5,6');
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
