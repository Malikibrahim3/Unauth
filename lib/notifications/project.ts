import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { TABLES } from "@/lib/supabase/tables";
import { filterInAppNotificationRecipients } from "@/lib/collaboration/notificationPreferences";

export const notificationRequestSchema = z.object({
  recipient_user_id: z.string().uuid(),
  kind: z.enum([
    "assignment",
    "mention",
    "approaching_deadline",
    "evidence_update",
    "decision_request",
    "recovery_outcome",
    "sync_failure",
    "daily_work_summary",
    "high_value_case_alert",
    "scheduled_report",
  ]),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(2_000).nullable().optional(),
  target_href: z.string().startsWith("/").max(500),
  deduplication_key: z.string().trim().min(1).max(300),
});

export type NotificationRequest = z.infer<typeof notificationRequestSchema>;
export type NotificationDomainEvent = {
  id: string;
  merchant_id: string;
  event_type: string;
  payload: unknown;
};

export async function projectNotificationFromEvent(
  client: SupabaseClient,
  event: NotificationDomainEvent,
) {
  if (event.event_type !== "notification.requested")
    return { applied: false, detail: "ignored" };
  const parsed = notificationRequestSchema.safeParse(event.payload);
  if (!parsed.success)
    throw new Error("notification_requested_payload_invalid");
  const value = parsed.data;
  const { data: member, error: memberError } = await client
    .from(TABLES.MERCHANT_MEMBERS)
    .select("user_id")
    .eq("merchant_id", event.merchant_id)
    .eq("user_id", value.recipient_user_id)
    .eq("invite_status", "active")
    .maybeSingle();
  if (memberError)
    throw new Error(
      `notification_member_lookup_failed: ${memberError.message}`,
    );
  if (!member) throw new Error("notification_recipient_not_active_member");
  const enabled = await filterInAppNotificationRecipients(
    client,
    event.merchant_id,
    [value.recipient_user_id],
    value.kind,
  );
  if (enabled.length === 0)
    return { applied: true, detail: `notification_muted:${value.kind}` };
  const { error } = await client.from(TABLES.NOTIFICATIONS).upsert(
    {
      merchant_id: event.merchant_id,
      recipient_user_id: value.recipient_user_id,
      kind: value.kind,
      title: value.title,
      body: value.body ?? null,
      target_href: value.target_href,
      domain_event_id: event.id,
      deduplication_key: value.deduplication_key,
    },
    { onConflict: "merchant_id,recipient_user_id,deduplication_key" },
  );
  if (error)
    throw new Error(`notification_projection_failed: ${error.message}`);
  return { applied: true, detail: `notification:${value.deduplication_key}` };
}
