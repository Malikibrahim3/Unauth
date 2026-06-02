import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LifeBuoy } from 'lucide-react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import FreshdeskSupportSyncClient from '@/components/settings/FreshdeskSupportSyncClient';

export default async function FreshdeskIntegrationPage() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { denied } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/settings');

  const manageCheck = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  const canManageFreshdesk = !manageCheck.denied;

  return (
    <div className="space-y-8 p-8 max-w-2xl">
      <div>
        <Link
          href="/settings/integrations"
          className="mb-4 inline-flex items-center gap-1.5 text-xs hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Integrations
        </Link>
        <div className="flex items-center gap-3">
          <LifeBuoy className="h-5 w-5" style={{ color: '#25C16F' }} />
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>
            Connect Freshdesk
          </h1>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Ingest support tickets for claim detection and dispute context.
        </p>
      </div>

      <FreshdeskSupportSyncClient canManage={canManageFreshdesk} />
    </div>
  );
}
