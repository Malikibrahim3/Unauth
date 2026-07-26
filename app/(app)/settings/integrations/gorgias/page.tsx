import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import GorgiasSetupClient from '@/components/settings/GorgiasSetupClient';
import GorgiasSupportSyncClient from '@/components/settings/GorgiasSupportSyncClient';
import { SettingsPageShell } from '@/components/ui';
import Link from 'next/link';

export default async function GorgiasIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const requestedReturnTo = (await searchParams).returnTo;
  const returnTo = requestedReturnTo === '/onboarding' ? '/onboarding' : null;

  const service = createServiceClient();
  const { denied } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/settings');

  const manageCheck = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  const canManageGorgias = !manageCheck.denied;

  return (
    <SettingsPageShell
      title="Gorgias"
      subtitle="Show payout case context, evidence gaps, and recommendations on support tickets."
    >
      <div className="space-y-3">
        {returnTo && (
          <div className="flex justify-end">
            <Link
              href={returnTo}
              className="inline-flex h-8 items-center rounded-[var(--ua-radius-control)] border px-3 text-[length:var(--ua-text-micro-size)] font-semibold"
              style={{ borderColor: 'var(--ua-border-default)', color: 'var(--ua-text-primary)' }}
            >
              Return to onboarding
            </Link>
          </div>
        )}
        <GorgiasSupportSyncClient canManage={canManageGorgias} />
        <GorgiasSetupClient />
      </div>
    </SettingsPageShell>
  );
}
