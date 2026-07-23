import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { listNotificationPreferences } from '@/lib/collaboration/notificationPreferences';
import { NotificationPreferencesForm } from '@/components/settings/NotificationPreferencesForm';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';

export default async function NotificationPreferencesPage() {
  const user = await getRequestUser(); if (!user) redirect('/login');
  const service = createServiceClient(); const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_INBOX); if (denied || !ctx) redirect('/dashboard');
  const values = await listNotificationPreferences(service, ctx.merchantId, user.id);
  return (
    <SettingsPageShell
      eyebrow="Personal settings"
      title="Notification preferences"
      subtitle="Choose which typed operational events create an in-app item for your account. Preferences never change another team member’s inbox."
      breadcrumbs={[{ label: 'Notifications', href: '/notifications' }, { label: 'Preferences' }]}
    >
      <NotificationPreferencesForm initial={values} />
    </SettingsPageShell>
  );
}
