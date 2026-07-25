import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { hasPermission, PERMISSIONS, requirePermission } from '@/lib/permissions';
import { WorkbenchPage } from '@/components/ui';
import { listPartnerRecoveryRules, listPartners } from '@/lib/partners/store';
import { RecoveryRulebookClient } from '@/components/rules/RecoveryRulebookClient';
import { formatNumber } from '@/lib/utils/format';
import { TABLES } from '@/lib/supabase/tables';
import { isInvestigationEmailDispatchEnabled } from '@/lib/investigations/flags';

export const dynamic = 'force-dynamic';

export default async function RecoveryRulesPage() {
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/dashboard');

  const [partners, rules, canManage, merchantSettings] = await Promise.all([
    listPartners(serviceClient, ctx.merchantId),
    listPartnerRecoveryRules(serviceClient, ctx.merchantId),
    hasPermission(serviceClient, ctx, PERMISSIONS.MANAGE_SETTINGS),
    serviceClient
      .from(TABLES.MERCHANTS)
      .select('investigation_response_sla_hours,investigation_reply_to,investigation_email_enabled')
      .eq('id', ctx.merchantId)
      .single(),
  ]);
  if (merchantSettings.error) {
    throw new Error(`Unable to load investigation settings: ${merchantSettings.error.message}`);
  }

  return (
    <WorkbenchPage
      title="Recovery rules"
      subtitle="Define the carriers, 3PLs, warehouses, suppliers, and internal teams that can own recovery routes."
      kpiItems={[
        { label: 'Partners', value: formatNumber(partners.length), hint: 'Configured owners' },
        { label: 'Active rules', value: formatNumber(rules.filter((rule) => rule.active).length), hint: 'Used for recovery estimates' },
        { label: 'Default rules', value: formatNumber(rules.filter((rule) => !rule.partner_id).length), hint: 'Apply without a specific partner' },
        { label: 'Evidence routes', value: formatNumber(new Set(rules.flatMap((rule) => rule.required_evidence)).size), hint: 'Unique required evidence items' },
      ]}
      main={(
        <RecoveryRulebookClient
          partners={partners}
          rules={rules}
          canManage={canManage}
          investigationSettings={merchantSettings.data}
          emailDispatchAvailable={isInvestigationEmailDispatchEnabled()}
        />
      )}
    />
  );
}
