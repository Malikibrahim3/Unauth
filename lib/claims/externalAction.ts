import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

type UntypedClient = { from: (table: string) => any };

export type AssistedHandoffResult =
  | {
      status: 'not_applicable' | 'unavailable';
      reason: string;
      action: null;
    }
  | {
      status: 'handoff_ready';
      reason: null;
      action: Record<string, unknown>;
    };

export type PrepareDecisionHandoffInput = {
  merchantId: string;
  actorUserId: string;
  caseId: string;
  sourceOrderId: string | null | undefined;
  requestedAction: string | null | undefined;
  issueReason: string | null | undefined;
  decision: {
    id: string;
    decision: string;
    amountMinor: number | null;
    currency: string | null;
  };
};

export type ExternalActionState =
  | 'draft'
  | 'awaiting_confirmation'
  | 'authorised'
  | 'handoff_ready'
  | 'merchant_reported_attempt'
  | 'source_observed_attempt'
  | 'provider_accepted'
  | 'provider_processing'
  | 'succeeded'
  | 'failed'
  | 'indeterminate'
  | 'reconciled';

export type ExternalActionTransitionInput = {
  merchantId: string;
  actionId: string;
  actorUserId: string | null;
  authority: 'merchant' | 'source' | 'system';
  targetState: ExternalActionState;
  expectedVersion: number;
  idempotencyKey: string;
  externalReference?: string | null;
  method?: string | null;
  receiptEvidence?: Record<string, unknown> | null;
  providerRequestId?: string | null;
  providerObjectId?: string | null;
  providerStatus?: string | null;
  providerError?: string | null;
  observedSource?: string | null;
  observedAt?: string | null;
};

const REFUND_DECISIONS = new Set(['approved', 'partial_refund', 'full_refund']);

function db(client: SupabaseClient): UntypedClient {
  return client as unknown as UntypedClient;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, canonical(nested)]),
  );
}

export function actionRequestFingerprint(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)), 'utf8')
    .digest('hex');
}

function shopifyOrderNumericId(externalId: string): string | null {
  const candidate = externalId.trim().split('/').filter(Boolean).at(-1) ?? '';
  return /^\d+$/.test(candidate) ? candidate : null;
}

export function shopifyAdminOrderHref(
  providerAccountId: string | null | undefined,
  externalOrderId: string,
): string | null {
  const rawDomain = providerAccountId?.trim().toLowerCase() ?? '';
  const domain = rawDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const orderId = shopifyOrderNumericId(externalOrderId);
  if (!orderId || !/^[a-z0-9][a-z0-9.-]*\.myshopify\.com$/.test(domain)) return null;
  return `https://${domain}/admin/orders/${encodeURIComponent(orderId)}`;
}

export async function transitionExternalAction(
  client: SupabaseClient,
  input: ExternalActionTransitionInput,
): Promise<{ action: Record<string, unknown>; replayed: boolean }> {
  const { data, error } = await client.rpc('transition_external_action_v1', {
    p_merchant_id: input.merchantId,
    p_action_id: input.actionId,
    p_actor_user_id: input.actorUserId,
    p_authority: input.authority,
    p_target_state: input.targetState,
    p_expected_version: input.expectedVersion,
    p_idempotency_key: input.idempotencyKey,
    p_external_reference: input.externalReference ?? null,
    p_method: input.method ?? null,
    p_receipt_evidence: input.receiptEvidence ?? null,
    p_provider_request_id: input.providerRequestId ?? null,
    p_provider_object_id: input.providerObjectId ?? null,
    p_provider_status: input.providerStatus ?? null,
    p_provider_error: input.providerError ?? null,
    p_observed_source: input.observedSource ?? null,
    p_observed_at: input.observedAt ?? null,
  });
  if (error) throw new Error(error.message);
  const result = data as { action?: Record<string, unknown>; replayed?: boolean } | null;
  if (!result?.action) throw new Error('external_action_transition_empty');
  return { action: result.action, replayed: result.replayed === true };
}

function rowVersion(action: Record<string, unknown>): number {
  const value = Number(action.state_version ?? 1);
  return Number.isInteger(value) && value > 0 ? value : 1;
}

/**
 * Advances only a handoff for the exact Shopify order and amount observed in a
 * source refund event. Merchant-reported attempts remain evidence, never the
 * authority for provider acceptance or success.
 */
