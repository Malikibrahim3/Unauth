import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanId } from '@/lib/billing/plans';
import { TABLES } from '@/lib/supabase/tables';
import { ensureMerchantBillingAccount } from '@/lib/billing/merchantBilling';

export type SubscriptionIntentSource =
  | 'signup'
  | 'pricing'
  | 'onboarding'
  | 'billing'
  | 'stripe_webhook';

export type SubscriptionIntentStatus =
  | 'pending'
  | 'checkout_created'
  | 'confirmed'
  | 'cancelled'
  | 'superseded';

export type SubscriptionIntent = {
  id: string;
  merchantId: string;
  requestedPlanId: PlanId;
  requestedBy: string | null;
  logicalOperationId: string;
  source: SubscriptionIntentSource;
  status: SubscriptionIntentStatus;
  checkoutSessionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionIntentReadAvailability = 'available' | 'schema_pending';

export type SubscriptionIntentReadModel = {
  intent: SubscriptionIntent | null;
  availability: SubscriptionIntentReadAvailability;
};

type IntentRow = {
  id: string;
  merchant_id: string;
  requested_plan_id: PlanId;
  requested_by: string | null;
  logical_operation_id: string;
  source: SubscriptionIntentSource;
  status: SubscriptionIntentStatus;
  checkout_session_id: string | null;
  created_at: string;
  updated_at: string;
};

function toIntent(row: IntentRow): SubscriptionIntent {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    requestedPlanId: row.requested_plan_id,
    requestedBy: row.requested_by,
    logicalOperationId: row.logical_operation_id,
    source: row.source,
    status: row.status,
    checkoutSessionId: row.checkout_session_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function persistSubscriptionIntent(
  client: SupabaseClient,
  input: {
    merchantId: string;
    planId: PlanId;
    requestedBy: string;
    logicalOperationId: string;
    source: SubscriptionIntentSource;
  },
): Promise<{ id: string; planId: PlanId; status: SubscriptionIntentStatus; duplicate: boolean }> {
  await ensureMerchantBillingAccount(client, input.merchantId);
  const { data, error } = await client.rpc('upsert_subscription_intent', {
    p_merchant_id: input.merchantId,
    p_requested_plan_id: input.planId,
    p_requested_by: input.requestedBy,
    p_logical_operation_id: input.logicalOperationId,
    p_source: input.source,
  });
  if (error) throw new Error(`Could not persist subscription intent: ${error.message}`);
  const row = data as {
    id: string;
    requested_plan_id: PlanId;
    status: SubscriptionIntentStatus;
    duplicate: boolean;
  };
  return {
    id: row.id,
    planId: row.requested_plan_id,
    status: row.status,
    duplicate: row.duplicate,
  };
}

export async function getLatestSubscriptionIntent(
  client: SupabaseClient,
  merchantId: string,
): Promise<SubscriptionIntent | null> {
  return (await loadLatestSubscriptionIntent(client, merchantId)).intent;
}

function isPendingSubscriptionIntentSchema(error: { code?: string; message?: string }): boolean {
  return error.code === 'PGRST205'
    || error.code === '42P01'
    || error.message?.includes("table 'public.subscription_intents'") === true
    || error.message?.includes('relation "subscription_intents" does not exist') === true;
}

export async function loadLatestSubscriptionIntent(
  client: SupabaseClient,
  merchantId: string,
): Promise<SubscriptionIntentReadModel> {
  const { data, error } = await client
    .from(TABLES.SUBSCRIPTION_INTENTS)
    .select('id,merchant_id,requested_plan_id,requested_by,logical_operation_id,source,status,checkout_session_id,created_at,updated_at')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error && isPendingSubscriptionIntentSchema(error)) {
    return { intent: null, availability: 'schema_pending' };
  }
  if (error) throw new Error(`Could not load subscription intent: ${error.message}`);
  return {
    intent: data ? toIntent(data as IntentRow) : null,
    availability: 'available',
  };
}

export async function markSubscriptionIntentStatus(
  client: SupabaseClient,
  input: {
    merchantId: string;
    planId: PlanId;
    status: SubscriptionIntentStatus;
    checkoutSessionId?: string | null;
  },
): Promise<void> {
  const { error } = await client.rpc('mark_subscription_intent_status', {
    p_merchant_id: input.merchantId,
    p_requested_plan_id: input.planId,
    p_status: input.status,
    p_checkout_session_id: input.checkoutSessionId ?? null,
  });
  if (error) throw new Error(`Could not update subscription intent: ${error.message}`);
}

export async function markSubscriptionIntentStatusById(
  client: SupabaseClient,
  input: {
    merchantId: string;
    intentId: string;
    status: SubscriptionIntentStatus;
    checkoutSessionId?: string | null;
  },
): Promise<boolean> {
  const { data, error } = await client.rpc('mark_subscription_intent_status_by_id', {
    p_merchant_id: input.merchantId,
    p_intent_id: input.intentId,
    p_status: input.status,
    p_checkout_session_id: input.checkoutSessionId ?? null,
  });
  if (error) throw new Error(`Could not update subscription intent: ${error.message}`);
  return data === true;
}
