/**
 * lib/permissions/audit.ts
 *
 * Immutable audit trail logger.
 *
 * Every sensitive action in the system must call logAction().
 * Writes are fire-and-forget using the service role (bypasses RLS)
 * so they never block the response and cannot be suppressed by the caller.
 */

import { createServiceClient } from '@/lib/supabase/server';
import type { CallerContext } from './index';

// Every action that must appear in the audit trail
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
  | 'view_audit_trail';

export interface LogActionParams {
  ctx:          CallerContext;
  action:       AuditAction;
  resourceType?: string;
  resourceId?:   string;
  metadata?:     Record<string, unknown>;
  ip?:           string;
}

/**
 * Write an entry to user_action_log.
 * Always fire-and-forget — never throws, never blocks a response.
 * Uses the service client so the log cannot be RLS-blocked.
 */
export function logAction(params: LogActionParams): void {
  const { ctx, action, resourceType, resourceId, metadata, ip } = params;

  // Spin up service client in this fire-and-forget closure
  const svc = createServiceClient();

  svc
    .from('user_action_log')
    .insert({
      merchant_id:   ctx.merchantId,
      actor_user_id: ctx.userId,
      actor_role:    ctx.role,
      action,
      resource_type: resourceType  ?? null,
      resource_id:   resourceId    ?? null,
      metadata:      (metadata ?? null) as any,
      request_ip:    ip            ?? null,
    })
    .then(({ error }) => {
      if (error) {
        // Non-fatal: log but don't expose to caller
        console.error('[audit] logAction failed:', error.message);
      }
    });
}
