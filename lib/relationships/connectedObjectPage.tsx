import { notFound, redirect } from 'next/navigation';
import { PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { ConnectedObjectDetail } from '@/components/relationships/ConnectedObjectDetail';
import { getObjectSummary, type ConnectedObjectType } from '@/lib/relationships/objectSummary';

export async function connectedObjectPage(type: ConnectedObjectType, props: { params: Promise<{id:string}>; searchParams: Promise<{return?:string; returnTo?: string}> }) {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const svc = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_CUSTOMERS);
  if (!ctx) redirect(await resolveDefaultAppPath(svc, user.id));
  const [{ id }, search] = await Promise.all([props.params, props.searchParams]);
  const object = await getObjectSummary(svc as any, ctx.merchantId, type, id);
  if (!object) notFound();
  return <ConnectedObjectDetail object={object} returnTo={search.return ?? search.returnTo} />;
}
