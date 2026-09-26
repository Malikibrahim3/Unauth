import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RecoveryRulebookClient } from '@/components/rules/RecoveryRulebookClient';
import { getRequestUser } from '@/lib/auth/requestContext';
import { listPartnerRecoveryRules, listPartners } from '@/lib/partners/store';
import { hasPermission, PERMISSIONS, requirePermission } from '@/lib/permissions';
import { createServiceClient } from '@/lib/supabase/server';
import { acceptanceScenarioFromHeaders, throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export const dynamic = 'force-dynamic';

export default async function RecoveryRulesPage() {
  await throwForAcceptanceScenario('recovery-rulebook-error');
  const acceptanceScenario = await acceptanceScenarioFromHeaders();
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/overview');
  const [loadedPartners, loadedRules, canManage] = await Promise.all([
    listPartners(serviceClient, ctx.merchantId),
    listPartnerRecoveryRules(serviceClient, ctx.merchantId),
    hasPermission(serviceClient, ctx, PERMISSIONS.MANAGE_SETTINGS),
  ]);
  const partners = acceptanceScenario === 'recovery-rulebook-empty' ? [] : loadedPartners;
  const rules = acceptanceScenario === 'recovery-rulebook-empty' ? [] : loadedRules;
  const routedPartners = partners.filter((partner) => rules.some((rule) => rule.partner_id === partner.id && rule.active)).length;

  return (
    <>
      <h1 data-reference-ignore="accessibility-heading" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Recovery rulebook</h1>
      <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ font: "400 17px/1 'IBM Plex Mono',monospace", color: '#1c1f23' }}>{routedPartners}</span><span style={{ font: "400 11.5px/1 'Inter',sans-serif", color: '#64686d' }}>partners with a route</span></div>
        <div style={{ width: 1, height: 22, background: '#eae8e5' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ font: "400 17px/1 'IBM Plex Mono',monospace", color: '#40454a' }}>{rules.length}</span><span style={{ font: "400 11.5px/1 'Inter',sans-serif", color: '#64686d' }}>claim rules</span></div>
        <div style={{ width: 1, height: 22, background: '#eae8e5' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ font: "400 17px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>—</span><span style={{ font: "400 11.5px/1 'Inter',sans-serif", color: '#64686d' }}>routes with no evidence source</span></div>
        <div style={{ flex: 1 }} />
        {canManage ? <><Link href="/controls/rules/recovery?modal=partner" style={{ padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', font: "400 12.5px/1 'Inter',sans-serif", color: '#40454a', textDecoration: 'none' }}>Add a partner</Link><Link href="/controls/rules/recovery?modal=rule" style={{ padding: '6px 11px', borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>New claim rule</Link></> : null}
      </div>
      <RecoveryRulebookClient partners={partners} rules={rules} canManage={canManage} />
    </>
  );
}
