/**
 * Canonical durable audit-event writer.
 *
 * This function is for sensitive actions that do not already mutate an
 * inventoried, trigger-audited business table (for example, viewing or
 * exporting an audit trail). Sensitive business mutations are captured by the
 * database trigger in `20260721120000_durable_sensitive_audit.sql`, so their
 * row change and audit outbox event commit atomically.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import { recordDomainEvent } from '@/lib/events/domainEventStore';
import { auditActionLabel } from '@/lib/audit/actionLabels';
import type { CallerContext } from './index';

export type AuditAction =
  | 'upload_csv'
  | 'export_audit'
  | 'lookup_customer'
  | 'quick_score'
  | 'view_customer'
  | 'update_customer_status'
  | 'add_customer_note'
  | 'delete_customer_note'
  | 'add_to_watchlist'
  | 'remove_from_watchlist'
  | 'generate_evidence'
  | 'submit_fraud_feedback'
  | 'dismiss_transaction'
  | 'hide_job'
  | 'bulk_delete'
  | 'invite_team_member'
  | 'update_team_member_role'
  | 'remove_team_member'
  | 'grant_permission'
  | 'revoke_permission'
  | 'update_settings'
  | 'view_audit_trail'
  | 'create_api_key'
  | 'revoke_api_key'
  | 'payout_decision_recorded'
  | 'payout_decision_reversed'
  | 'financial_entry_recorded'
  | 'financial_entry_reversed'
  | 'loss_attribution_corrected'
  | 'recovery_status_changed'
  | 'recovery_amount_corrected'
  | 'identity_link_resolved'
  | 'rule_version_published'
  | 'rule_version_retired'
  | 'workflow_version_published'
  | 'workflow_version_retired'
  | 'evidence_export_issued'
  | 'evidence_export_downloaded'
  | 'integration_connected'
  | 'integration_disconnected'
  | 'integration_status_changed'
  | 'create_gorgias_support_connection'
  | 'update_gorgias_support_connection'
  | 'rotate_gorgias_webhook_secret'
  | 'disable_gorgias_support_connection'
  | 'create_zendesk_support_connection'
  | 'update_zendesk_support_connection'
  | 'create_freshdesk_support_connection'
  | 'update_freshdesk_support_connection'
  | 'rotate_freshdesk_webhook_secret'
  | 'disable_freshdesk_support_connection'
  | 'connect_shopify'
  | 'disconnect_shopify'
  | 'create_woocommerce_connection'
  | 'update_woocommerce_connection'
  | 'disable_woocommerce_connection'
  | 'connect_bigcommerce'
  | 'disconnect_bigcommerce';

export interface LogActionParams {
  ctx: CallerContext;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  effectiveAt?: string;
  correlationId?: string;
  idempotencyReference?: string;
  /** Reuse the route's service client when available. */
  client?: SupabaseClient;
}

function uuidOrNull(value: string | undefined): string | null {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

/**
 * Durably records an action-only event before the caller returns success.
 * Failures reject; callers must not swallow them or return a successful action.
 */
export async function logAction(params: LogActionParams) {
  const {
    ctx,
    action,
    resourceType = 'system',
    resourceId,
    metadata = {},
    ip,
    effectiveAt = new Date().toISOString(),
  } = params;
  const correlationId = params.correlationId ?? crypto.randomUUID();
  const idempotencyReference = params.idempotencyReference
    ?? `audit:${ctx.merchantId}:${action}:${resourceType}:${resourceId ?? 'system'}:${crypto.randomUUID()}`;
  const recordedAt = new Date().toISOString();

  return recordDomainEvent(params.client ?? createServiceClient(), {
    merchantId: ctx.merchantId,
    eventType: 'audit.action_recorded',
    aggregateType: resourceType,
    aggregateId: uuidOrNull(resourceId),
    idempotencyKey: idempotencyReference,
    actorType: 'user',
    actorId: ctx.userId,
    occurredAt: effectiveAt,
    correlationId,
    handlers: ['auditTimelineProjection'],
    payload: {
      audit: {
        action,
        resource_type: resourceType,
        resource_id: resourceId ?? null,
        actor_role: ctx.role,
        meaning: auditActionLabel(action, resourceType),
        effective_at: effectiveAt,
        recorded_at: recordedAt,
        idempotency_reference: idempotencyReference,
        request_ip: ip ?? null,
        metadata,
      },
    },
  });
}