export async function observeShopifyRefundForExternalAction(
  client: SupabaseClient,
  input: {
    merchantId: string;
    caseId: string;
    sourceOrderExternalId: string;
    amountMinor: number;
    currency: string;
    refundExternalId: string;
    transactionState: 'pending' | 'success';
    observedAt: string;
    domainEventId: string;
  },
): Promise<Record<string, unknown> | null> {
  const { data, error } = await db(client)
    .from(TABLES.CONNECTOR_ACTION_RUNS)
    .select('*')
    .eq('merchant_id', input.merchantId)
    .eq('support_payout_case_id', input.caseId)
    .eq('capability_id', 'refund.manual_handoff')
    .eq('external_record_id', input.sourceOrderExternalId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`external_action_refund_lookup_failed:${error.message}`);

  const action = (data as Array<Record<string, unknown>> | null)?.find((candidate) => {
    const legacyState = candidate.result && typeof candidate.result === 'object'
      ? (candidate.result as Record<string, unknown>).action_state
      : null;
    const state = String(candidate.action_state ?? legacyState ?? '');
    const amountMatches = candidate.amount_minor == null || Number(candidate.amount_minor) === input.amountMinor;
    const currencyMatches = candidate.currency == null || String(candidate.currency).toUpperCase() === input.currency.toUpperCase();
    return !['succeeded', 'reconciled'].includes(state) && amountMatches && currencyMatches;
  });
  if (!action) return null;

  let current = action;
  let state = String(current.action_state ?? 'handoff_ready') as ExternalActionState;
  const transition = async (targetState: ExternalActionState, authority: 'source' | 'system') => {
    const next = await transitionExternalAction(client, {
      merchantId: input.merchantId,
      actionId: String(current.id),
      actorUserId: null,
      authority,
      targetState,
      expectedVersion: rowVersion(current),
      idempotencyKey: `shopify-refund:${input.domainEventId}:${targetState}`,
      providerObjectId: input.refundExternalId,
      providerStatus: input.transactionState,
      observedSource: authority === 'source' ? 'shopify.refund' : null,
      observedAt: input.observedAt,
    });
    current = next.action;
    state = targetState;
  };

  if (['handoff_ready', 'merchant_reported_attempt', 'failed', 'indeterminate'].includes(state)) {
    await transition('source_observed_attempt', 'source');
  }
  if (state === 'source_observed_attempt') await transition('provider_accepted', 'source');
  if (input.transactionState === 'pending' && state === 'provider_accepted') {
    await transition('provider_processing', 'source');
  }
  if (
    input.transactionState === 'success'
    && ['source_observed_attempt', 'provider_accepted', 'provider_processing'].includes(state)
  ) {
    await transition('succeeded', 'source');
  }
  if (input.transactionState === 'success' && state === 'succeeded') {
    await transition('reconciled', 'system');
  }
  return current;
}

function handoffScope(decision: string): 'full' | 'partial' | 'merchant_specified' {
  if (decision === 'full_refund') return 'full';
  if (decision === 'partial_refund') return 'partial';
  return 'merchant_specified';
}

/**
 * Creates an immutable manual handoff instruction after a merchant decision.
 * It never calls Shopify and never marks the external action successful.
 */
