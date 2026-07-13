import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { hasPermission, PERMISSIONS, requirePermission } from '@/lib/permissions';
import { WorkbenchPage } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { listPartnerRecoveryRules, listPartners } from '@/lib/partners/store';
import { PartnerRulebookClient } from '@/app/(app)/partners/PartnerRulebookClient';
import { formatNumber } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export default async function PartnersPage() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/dashboard');

  const [partners, rules, canManage] = await Promise.all([
    listPartners(serviceClient, ctx.merchantId),
    listPartnerRecoveryRules(serviceClient, ctx.merchantId),
    hasPermission(serviceClient, ctx, PERMISSIONS.MANAGE_SETTINGS),
  ]);

  return (
    <WorkbenchPage
      eyebrow="Partner rulebook"
      title="Partners"
      subtitle="Define the carriers, 3PLs, warehouses, suppliers, and internal teams that can own recovery routes."
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="partners"
      kpiItems={[
        { label: 'Partners', value: formatNumber(partners.length), hint: 'Configured owners' },
        { label: 'Active rules', value: formatNumber(rules.filter((rule) => rule.active).length), hint: 'Used for recovery estimates' },
        { label: 'Default rules', value: formatNumber(rules.filter((rule) => !rule.partner_id).length), hint: 'Apply without a specific partner' },
        { label: 'Evidence routes', value: formatNumber(new Set(rules.flatMap((rule) => rule.required_evidence)).size), hint: 'Unique required evidence items' },
      ]}
      main={<PartnerRulebookClient partners={partners} rules={rules} canManage={canManage} />}
    />
  );
}
