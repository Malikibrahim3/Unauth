import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { WorkbenchPage } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { ExceptionQueue } from '@/components/exceptions/ExceptionQueue';
import { countOpenExceptions } from '@/lib/exceptions/store';

export const dynamic = 'force-dynamic';
export default async function ExceptionsPage() {
  const userClient = createClient(); const { data: { user } } = await userClient.auth.getUser(); if (!user) redirect('/login');
  const serviceClient = createServiceClient(); const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX); if (denied || !ctx) redirect('/dashboard');
  const openCount = await countOpenExceptions(serviceClient, ctx.merchantId);
  return <WorkbenchPage eyebrow="Operations" title="Exception queue" subtitle="The focused decisions automation cannot safely make on your behalf." navItems={WORKBENCH_NAV_ITEMS} kpiItems={[{ label: 'Open exceptions', value: openCount.toLocaleString(), hint: 'Need merchant input' }]} main={<ExceptionQueue />} />;
}
