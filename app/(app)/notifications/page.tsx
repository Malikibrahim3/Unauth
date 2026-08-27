import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import {
  NotificationCentre,
  type NotificationItem,
} from "@/components/notifications/NotificationCentre";
import { listNotificationsPage, NOTIFICATION_FILTERS, type NotificationFilter } from "@/lib/notifications/store";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; cursor?: string }>;
}) {
  const routeParams = await searchParams;
  const initialFilter = (NOTIFICATION_FILTERS as readonly string[]).includes(routeParams?.tab ?? '')
    ? routeParams!.tab as NotificationFilter
    : 'all';
  const user = await getRequestUser();
  if (!user) redirect("/login");

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(
    serviceClient,
    user.id,
    PERMISSIONS.VIEW_INBOX,
  );
  if (denied || !ctx) redirect("/overview");

  let page;
  try {
    page = await listNotificationsPage(serviceClient, ctx.merchantId, user.id, {
      filter: initialFilter,
      cursor: routeParams?.cursor ?? null,
    });
  } catch {
    page = await listNotificationsPage(serviceClient, ctx.merchantId, user.id, { filter: initialFilter });
  }
  return <NotificationCentre
    initialNotifications={page.items as NotificationItem[]}
    initialCounts={page.counts}
    initialNextCursor={page.pageInfo.nextCursor}
    initialFilter={initialFilter}
    initialCursor={routeParams?.cursor ?? null}
  />;
}
