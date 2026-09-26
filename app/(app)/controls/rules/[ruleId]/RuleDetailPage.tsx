import { notFound, redirect } from 'next/navigation';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import { RuleVersionWorkbench, type RuleVersionRecord } from '@/components/rules/RuleVersionWorkbench';
import { getRequestServiceClient, getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';

export const dynamic = 'force-dynamic';

export default async function RuleDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_SETTINGS);
  if (!ctx) redirect('/overview');
  const { id } = await params;
  const [ruleResult, versionsResult, canManage] = await Promise.all([
    service.from(TABLES.MERCHANT_RULES).select('id,name,description').eq('merchant_id', ctx.merchantId).eq('id', id).is('archived_at', null).maybeSingle(),
    service.from(TABLES.MERCHANT_RULE_VERSIONS).select('*').eq('merchant_id', ctx.merchantId).eq('merchant_rule_id', id).order('version', { ascending: false }),
    hasPermission(service, ctx, PERMISSIONS.MANAGE_SETTINGS),
  ]);
  if (!ruleResult.data) notFound();
  const versions = (versionsResult.data ?? []) as unknown as RuleVersionRecord[];
  if (!versions.length) notFound();
  const display = versions.find((version) => version.status === 'draft') ?? versions.find((version) => version.status === 'published') ?? versions[0]!;

  return (
    <section data-screen-label="Edit rule" data-visual-world="supplied-package" data-surface-id="rule-version-workbench" data-archetype="P8" style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', color: '#1c1f23' }}>
      <SetBreadcrumbLabel label={display.name} />
      <h1 style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Edit rule</h1>
      <RuleVersionWorkbench ruleId={id} initialVersions={versions} canManage={canManage} />
    </section>
  );
}
