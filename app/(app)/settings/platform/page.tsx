import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { hasPermission, PERMISSIONS, requirePermission } from '@/lib/permissions';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { PlatformSettingsClient } from '@/components/settings/PlatformSettingsClient';
export default async function PlatformSettingsPage() { const userClient = createClient(); const { data: { user } } = await userClient.auth.getUser(); if (!user) redirect('/login'); const client = createServiceClient(); const { denied, ctx } = await requirePermission(client, user.id, PERMISSIONS.VIEW_SETTINGS); if (denied || !ctx) redirect('/dashboard'); const canManage = await hasPermission(client, ctx, PERMISSIONS.MANAGE_SETTINGS); return <SettingsPageShell title="Platform" subtitle="Reporting, matching, financial, workflow, and connection policy defaults."><PlatformSettingsClient canManage={canManage} /></SettingsPageShell>; }
