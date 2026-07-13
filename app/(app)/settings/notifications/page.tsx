import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { listNotificationPreferences } from '@/lib/collaboration/notificationPreferences';
import { NotificationPreferencesForm } from '@/components/settings/NotificationPreferencesForm';

export default async function NotificationPreferencesPage() {
  const auth = createClient(); const { data: { user } } = await auth.auth.getUser(); if (!user) redirect('/login');
  const service = createServiceClient(); const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_INBOX); if (denied || !ctx) redirect('/dashboard');
  const values = await listNotificationPreferences(service, ctx.merchantId, user.id);
  return <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6"><Link href="/notifications" className="text-sm font-semibold text-[var(--accent)]">← Notifications</Link><header><p className="text-sm text-[var(--text-secondary)]">Personal settings</p><h1 className="mt-1 text-2xl font-semibold">Notification preferences</h1><p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">Choose which typed operational events create an in-app item for your account. Preferences never change another team member’s inbox.</p></header><NotificationPreferencesForm initial={values} /></main>;
}
