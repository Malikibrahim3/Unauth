import type { SupabaseClient } from "@supabase/supabase-js";
import { TABLES } from "@/lib/supabase/tables";
import { recordDomainEvent } from "@/lib/events/domainEventStore";
import {
  projectNotificationFromEvent,
  type NotificationRequest,
} from "@/lib/notifications/project";
import { formatCurrencyNullable } from "@/lib/utils/format";
import { publicConnectionErrorMessage } from "@/lib/integrations/publicErrors";

type ProjectionSummary = {
  requested: number;
  projected: number;
  muted: number;
};

type OverdueTaskRow = {
  id: string;
  title: string;
  status: string;
  due_at: string;
  owner_user_id: string | null;
  support_payout_case_id: string | null;
  recovery_case_id: string | null;
  priority: string;
};

async function listAllOverdueTasks(
  client: SupabaseClient,
  merchantId: string,
  now: string,
): Promise<OverdueTaskRow[]> {
  const pageSize = 250;
  const rows: OverdueTaskRow[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from(TABLES.WORK_TASKS)
      .select(
        'id,title,status,due_at,owner_user_id,support_payout_case_id,recovery_case_id,priority',
      )
      .eq('merchant_id', merchantId)
      .in('status', ['open', 'in_progress', 'blocked'])
      .not('due_at', 'is', null)
      .lte('due_at', now)
      .order('due_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) {
      throw new Error(`operational_notification_task_scan_failed: ${error.message}`);
    }
    const page = (data ?? []) as OverdueTaskRow[];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

async function requestNotification(
  client: SupabaseClient,
  merchantId: string,
  aggregateType: string,
  aggregateId: string,
  request: NotificationRequest,
  occurredAt?: string | null,
) {
  const event = await recordDomainEvent(client, {
    merchantId,
    eventType: "notification.requested",
    aggregateType,
    aggregateId,
    idempotencyKey: `notification:${request.deduplication_key}`,
    actorType: "system",
    occurredAt: occurredAt ?? undefined,
    payload: request,
  });
  return projectNotificationFromEvent(client, event as never);
}

export async function projectOperationalNotifications(
  client: SupabaseClient,
  merchantId: string,
): Promise<ProjectionSummary> {
  const { data: members, error: memberError } = await client
    .from(TABLES.MERCHANT_MEMBERS)
    .select("user_id,role")
    .eq("merchant_id", merchantId)
    .eq("invite_status", "active")
    .order("created_at", { ascending: true });
  if (memberError)
    throw new Error(`notification_members_failed: ${memberError.message}`);
  const fallbackRecipient =
    (members ?? []).find(
      (member: { role: string; user_id: string | null }) =>
        member.role === "owner",
    )?.user_id ??
    (members ?? []).find((member: { user_id: string | null }) =>
      Boolean(member.user_id),
    )?.user_id;
  if (!fallbackRecipient) return { requested: 0, projected: 0, muted: 0 };

  const now = new Date().toISOString();
  const [overdueTasks, claimsResult, recoveriesResult, integrationsResult] =
    await Promise.all([
      listAllOverdueTasks(client, merchantId, now),
      client
        .from(TABLES.MERCHANT_CLAIMS)
        .select("id,status,amount_at_risk,currency,updated_at")
        .eq("merchant_id", merchantId)
        .in("status", [
          "ready_for_decision",
          "manual_review",
          "open",
          "escalated",
        ])
        .order("amount_at_risk", { ascending: false, nullsFirst: false })
        .limit(2),
      client
        .from(TABLES.RECOVERY_CASES)
        .select("id,status,updated_at")
        .eq("merchant_id", merchantId)
        .in("status", [
          "evidence_needed",
          "approved",
          "partially_approved",
          "rejected",
          "paid",
        ])
        .order("updated_at", { ascending: false })
        .limit(3),
      client
        .from(TABLES.MERCHANT_INTEGRATIONS)
        .select(
          "id,provider_id,status,last_error_code,last_error_message,last_error,last_error_at,updated_at",
        )
        .eq("merchant_id", merchantId)
        .in("status", ["error", "revoked", "attention_required"])
        .order("updated_at", { ascending: false })
        .limit(3),
    ]);
  for (const result of [
    claimsResult,
    recoveriesResult,
    integrationsResult,
  ]) {
    if (result.error)
      throw new Error(
        `operational_notification_scan_failed: ${result.error.message}`,
      );
  }

  const jobs: Array<Promise<{ applied: boolean; detail: string }>> = [];
  for (const task of overdueTasks) {
    const recipient = task.owner_user_id ?? fallbackRecipient;
    const target = task.support_payout_case_id
      ? `/claims/${task.support_payout_case_id}`
      : task.recovery_case_id
        ? `/recoveries/${task.recovery_case_id}`
        : "/work";
    jobs.push(
      requestNotification(
        client,
        merchantId,
        "task",
        task.id,
        {
          recipient_user_id: recipient,
          kind: "approaching_deadline",
          title: `Overdue: ${task.title}`,
          body: `${task.support_payout_case_id ? `Case ${task.support_payout_case_id.slice(0, 8)} · ` : ""}${task.priority === "urgent" ? "Urgent" : "Operational"} work is past its due time. Open the source record to continue or resolve it.`,
          target_href: target,
          deduplication_key: `task-overdue:${task.id}:${task.due_at}`,
        },
        task.due_at,
      ),
    );
  }
  for (const claim of claimsResult.data ?? []) {
    const amount =
      claim.amount_at_risk == null
        ? null
        : formatCurrencyNullable(claim.amount_at_risk, claim.currency);
    jobs.push(
      requestNotification(
        client,
        merchantId,
        "case",
        claim.id,
        {
          recipient_user_id: fallbackRecipient,
          kind:
            claim.amount_at_risk != null && claim.amount_at_risk >= 500
              ? "high_value_case_alert"
              : "decision_request",
          title:
            claim.amount_at_risk != null && claim.amount_at_risk >= 500
              ? `High-value payout case · ${claim.id.slice(0, 8)}${amount ? ` · ${amount}` : ""}`
              : `Payout case ${claim.id.slice(0, 8)} needs a decision`,
          body: "Evidence and merchant policy context are ready for an operator review.",
          target_href: `/claims/${claim.id}`,
          deduplication_key: `case-decision:${claim.id}:${claim.status}:${claim.updated_at}`,
        },
        claim.updated_at,
      ),
    );
  }
  for (const recovery of recoveriesResult.data ?? []) {
    const outcome = [
      "approved",
      "partially_approved",
      "rejected",
      "paid",
    ].includes(recovery.status);
    jobs.push(
      requestNotification(
        client,
        merchantId,
        "recovery",
        recovery.id,
        {
          recipient_user_id: fallbackRecipient,
          kind: outcome ? "recovery_outcome" : "evidence_update",
          title: outcome
            ? `Recovery updated · ${recovery.status.replaceAll("_", " ")}`
            : "Recovery evidence is incomplete",
          body: outcome
            ? "The connected recovery record has a new source outcome."
            : "Open the recovery to review missing evidence and the next source action.",
          target_href: `/recoveries/${recovery.id}`,
          deduplication_key: `recovery:${recovery.id}:${recovery.status}:${recovery.updated_at}`,
        },
        recovery.updated_at,
      ),
    );
  }
  for (const integration of integrationsResult.data ?? []) {
    jobs.push(
      requestNotification(
        client,
        merchantId,
        "connection",
        integration.id,
        {
          recipient_user_id: fallbackRecipient,
          kind: "sync_failure",
          title: `${String(integration.provider_id)
            .replaceAll("_", " ")
            .replace(/^./, (character: string) =>
              character.toUpperCase(),
            )} connection needs attention`,
          body: publicConnectionErrorMessage(
            integration.last_error_code,
            integration.last_error_message,
            integration.last_error,
          ) ?? "The connection is no longer healthy. Review credentials and retry the import.",
          target_href: `/integrations/${integration.provider_id}`,
          deduplication_key: `connection-health:${integration.id}:${integration.status}:${integration.last_error_at ?? integration.updated_at}`,
        },
        integration.last_error_at ?? integration.updated_at,
      ),
    );
  }
  const results = await Promise.all(jobs);
  return {
    requested: results.length,
    projected: results.filter((result) =>
      result.detail.startsWith("notification:"),
    ).length,
    muted: results.filter((result) =>
      result.detail.startsWith("notification_muted:"),
    ).length,
  };
}
