import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import ChromeSetupClient from '@/components/settings/ChromeSetupClient';
import { SettingsPageShell } from '@/components/ui';

export default async function ChromeIntegrationPage() {
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/settings');

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
    <SettingsPageShell
      title="Chrome Extension"
      subtitle="Look up any customer email from any tab — Gorgias, Zendesk, Shopify, Gmail."
    >
      <div className="space-y-3">
        <ChromeSetupClient hasApiKeys={keyPrefixes.length > 0} keyPrefixes={keyPrefixes} />
      </div>
    </SettingsPageShell>
  );
}
