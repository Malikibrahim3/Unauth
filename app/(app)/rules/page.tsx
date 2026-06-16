import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { hasPermission, PERMISSIONS, requirePermission } from '@/lib/permissions';
import { RulesPageClient } from '@/components/rules/RulesPageClient';

export const dynamic = 'force-dynamic';

export default async function RulesPage() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/dashboard');

  const canManage = await hasPermission(serviceClient, ctx, PERMISSIONS.MANAGE_SETTINGS);

  return <RulesPageClient canManage={canManage} />;
}
