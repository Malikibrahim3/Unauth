import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import ZendeskSetupClient from '@/components/settings/ZendeskSetupClient';
import { ConnectorSetupShell } from '@/components/settings/ConnectorSetupShell';
import { ButtonLink, PageFrame } from '@/components/ui';

export default async function ZendeskIntegrationPage({ returnTo }: { returnTo?: string }) {
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { denied } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/sources/connected');
  const manage = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  const canManage = !manage.denied;

  return (
    <PageFrame
      surfaceId="provider-specific-connector-setup"
      archetype="P3-connector-setup"
      title="Connect Zendesk"
      breadcrumbs={[{ label: 'Sources', href: '/sources/connected' }, { label: 'Zendesk' }]}
      actions={<><ButtonLink href={returnTo ?? '/sources/zendesk'} variant="secondary" size="sm">Cancel setup</ButtonLink><ButtonLink href="#connector-setup-form" size="sm">Continue</ButtonLink></>}
    >
      <ConnectorSetupShell
        provider="Zendesk"
        providerMark="/providers/zendesk.svg"
        requirements="You need Zendesk admin access to install the private app, add the ticket webhook, and create a token for ticket history."
        returnHref={returnTo}
      >
        <ZendeskSetupClient canManage={canManage} />
      </ConnectorSetupShell>
    </PageFrame>
  );
}