export async function prepareDecisionHandoff(
  client: SupabaseClient,
  input: PrepareDecisionHandoffInput,
): Promise<AssistedHandoffResult> {
  if (!REFUND_DECISIONS.has(input.decision.decision)) {
    return {
      status: 'not_applicable',
      reason: 'This decision does not require the Shopify refund handoff.',
      action: null,
    };
  }
  if (!input.sourceOrderId) {
    return {
      status: 'unavailable',
      reason: 'The case has no confirmed source order, so an exact provider handoff cannot be prepared.',
      action: null,
    };
  }

  const query = db(client);
  const { data: order, error: orderError } = await query
    .from(TABLES.SOURCE_ORDERS)
    .select('id,external_id,order_number,source_account_id,source')
    .eq('merchant_id', input.merchantId)
    .eq('id', input.sourceOrderId)
    .maybeSingle();
  if (orderError) throw new Error(`case_handoff_order_failed:${orderError.message}`);
  if (!order) {
    return {
      status: 'unavailable',
      reason: 'The confirmed source order is unavailable for this merchant.',
      action: null,
    };
  }
  if (order.source !== 'shopify' || !order.source_account_id) {
    return {
      status: 'unavailable',
      reason: 'The source order has no confirmed Shopify source account, so no handoff destination is asserted.',
      action: null,
    };
  }

  const { data: sourceAccount, error: sourceAccountError } = await query
    .from(TABLES.SOURCE_ACCOUNTS)
    .select('id,connection_id,provider_id,external_account_id,display_name,base_url,environment')
    .eq('merchant_id', input.merchantId)
    .eq('id', order.source_account_id)
    .maybeSingle();
  if (sourceAccountError) throw new Error(`case_handoff_source_account_failed:${sourceAccountError.message}`);
  if (!sourceAccount || sourceAccount.provider_id !== 'shopify' || !sourceAccount.connection_id) {
    return {
      status: 'unavailable',
      reason: 'The source order is not linked to a canonical Shopify connection.',
      action: null,
    };
  }

  const { data: connection, error: connectionError } = await query
    .from(TABLES.MERCHANT_INTEGRATIONS)
    .select('id,provider_id,provider_account_id,provider_account_name,status,environment,last_verification_status,last_verified_at')
    .eq('merchant_id', input.merchantId)
    .eq('id', sourceAccount.connection_id)
    .maybeSingle();
  if (connectionError) throw new Error(`case_handoff_connection_failed:${connectionError.message}`);
  if (
    !connection
    || connection.provider_id !== 'shopify'
    || connection.status !== 'connected'
    || connection.last_verification_status !== 'verified'
  ) {
    return {
      status: 'unavailable',
      reason: 'The selected source order is not backed by a currently connected and verified Shopify account.',
      action: null,
    };
  }

  const externalHref = shopifyAdminOrderHref(
    connection.provider_account_id ?? sourceAccount.external_account_id ?? sourceAccount.base_url,
    String(order.external_id),
  );
  if (!externalHref) {
    return {
      status: 'unavailable',
      reason: 'A safe Shopify Admin order destination could not be derived from the verified source identity.',
      action: null,
    };
  }

  const { data: claimedItems, error: itemsError } = await query
    .from(TABLES.CASE_CLAIMED_ITEMS)
    .select('id,source_order_line_id,claimed_sku,claimed_quantity')
    .eq('merchant_id', input.merchantId)
    .eq('support_payout_case_id', input.caseId)
    .order('created_at', { ascending: true });
  if (itemsError) throw new Error(`case_handoff_items_failed:${itemsError.message}`);

  const payload = {
    contract_version: 'case-assisted-handoff-v1',
    decision_id: input.decision.id,
    operation: 'refund',
    scope: handoffScope(input.decision.decision),
    amount_minor: input.decision.amountMinor,
    currency: input.decision.currency?.toUpperCase() ?? null,
    reason: input.issueReason?.trim() || null,
    requested_action: input.requestedAction?.trim() || null,
    item_scope: (claimedItems ?? []).map((item: Record<string, unknown>) => ({
      claimed_item_id: item.id,
      source_order_line_id: item.source_order_line_id,
      sku: item.claimed_sku,
      quantity: item.claimed_quantity,
    })),
    provider: {
      id: 'shopify',
      environment: connection.environment ?? null,
      account_id: connection.provider_account_id ?? sourceAccount.external_account_id ?? null,
      account_name: connection.provider_account_name ?? sourceAccount.display_name ?? null,
      connection_status: connection.status,
      verified_at: connection.last_verified_at ?? null,
    },
    source_object: {
      type: 'order',
      id: order.id,
      external_id: order.external_id,
      reference: order.order_number ?? order.external_id,
      internal_href: `/orders/${encodeURIComponent(String(order.id))}`,
      provider_href: externalHref,
    },
    customer_notification_instruction:
      'Complete any customer notification in the external provider workflow. Unauth does not notify the customer or move money.',
  };
  const fingerprint = actionRequestFingerprint(payload);
  const idempotencyKey = `case-handoff:${input.decision.id}`;
  const { data: prior, error: priorError } = await query
    .from(TABLES.CONNECTOR_ACTION_RUNS)
    .select('*')
    .eq('merchant_id', input.merchantId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (priorError) throw new Error(`case_handoff_lookup_failed:${priorError.message}`);
  if (prior) return { status: 'handoff_ready', reason: null, action: prior };

  const { data: action, error: insertError } = await query
    .from(TABLES.CONNECTOR_ACTION_RUNS)
    .insert({
      merchant_id: input.merchantId,
      connection_id: connection.id,
      support_payout_case_id: input.caseId,
      capability_id: 'refund.manual_handoff',
      external_record_id: String(order.external_id),
      payload,
      status: 'manual_required',
      action_state: 'handoff_ready',
      state_version: 1,
      request_fingerprint: fingerprint,
      requested_operation: 'refund',
      amount_minor: input.decision.amountMinor,
      currency: input.decision.currency?.toUpperCase() ?? null,
      idempotency_key: idempotencyKey,
      actor_user_id: input.actorUserId,
      result: {
        action_state: 'handoff_ready',
        request_fingerprint: fingerprint,
        external_action_performed: false,
        provider_response: null,
      },
      completed_at: null,
    })
    .select('*')
    .single();
  if (insertError?.code === '23505') {
    const { data: replay, error: replayError } = await query
      .from(TABLES.CONNECTOR_ACTION_RUNS)
      .select('*')
      .eq('merchant_id', input.merchantId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (!replayError && replay) return { status: 'handoff_ready', reason: null, action: replay };
  }
  if (insertError) throw new Error(`case_handoff_record_failed:${insertError.message}`);
  return { status: 'handoff_ready', reason: null, action };
}
