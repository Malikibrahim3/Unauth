import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import GorgiasSetupClient from '@/components/settings/GorgiasSetupClient';
import GorgiasSupportSyncClient from '@/components/settings/GorgiasSupportSyncClient';
import { ConnectorSetupShell } from '@/components/settings/ConnectorSetupShell';
import { ButtonLink, PageFrame } from '@/components/ui';

export default async function GorgiasIntegrationPage({
  returnTo,
}: {
  returnTo?: string;
}) {
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { denied } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/sources/connected');

  const manageCheck = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  const canManageGorgias = !manageCheck.denied;

  return (
    <PageFrame
      surfaceId="provider-specific-connector-setup"
      archetype="P3-connector-setup"
      title="Connect Gorgias"
      breadcrumbs={[{ label: 'Sources', href: '/sources/connected' }, { label: 'Gorgias' }]}
      actions={<><ButtonLink href={returnTo ?? '/sources/gorgias'} variant="secondary" size="sm">Cancel setup</ButtonLink><ButtonLink href="#connector-setup-form" size="sm">Continue</ButtonLink></>}
    >
      <ConnectorSetupShell
        provider="Gorgias"
        providerMark="/providers/gorgias.png"
        requirements="Use a Gorgias account, an API user email and key, plus permission to create the HTTP integration used for ticket updates."
        returnHref={returnTo}
      >
        <GorgiasSupportSyncClient canManage={canManageGorgias} />
        <GorgiasSetupClient />
      </ConnectorSetupShell>
    </PageFrame>
  );
}
