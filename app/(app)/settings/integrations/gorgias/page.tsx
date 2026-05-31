import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import GorgiasSetupClient from '@/components/settings/GorgiasSetupClient';
import GorgiasSupportSyncClient from '@/components/settings/GorgiasSupportSyncClient';

export default async function GorgiasIntegrationPage() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { denied } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/settings');

  const manageCheck = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  const canManageGorgias = !manageCheck.denied;

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
          <MessageSquare className="h-5 w-5" style={{ color: '#FF6B35' }} />
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>
            Connect Gorgias
          </h1>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Show identity confidence and claims history on every support ticket.
        </p>
      </div>

      <GorgiasSupportSyncClient canManage={canManageGorgias} />

      <GorgiasSetupClient />
    </div>
  );
}
