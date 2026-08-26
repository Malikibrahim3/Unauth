import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { hasPermission, PERMISSIONS, requirePermission } from '@/lib/permissions';
import { ButtonLink, PageFrame } from '@/components/ui';
import { listPartnerRecoveryRules, listPartners } from '@/lib/partners/store';
import { RecoveryRulebookClient } from '@/components/rules/RecoveryRulebookClient';

export const dynamic = 'force-dynamic';

export default async function RecoveryRulesPage() {
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/overview');

  const [partners, rules, canManage] = await Promise.all([
    listPartners(serviceClient, ctx.merchantId),
    listPartnerRecoveryRules(serviceClient, ctx.merchantId),
    hasPermission(serviceClient, ctx, PERMISSIONS.MANAGE_SETTINGS),
  ]);

  return (
    <PageFrame
      title="Recovery rulebook"
      subtitle="Partner agreements turned into consistent recovery instructions: who to claim from, which evidence they require, how long the window is, and what happens when no agreement exists."
      breadcrumbs={[
        { label: 'Controls', href: '/controls' },
        { label: 'Payout rules', href: '/controls/rules' },
        { label: 'Recovery rulebook' },
      ]}
      showCurrentBreadcrumb
      actions={canManage ? <><ButtonLink href="/controls/rules/recovery?modal=partner" variant="secondary" size="sm">New partner</ButtonLink><ButtonLink href="/controls/rules/recovery?modal=rule" variant="primary" size="sm">New recovery rule</ButtonLink></> : undefined}
      surfaceId="recovery-rulebook"
      archetype="P8"
    >
        <RecoveryRulebookClient
          partners={partners}
          rules={rules}
          canManage={canManage}
        />
    </PageFrame>
  );
}
