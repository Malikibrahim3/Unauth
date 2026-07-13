import { notFound, redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission, resolveDefaultAppPath } from '@/lib/permissions';
import { ConnectedObjectDetail } from '@/components/relationships/ConnectedObjectDetail';
import { getObjectSummary, type ConnectedObjectType } from '@/lib/relationships/objectSummary';

export async function connectedObjectPage(type: ConnectedObjectType, props: { params: Promise<{id:string}>; searchParams: Promise<{return?:string}> }) {
  const client = createClient(); const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/login');
  const svc = createServiceClient();
  const { denied, ctx } = await requirePermission(svc, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) redirect(await resolveDefaultAppPath(svc, user.id));
  const [{ id }, search] = await Promise.all([props.params, props.searchParams]);
  const object = await getObjectSummary(svc as any, ctx.merchantId, type, id);
  if (!object) notFound();
  return <ConnectedObjectDetail object={object} returnTo={search.return} />;
}
