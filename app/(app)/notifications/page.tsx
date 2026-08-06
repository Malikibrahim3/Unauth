import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { PageFrame } from "@/components/ui";
import { formatNumber } from "@/lib/utils/format";
import {
  NotificationCentre,
  type NotificationItem,
} from "@/components/notifications/NotificationCentre";
import { listNotifications } from "@/lib/notifications/store";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getRequestUser();
  if (!user) redirect("/login");

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(
    serviceClient,
    user.id,
    PERMISSIONS.VIEW_INBOX,
  );
  if (denied || !ctx) redirect("/overview");

  const notifications = (await listNotifications(
    serviceClient,
    ctx.merchantId,
    user.id,
  )) as NotificationItem[];
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recentCount = notifications.filter(
    (item) => Date.parse(item.created_at) >= fourteenDaysAgo,
  ).length;

  return (
    <PageFrame
      title="Notifications"
      subtitle={`${formatNumber(notifications.length)} total · ${formatNumber(recentCount)} received in the last 14 days`}
    >
      <NotificationCentre initialNotifications={notifications} />
    </PageFrame>
  );
}
