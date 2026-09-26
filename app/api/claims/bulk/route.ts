import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { normalizeApiIdempotencyKey } from '@/lib/api/v1/ingest/requestIdempotency';
import { TABLES } from '@/lib/supabase/tables';

/**
 * Bulk case mutations deliberately have one narrow server contract. The
 * client sends the versions it actually rendered; the database implementation
 * must preflight every item and commit the batch in one transaction. This
 * route never falls back to a loop of single-case writes because that would
 * make a partial batch look successful.
 */
const itemSchema = z.object({
  caseId: z.string().uuid(),
  expectedStateVersion: z.number().int().min(1),
  amountMinor: z.number().int().min(0).optional(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional(),
  decision: z.enum(['approved', 'denied', 'escalated', 'partial_refund', 'full_refund', 'chargeback_disputed', 'no_action']).optional(),
  assignment: z.enum(['assign_to_me', 'unassign']).optional(),
  snoozedUntil: z.string().datetime().nullable().optional(),
});

const requestSchema = z.object({
  action: z.enum(['assign', 'snooze', 'decision']),
  items: z.array(itemSchema).min(1).max(100),
}).superRefine((value, ctx) => {
  const ids = new Set<string>();
  value.items.forEach((item, index) => {
    if (ids.has(item.caseId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items', index, 'caseId'], message: 'Duplicate case ID.' });
    }
    ids.add(item.caseId);
    if (value.action === 'decision' && (item.amountMinor == null || !item.currency || !item.decision)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items', index], message: 'Decision items require amountMinor, currency, and decision.' });
    }
    if (value.action !== 'decision' && (item.amountMinor != null || item.currency || item.decision)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items', index], message: 'Decision fields are not valid for this action.' });
    }
    if (value.action === 'assign' && !item.assignment) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items', index, 'assignment'], message: 'Assignment items require assign_to_me or unassign.' });
    }
    if (value.action !== 'assign' && item.assignment) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items', index, 'assignment'], message: 'Assignment fields are not valid for this action.' });
    }
    if (value.action === 'snooze' && item.snoozedUntil === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items', index, 'snoozedUntil'], message: 'Snooze items require an explicit deadline or null.' });
    }
    if (value.action !== 'snooze' && item.snoozedUntil !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items', index, 'snoozedUntil'], message: 'Snooze fields are not valid for this action.' });
    }
  });
});

type BulkRpcResult = {
  updated_items?: unknown[];
  updatedItems?: unknown[];
  audit_receipts?: unknown[];
  auditReceipts?: unknown[];
  batch_receipt?: unknown;
  batchReceipt?: unknown;
  replayed?: boolean;
  writes_performed?: number;
  writesPerformed?: number;
};

function responseForFailure(error: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({
    error,
    writesPerformed: 0,
    updatedItems: [],
    auditReceipts: [],
    replayed: false,
    ...extra,
  }, { status });
}

export async function POST(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return responseForFailure('Unauthorized', 401);

  const idempotencyKey = normalizeApiIdempotencyKey(request.headers.get('idempotency-key'));
  if (!idempotencyKey || idempotencyKey.length < 8) {
    return responseForFailure('A valid Idempotency-Key header is required.', 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return responseForFailure('Invalid bulk case payload.', 400, { issues: parsed.error.flatten() });
  }

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (denied) return denied;

  const ids = parsed.data.items.map((item) => item.caseId);
  const { data: claims, error: claimsError } = await serviceClient
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id,merchant_id,state_version,status,snoozed_until')
    .eq('merchant_id', ctx.merchantId)
    .in('id', ids);
  if (claimsError) {
    console.error('bulk_claim_preflight_read_failed', { code: claimsError.code, message: claimsError.message });
    return responseForFailure('Bulk case action is unavailable.', 503, { code: 'bulk_action_unavailable' });
  }

  const byId = new Map<string, any>((claims ?? []).map((claim: any) => [claim.id, claim] as [string, any]));
  const invalidItems = parsed.data.items.flatMap((item) => {
    const claim = byId.get(item.caseId);
    if (!claim) return [{ caseId: item.caseId, reason: 'missing_or_inaccessible' }];
    if (Number(claim.state_version ?? 1) !== item.expectedStateVersion) {
      return [{ caseId: item.caseId, reason: 'stale_state_version', expectedStateVersion: item.expectedStateVersion, currentStateVersion: Number(claim.state_version ?? 1) }];
    }
    return [];
  });
  if (invalidItems.length) {
    return responseForFailure('No cases were changed because the batch preflight failed.', 409, {
      code: 'bulk_preflight_failed',
      invalidItems,
    });
  }

  // Atomicity belongs in PostgreSQL, beside the existing transition RPC. A
  // missing function is a safe capability gap: returning 503 is preferable to
  // applying the first few rows and violating the all-or-nothing contract.
  const { data, error } = await serviceClient.rpc('bulk_transition_payout_cases', {
    p_merchant_id: ctx.merchantId,
    p_actor_user_id: user.id,
    p_action: parsed.data.action,
    p_items: parsed.data.items,
    p_idempotency_key: idempotencyKey,
  } as never);
  if (error) {
    const missingFunction = error.code === '42883' || /function .*bulk_transition_payout_cases.*does not exist/i.test(error.message ?? '');
    if (missingFunction) {
      return responseForFailure('Bulk case action is not built for this database.', 503, { code: 'bulk_action_not_built' });
    }
    if (/case_version_conflict|idempotency_conflict|preflight/i.test(error.message ?? '')) {
      return responseForFailure('No cases were changed because the batch preflight failed.', 409, { code: 'bulk_preflight_failed' });
    }
    console.error('bulk_claim_transition_failed', { code: error.code, message: error.message });
    return responseForFailure('Bulk case action is unavailable.', 503, { code: 'bulk_action_unavailable' });
  }

  const result = (data && typeof data === 'object' ? data : {}) as BulkRpcResult;
  const updatedItems = result.updatedItems ?? result.updated_items ?? [];
  const auditReceipts = result.auditReceipts ?? result.audit_receipts ?? [];
  return NextResponse.json({
    updatedItems,
    auditReceipts,
    batchReceipt: result.batchReceipt ?? result.batch_receipt ?? null,
    replayed: result.replayed === true,
    writesPerformed: Number(result.writesPerformed ?? result.writes_performed ?? (result.replayed ? 0 : updatedItems.length)),
  });
}
