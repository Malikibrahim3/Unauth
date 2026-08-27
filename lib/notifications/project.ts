import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { TABLES } from "@/lib/supabase/tables";
import { filterInAppNotificationRecipients } from "@/lib/collaboration/notificationPreferences";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";

export const notificationRequestSchema = z.object({
  recipient_user_id: z.string().uuid(),
  kind: z.enum(NOTIFICATION_KINDS),
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
  actor_id?: string | null;
};

async function investigationNotificationRequest(
  client: SupabaseClient,
  event: NotificationDomainEvent,
): Promise<NotificationRequest | null> {
  if (![
    'investigation.sent',
    'investigation.send_failed',
    'investigation.response_recorded',
  ].includes(event.event_type)) {
    return null;
  }
  const payload = event.payload && typeof event.payload === 'object'
    ? event.payload as Record<string, unknown>
    : {};
  const caseId = typeof payload.case_id === 'string' ? payload.case_id : null;
  const investigationId = typeof payload.investigation_id === 'string'
    ? payload.investigation_id
    : null;
  if (!caseId || !investigationId) return null;

  const [{ data: payoutCase }, { data: members, error: memberError }] =
    await Promise.all([
      client
        .from(TABLES.MERCHANT_CLAIMS)
        .select('assigned_to')
        .eq('merchant_id', event.merchant_id)
        .eq('id', caseId)
        .maybeSingle(),
      client
        .from(TABLES.MERCHANT_MEMBERS)
        .select('user_id,role,created_at')
        .eq('merchant_id', event.merchant_id)
        .eq('invite_status', 'active')
        .order('created_at', { ascending: true }),
    ]);
  if (memberError) {
    throw new Error(`investigation_notification_members_failed: ${memberError.message}`);
  }
  const recipient = payoutCase?.assigned_to
    ?? (members ?? []).find((member) => member.role === 'owner')?.user_id
    ?? (members ?? [])[0]?.user_id
    ?? null;
  if (!recipient) return null;

  const target = typeof payload.target_type === 'string'
    ? payload.target_type.replaceAll('_', ' ')
    : 'external party';
  const dueAt = typeof payload.due_at === 'string' ? payload.due_at : null;
  if (event.event_type === 'investigation.sent') {
    return notificationRequestSchema.parse({
      recipient_user_id: recipient,
      kind: 'approaching_deadline',
      title: `Investigation sent · ${target}`,
      body: dueAt
        ? `A response is due ${new Date(dueAt).toLocaleString('en-GB')}. Work will track the deadline separately from the customer decision.`
        : 'The request was accepted and is now waiting for a response.',
      target_href: `/cases/${caseId}#investigation-${investigationId}`,
      deduplication_key: `investigation-sent:${investigationId}:${event.id}`,
    });
  }
  if (event.event_type === 'investigation.send_failed') {
    return notificationRequestSchema.parse({
      recipient_user_id: recipient,
      kind: 'sync_failure',
      title: `Investigation email failed · ${target}`,
      body: 'The request remains a draft. Retry with the same logical send key or use copy/manual send.',
      target_href: `/cases/${caseId}#investigation-${investigationId}`,
      deduplication_key: `investigation-send-failed:${investigationId}:${event.id}`,
    });
  }
  return notificationRequestSchema.parse({
    recipient_user_id: recipient,
    kind: 'evidence_update',
    title: `Investigation response ready · ${target}`,
    body: 'Review the structured response, evidence provenance, and refreshed responsibility recommendation.',
    target_href: `/cases/${caseId}#investigation-${investigationId}`,
    deduplication_key: `investigation-response:${investigationId}:${event.id}`,
  });
}

export async function projectNotificationFromEvent(
  client: SupabaseClient,
  event: NotificationDomainEvent,
) {
  if (event.event_type !== "notification.requested") {
    const request = await investigationNotificationRequest(client, event);
    if (!request) return { applied: false, detail: "ignored" };
    return projectNotificationFromEvent(client, {
      ...event,
      event_type: 'notification.requested',
      payload: request,
    });
  }
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
