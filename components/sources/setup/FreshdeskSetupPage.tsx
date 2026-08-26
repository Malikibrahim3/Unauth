import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import FreshdeskSupportSyncClient from '@/components/settings/FreshdeskSupportSyncClient';
import { ConnectorSetupShell } from '@/components/settings/ConnectorSetupShell';
import { ButtonLink, PageFrame } from '@/components/ui';

export default async function FreshdeskIntegrationPage({ returnTo }: { returnTo?: string }) {
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { denied } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/sources/connected');

  const manageCheck = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  const canManageFreshdesk = !manageCheck.denied;

  return (
    <PageFrame
      surfaceId="provider-specific-connector-setup"
      archetype="P3-connector-setup"
      title="Connect Freshdesk"
      breadcrumbs={[{ label: 'Sources', href: '/sources/connected' }, { label: 'Freshdesk' }]}
      actions={<><ButtonLink href={returnTo ?? '/sources/freshdesk'} variant="secondary" size="sm">Cancel setup</ButtonLink><ButtonLink href="#connector-setup-form" size="sm">Continue</ButtonLink></>}
    >
      <ConnectorSetupShell
        provider="Freshdesk"
        providerMark="/providers/freshdesk.png"
        requirements="You need a Freshdesk domain, an API key with ticket access, and permission to add the provider webhook."
        returnHref={returnTo}
      >
        <FreshdeskSupportSyncClient canManage={canManageFreshdesk} />
      </ConnectorSetupShell>
    </PageFrame>
  );
}
