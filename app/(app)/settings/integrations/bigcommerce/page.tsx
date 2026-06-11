import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Store } from 'lucide-react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import BigCommerceConnectClient from '@/components/settings/BigCommerceConnectClient';
import { PROVIDER_BRAND_COLOURS } from '@/components/settings/providerBrand';

export default async function BigCommerceIntegrationPage() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { denied } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/settings');

  const manageCheck = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  const canManage = !manageCheck.denied;

  return (
    <div className="space-y-8 p-8 max-w-2xl">
      <div>
        <Link
          href="/settings/integrations"
          className="mb-4 inline-flex items-center gap-1.5 text-xs hover:underline"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← Integrations
        </Link>
        <div className="flex items-center gap-3">
          <Store className="h-5 w-5" style={{ color: PROVIDER_BRAND_COLOURS.bigcommerce }} />
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>
            Connect BigCommerce
          </h1>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Authorize via OAuth to sync orders and refunds into audit transactions.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>}>
        <BigCommerceConnectClient canManage={canManage} />
      </Suspense>
    </div>
  );
}
