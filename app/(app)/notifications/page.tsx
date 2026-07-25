import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { WorkbenchPage, KeyInsightCallout, SummaryRail } from "@/components/ui";
import { Bell } from "lucide-react";
import { SparkTrend } from "@/components/charts/authenticated/micro/SparkTrend";
import { WORKBENCH_NAV_ITEMS } from "@/components/workbench/workbenchNavItems";
import { formatNumber } from "@/lib/utils/format";
import {
  NotificationCentre,
  type NotificationItem,
} from "@/components/notifications/NotificationCentre";
import { listNotifications } from "@/lib/notifications/store";
import { selectNotificationActivity } from "@/lib/visualisation/chartSelectors";

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
  if (denied || !ctx) redirect("/dashboard");
  const notifications = (await listNotifications(
    serviceClient,
    ctx.merchantId,
    user.id,
  )) as NotificationItem[];
  const unread = notifications.filter((item) => !item.read_at).length;
  const activityDays = selectNotificationActivity(
    notifications.map((item) => ({ createdAt: item.created_at, readAt: item.read_at })),
  );
  const readTotal = notifications.length - unread;
  const activityTrend = activityDays.map((day) => day.unread);
  return (
    <WorkbenchPage
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
      primaryVisual={
        notifications.length === 0 ? undefined : (
          <KeyInsightCallout
            tone={unread > 0 ? 'info' : 'neutral'}
            icon={<Bell size={16} />}
          >
            <strong>{formatNumber(unread)}</strong> unread of{' '}
            <strong>{formatNumber(notifications.length)}</strong> notifications.
          </KeyInsightCallout>
        )
      }
      rail={
        notifications.length === 0 ? undefined : (
          <SummaryRail
            sections={[
              {
                title: 'Recent activity',
                children: activityTrend.length >= 2 ? <SparkTrend values={activityTrend} width={260} height={36} /> : undefined,
                rows: [
                  { label: 'Unread', value: formatNumber(unread), tone: 'info', bar: notifications.length ? unread / notifications.length : 0 },
                  { label: 'Read', value: formatNumber(readTotal), tone: 'neutral', bar: notifications.length ? readTotal / notifications.length : 0 },
                ],
                footnote: `Unread intensity across the latest ${activityDays.length} UTC dates in this inbox.`,
              },
            ]}
          />
        )
      }
      main={<NotificationCentre initialNotifications={notifications} />}
    />
  );
}
