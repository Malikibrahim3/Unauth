import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { WorkbenchPage } from "@/components/ui";
import { WORKBENCH_NAV_ITEMS } from "@/components/workbench/workbenchNavItems";
import { formatNumber } from "@/lib/utils/format";
import {
  NotificationCentre,
  type NotificationItem,
} from "@/components/notifications/NotificationCentre";
import { listNotifications } from "@/lib/notifications/store";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) redirect("/login");
  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(
    serviceClient,
    user.id,
    PERMISSIONS.VIEW_INBOX,
  );
  if (denied || !ctx) redirect("/dashboard");
  const notifications = (await listNotifications(
    serviceClient,
    ctx.merchantId,
    user.id,
  )) as NotificationItem[];
  const unread = notifications.filter((item) => !item.read_at).length;
  return (
    <WorkbenchPage
      eyebrow="Work"
      title="Notifications"
      navItems={WORKBENCH_NAV_ITEMS}
      kpiItems={
        notifications.length === 0
          ? undefined
          : [
              {
                label: "Unread",
                value: formatNumber(unread),
                hint: "For your account",
              },
              {
                label: "All notifications",
                value: formatNumber(notifications.length),
                hint: "Newest first",
              },
            ]
      }
      main={<NotificationCentre initialNotifications={notifications} />}
    />
  );
}
