import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import ChromeSetupClient from '@/components/settings/ChromeSetupClient';
import { ConnectorSetupShell } from '@/components/settings/ConnectorSetupShell';
import { ButtonLink, PageFrame } from '@/components/ui';

export default async function ChromeIntegrationPage({ returnTo }: { returnTo?: string }) {
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/sources/connected');

  const { data: keys } = await service
    .from(TABLES.MERCHANT_API_KEYS)
    .select('key_prefix')
    .eq('merchant_id', ctx.merchantId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false }) as unknown as {
    data: Array<{ key_prefix: string }> | null;
  };

  const keyPrefixes = (keys ?? []).map((k) => k.key_prefix);

  return (
    <PageFrame
      surfaceId="provider-specific-connector-setup"
      archetype="P3-connector-setup"
      title="Connect Chrome extension"
      breadcrumbs={[{ label: 'Sources', href: '/sources/connected' }, { label: 'Chrome extension' }]}
      actions={<><ButtonLink href={returnTo ?? '/sources/chrome'} variant="secondary" size="sm">Cancel setup</ButtonLink><ButtonLink href="#connector-setup-form" size="sm">Continue</ButtonLink></>}
    >
      <ConnectorSetupShell
        provider="Chrome extension"
        requirements="A current API key is required. The extension is installed manually while the Chrome Web Store listing is pending."
        currentStage="prepare"
        returnHref={returnTo}
      >
        <ChromeSetupClient hasApiKeys={keyPrefixes.length > 0} keyPrefixes={keyPrefixes} />
      </ConnectorSetupShell>
    </PageFrame>
  );
}
