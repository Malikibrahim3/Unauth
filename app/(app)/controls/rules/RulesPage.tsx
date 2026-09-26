import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PayoutRulesOperations, NewPayoutRuleLink, type RuleIndexRecord } from '@/components/rules/PayoutRulesOperations';
import { getRequestServiceClient, getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { hasPermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import type { ConditionOperator, RuleAction, RuleCondition } from '@/lib/rules-engine';
import { TABLES } from '@/lib/supabase/tables';
import { acceptanceScenarioFromHeaders, throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export const dynamic = 'force-dynamic';

type RuleRow = { id: string; name: string; description: string | null; priority: number; updated_at: string };
type RuleVersionSummary = { id: string; merchant_rule_id: string; version: number; status: string; name: string; description: string | null; conditions: RuleCondition[]; action: RuleAction; condition_operator: ConditionOperator; priority: number; created_at: string; published_at: string | null };

export default async function RulesPage() {
  await throwForAcceptanceScenario('rules-error');
  const acceptanceScenario = await acceptanceScenarioFromHeaders();
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_SETTINGS);
  if (!ctx) redirect(await resolveDefaultAppPath(service, user.id));
  const [rulesResult, versionsResult, canManage] = await Promise.all([
    service.from(TABLES.MERCHANT_RULES).select('id,name,description,priority,updated_at').eq('merchant_id', ctx.merchantId).is('archived_at', null).order('priority'),
    service.from(TABLES.MERCHANT_RULE_VERSIONS).select('id,merchant_rule_id,version,status,name,description,conditions,action,condition_operator,priority,created_at,published_at').eq('merchant_id', ctx.merchantId).order('version', { ascending: false }),
    hasPermission(service, ctx, PERMISSIONS.MANAGE_SETTINGS),
  ]);
  const versions = acceptanceScenario === 'rules-empty-state' ? [] : (versionsResult.data ?? []) as RuleVersionSummary[];
  const ruleRows = acceptanceScenario === 'rules-empty-state' ? [] : (rulesResult.data ?? []) as RuleRow[];
  const rules: RuleIndexRecord[] = ruleRows.map((rule) => {
    const history = versions.filter((version) => version.merchant_rule_id === rule.id);
    const draft = history.find((version) => version.status === 'draft');
    const published = history.find((version) => version.status === 'published');
    const current = draft ?? published ?? history[0];
    return {
      id: rule.id,
      name: current?.name ?? rule.name,
      description: current?.description ?? rule.description,
      priority: current?.priority ?? rule.priority,
      currentVersion: current?.version ?? null,
      currentVersionId: current?.id ?? null,
      currentStatus: (current?.status ?? 'disabled') as RuleIndexRecord['currentStatus'],
      hasDraft: Boolean(draft),
      publishedVersion: published?.version ?? null,
      updatedAt: current?.created_at ?? rule.updated_at,
      action: current?.action ?? 'manual_review',
      conditions: current?.conditions ?? [],
      conditionOperator: current?.condition_operator ?? 'and',
    };
  });
  const firstRule = [...rules].sort((left, right) => left.priority - right.priority)[0];

  return (
    <>
      <h1 data-reference-ignore="accessibility-heading" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Payout rules</h1>
      <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ font: "400 17px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>—</span><span style={{ font: "400 11.5px/1 'Inter',sans-serif", color: '#64686d' }}>claims entered the rules in 30 days</span></div>
        <div style={{ width: 1, height: 22, background: '#eae8e5' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ font: "400 17px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>—</span><span style={{ font: "400 11.5px/1 'Inter',sans-serif", color: '#64686d' }}>decided without a human</span></div>
        <div style={{ width: 1, height: 22, background: '#eae8e5' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ font: "400 17px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>—</span><span style={{ font: "400 11.5px/1 'Inter',sans-serif", color: '#64686d' }}>fell through to Work</span></div>
        <div style={{ flex: 1 }} />
        {firstRule ? <Link href={`/controls/rules/${firstRule.id}?tab=logic`} style={{ padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', font: "400 12.5px/1 'Inter',sans-serif", color: '#40454a', textDecoration: 'none' }}>Simulate on last 30 days</Link> : <span aria-disabled="true" style={{ padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.07)', font: "400 12.5px/1 'Inter',sans-serif", color: '#64686d' }}>Simulate on last 30 days</span>}
        {canManage ? <NewPayoutRuleLink /> : null}
      </div>
      <PayoutRulesOperations rules={rules} canManage={canManage} />
    </>
  );
}
