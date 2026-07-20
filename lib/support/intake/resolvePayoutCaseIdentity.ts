/**
 * Merchant-scoped identity resolution for support payout cases.
 *
 * Conservative linking only — exact normalized email, Shopify source customer,
 * or explicit identity signals on the same merchant. Never links from name-only,
 * similar email, address-only, or cross-merchant signals.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveIdentityIdForCustomer } from '@/lib/customers/identityNetwork';
import { emitIdentityObservations, signalsForEntity, type ObservationEntity } from '@/lib/identity/observations';
import { resolveIdentitiesForKeys, linkClaimToIdentity } from '@/lib/identity/resolver';
import { resolveMerchantCustomer } from '@/lib/identity/merchantCustomerResolver';
import { normaliseEmail } from '@/lib/identity/normalise';
import { TABLES } from '@/lib/supabase/tables';
import { captureTicketIdentitySignalsV2 } from '@/lib/support/intake/v2Bridge';

export type IdentityLinkConfidence = 'definite' | 'probable' | 'possible' | 'weak';
export type IdentityLinkOutcome = 'reused' | 'created' | 'unchanged' | 'insufficient';

export type ResolvePayoutCaseIdentityResult = {
  identityId: string | null;
  confidence: IdentityLinkConfidence | null;
  matchReason: string | null;
  outcome: IdentityLinkOutcome;
};

export type ResolvePayoutCaseIdentityInput = {
  merchantId: string;
  ticketId?: string | null;
  sourceOrderId?: string | null;
  sourceCustomerId?: string | null;
  customerEmail?: string | null;
  ticketEmail?: string | null;
  orderEmail?: string | null;
  provider?: string;
  observedAt?: string | null;
  rawTicket?: unknown;
  claimId?: string | null;
  phone?: string | null;
  shippingAddressRaw?: string | null;
  billingAddressRaw?: string | null;
  ip?: string | null;
};

type Client = SupabaseClient<any>;

const SOURCE_MAP = {
  gorgias: 'gorgias',
  zendesk: 'zendesk',
  freshdesk: 'freshdesk',
} as const;

function observationSource(provider: string): ObservationEntity['source'] {
  if (provider in SOURCE_MAP) return SOURCE_MAP[provider as keyof typeof SOURCE_MAP];
  return 'manual';
}

function gradeFromScore(score: number | null | undefined): IdentityLinkConfidence {
  if (score == null || !Number.isFinite(score)) return 'possible';
  if (score >= 85) return 'definite';
  if (score >= 65) return 'probable';
  if (score >= 45) return 'possible';
  return 'weak';
}

/**
 * Pick a single conservative email for identity linking.
 * Rejects when ticket/order/customer emails disagree after normalisation.
 */
export function pickConservativeLinkEmail(input: {
  customerEmail?: string | null;
  ticketEmail?: string | null;
  orderEmail?: string | null;
}): { email: string | null; matchReason: string | null; insufficientReason: string | null } {
  const customer = normaliseEmail(input.customerEmail);
  const ticket = normaliseEmail(input.ticketEmail);
  const order = normaliseEmail(input.orderEmail);

  const emails = [customer, ticket, order].filter(Boolean) as string[];
  if (emails.length === 0) {
    return { email: null, matchReason: null, insufficientReason: 'no_normalised_email' };
  }

  const unique = new Set(emails);
  if (unique.size > 1) {
    return {
      email: null,
      matchReason: null,
      insufficientReason: 'email_mismatch_across_ticket_order_customer',
    };
  }

  const email = emails[0]!;
  let matchReason = 'normalized_email_exact_match';
  if (customer && order) matchReason = 'shopify_source_customer_email';
  else if (ticket && order) matchReason = 'gorgias_ticket_email_matches_order_email';
  else if (customer) matchReason = 'shopify_source_customer_email';
  else if (ticket) matchReason = 'gorgias_ticket_email';

  return { email, matchReason, insufficientReason: null };
}

async function loadIdentityGrade(
  client: Client,
  identityId: string,
): Promise<IdentityLinkConfidence | null> {
  const { data } = await client
    .from('identities')
    .select('confidence_grade, confidence_score, superseded_by')
    .eq('id', identityId)
    .maybeSingle();
  if (!data || data.superseded_by) return null;
  const grade = data.confidence_grade;
  if (grade === 'definite' || grade === 'probable' || grade === 'possible' || grade === 'weak') {
    return grade;
  }
  return gradeFromScore(Number(data.confidence_score));
}

async function resolveViaStoredSignals(
  client: Client,
  merchantId: string,
  email: string,
  phone?: string | null,
): Promise<string | null> {
  return resolveIdentityIdForCustomer(client, merchantId, { email, phone });
}

async function resolveViaOrderSignals(
  client: Client,
  claimId: string,
  sourceOrderId: string,
): Promise<string | null> {
  return linkClaimToIdentity(client, claimId, sourceOrderId);
}

async function createViaObservations(
  client: Client,
  input: {
    merchantId: string;
    email: string;
    provider: string;
    observedAt: string | null;
    ticketId?: string | null;
    sourceCustomerId?: string | null;
    sourceOrderId?: string | null;
    platformCustomerExternalId?: string | null;
    helpdeskContactExternalId?: string | null;
  },
): Promise<{ identityId: string | null; created: boolean }> {
  const source = observationSource(input.provider);
  const entities: ObservationEntity[] = [];

  if (input.ticketId) {
    entities.push({
      provenance: { ticketId: input.ticketId },
      source,
      observedAt: input.observedAt,
      email: input.email,
      platformCustomerExternalId: input.platformCustomerExternalId ?? undefined,
      helpdeskContactExternalId: input.helpdeskContactExternalId ?? undefined,
    });
  }
  if (input.sourceCustomerId) {
    entities.push({
      provenance: { customerId: input.sourceCustomerId },
      source,
      observedAt: input.observedAt,
      email: input.email,
      platformCustomerExternalId: input.platformCustomerExternalId ?? undefined,
    });
  }
  if (input.sourceOrderId) {
    entities.push({
      provenance: { orderId: input.sourceOrderId },
      source,
      observedAt: input.observedAt,
      email: input.email,
    });
  }

  if (entities.length === 0) {
    return { identityId: null, created: false };
  }

  try {
    const { signalKeys } = await emitIdentityObservations(client, input.merchantId, entities);
    if (signalKeys.length === 0) return { identityId: null, created: false };

    // Keep the merchant-local canonical projection in step with support cases
    // even when the ticket arrived without a raw provider payload (the v2
    // bridge handles the richer signal set when one is available).
    for (const entity of entities) {
      try {
        const entityType = entity.provenance.ticketId
          ? 'source_ticket'
          : entity.provenance.customerId
            ? 'source_customer'
            : 'source_order';
        const entityId = (entity.provenance.ticketId ?? entity.provenance.customerId ?? entity.provenance.orderId)!;
        await resolveMerchantCustomer(
          client,
          {
            merchantId: input.merchantId,
            entityType,
            entityId,
            source,
            observedAt: input.observedAt,
            email: entity.email,
          },
          typeof signalsForEntity === 'function' ? signalsForEntity(entity) : signalKeys,
        );
      } catch (error) {
        console.error('merchant_local_customer_resolution_failed', {
          merchantId: input.merchantId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const beforeIds = new Set<string>();
    for (const key of signalKeys) {
      const { data: members } = await client
        .from('identity_members')
        .select('identity_id')
        .eq('identifier_type', key.type)
        .eq('identifier_hash', key.hash);
      for (const row of members ?? []) beforeIds.add(row.identity_id as string);
    }

    const summary = await resolveIdentitiesForKeys(client, signalKeys, 'payout_case_identity');
    const identityId = summary.identityIds[0] ?? null;
    const created = summary.created > 0 || (identityId != null && !beforeIds.has(identityId));
    return { identityId, created };
  } catch (error) {
    console.error('createViaObservations failed', {
      merchantId: input.merchantId,
      message: error instanceof Error ? error.message : String(error),
    });
    return { identityId: null, created: false };
  }
}

/**
 * Resolve or create a merchant-scoped identity for a payout case bridge.
 * Idempotent: repeated calls for the same merchant/customer reuse the same identity.
 */
export async function resolvePayoutCaseIdentity(
  client: Client,
  input: ResolvePayoutCaseIdentityInput,
): Promise<ResolvePayoutCaseIdentityResult> {
  const provider = input.provider ?? 'gorgias';
  const observedAt = input.observedAt ?? new Date().toISOString();

  let customerEmail = input.customerEmail ?? null;
  let orderEmail = input.orderEmail ?? null;
  let phone: string | null = null;
  let platformCustomerExternalId: string | null = null;

  if (input.sourceCustomerId) {
    const { data: customer } = await client
      .from('source_customers')
      .select('email, phone, external_id')
      .eq('id', input.sourceCustomerId)
      .eq('merchant_id', input.merchantId)
      .maybeSingle();
    if (customer) {
      customerEmail = customerEmail ?? (customer.email as string | null);
      phone = (customer.phone as string | null) ?? null;
      platformCustomerExternalId = (customer.external_id as string | null) ?? null;
    }
  }

  if (input.sourceOrderId) {
    const { data: order } = await client
      .from('source_orders')
      .select('email, source_customer_id')
      .eq('id', input.sourceOrderId)
      .eq('merchant_id', input.merchantId)
      .maybeSingle();
    if (order) {
      orderEmail = orderEmail ?? (order.email as string | null);
      if (!input.sourceCustomerId && order.source_customer_id) {
        const { data: orderCustomer } = await client
          .from('source_customers')
          .select('email, phone, external_id')
          .eq('id', order.source_customer_id as string)
          .eq('merchant_id', input.merchantId)
          .maybeSingle();
        if (orderCustomer) {
          customerEmail = customerEmail ?? (orderCustomer.email as string | null);
          phone = phone ?? (orderCustomer.phone as string | null) ?? null;
          platformCustomerExternalId =
            platformCustomerExternalId ?? (orderCustomer.external_id as string | null) ?? null;
        }
      }
    }
  }

  const { email, matchReason, insufficientReason } = pickConservativeLinkEmail({
    customerEmail,
    ticketEmail: input.ticketEmail,
    orderEmail,
  });

  if (!email) {
    return {
      identityId: null,
      confidence: null,
      matchReason: insufficientReason,
      outcome: 'insufficient',
    };
  }

  if (input.rawTicket && input.ticketId) {
    const identityIds = await captureTicketIdentitySignalsV2(client, {
      merchantId: input.merchantId,
      ticketId: input.ticketId,
      provider,
      rawTicket: input.rawTicket,
      observedAt,
      phone: input.phone,
      shippingAddressRaw: input.shippingAddressRaw,
      billingAddressRaw: input.billingAddressRaw,
      ip: input.ip,
    });
    if (identityIds[0]) {
      const confidence = await loadIdentityGrade(client, identityIds[0]);
      return {
        identityId: identityIds[0],
        confidence,
        matchReason: matchReason ?? 'ticket_intake_signals',
        outcome: 'created',
      };
    }
  }

  const reusedId = await resolveViaStoredSignals(client, input.merchantId, email, phone);
  if (reusedId) {
    const confidence = await loadIdentityGrade(client, reusedId);
    return {
      identityId: reusedId,
      confidence,
      matchReason: matchReason ?? 'existing_merchant_signal',
      outcome: 'reused',
    };
  }

  if (input.claimId && input.sourceOrderId) {
    const orderLinked = await resolveViaOrderSignals(client, input.claimId, input.sourceOrderId);
    if (orderLinked) {
      const confidence = await loadIdentityGrade(client, orderLinked);
      return {
        identityId: orderLinked,
        confidence,
        matchReason: 'existing_order_identity_signal',
        outcome: 'reused',
      };
    }
  }

  const { identityId, created } = await createViaObservations(client, {
    merchantId: input.merchantId,
    email,
    provider,
    observedAt,
    ticketId: input.ticketId,
    sourceCustomerId: input.sourceCustomerId,
    sourceOrderId: input.sourceOrderId,
    platformCustomerExternalId,
  });

  if (!identityId) {
    return {
      identityId: null,
      confidence: null,
      matchReason: insufficientReason ?? 'identity_resolution_failed',
      outcome: 'insufficient',
    };
  }

  const confidence = await loadIdentityGrade(client, identityId);
  return {
    identityId,
    confidence,
    matchReason: matchReason ?? 'normalized_email_exact_match',
    outcome: created ? 'created' : 'reused',
  };
}

/**
 * Attach a resolved identity to a payout case when identity_id is null.
 * Idempotent — no-op when already linked to the same identity.
 */
export async function attachIdentityToPayoutCase(
  client: Client,
  input: {
    merchantId: string;
    claimId: string;
    identityId: string;
  },
): Promise<{ updated: boolean; previousIdentityId: string | null }> {
  const { data: existing } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('identity_id')
    .eq('id', input.claimId)
    .eq('merchant_id', input.merchantId)
    .maybeSingle();

  if (!existing) {
    return { updated: false, previousIdentityId: null };
  }

  const previousIdentityId = (existing.identity_id as string | null) ?? null;
  if (previousIdentityId === input.identityId) {
    return { updated: false, previousIdentityId };
  }
  if (previousIdentityId) {
    return { updated: false, previousIdentityId };
  }

  const { error } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .update({ identity_id: input.identityId, updated_at: new Date().toISOString() })
    .eq('id', input.claimId)
    .eq('merchant_id', input.merchantId);

  if (error) throw new Error(`payout_case_identity_attach_failed: ${error.message}`);
  return { updated: true, previousIdentityId };
}

/**
 * E2E-merchant-only backfill for payout cases missing identity_id.
 */
export async function backfillPayoutCaseIdentitiesForMerchant(
  client: Client,
  input: {
    merchantId: string;
    claimIds?: string[];
    provider?: string;
  },
): Promise<Array<{ claimId: string; result: ResolvePayoutCaseIdentityResult; attached: boolean }>> {
  let query = client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id, source_ticket_id, source_order_id, identity_id, submitted_at')
    .eq('merchant_id', input.merchantId)
    .is('identity_id', null);

  if (input.claimIds?.length) {
    query = query.in('id', input.claimIds);
  }

  const { data: cases, error } = await query;
  if (error) throw new Error(`payout_case_backfill_lookup_failed: ${error.message}`);

  const results: Array<{ claimId: string; result: ResolvePayoutCaseIdentityResult; attached: boolean }> = [];

  for (const row of cases ?? []) {
    const claimId = row.id as string;
    let ticketEmail: string | null = null;
    let sourceCustomerId: string | null = null;
    const ticketId = row.source_ticket_id as string | null;

    if (ticketId) {
      const { data: ticket } = await client
        .from(TABLES.SUPPORT_CASE_INTAKE)
        .select('source_customer_id')
        .eq('id', ticketId)
        .eq('merchant_id', input.merchantId)
        .maybeSingle();
      sourceCustomerId = (ticket?.source_customer_id as string | null) ?? null;
      if (sourceCustomerId) {
        const { data: customer } = await client
          .from('source_customers')
          .select('email')
          .eq('id', sourceCustomerId)
          .eq('merchant_id', input.merchantId)
          .maybeSingle();
        ticketEmail = (customer?.email as string | null) ?? null;
      }
    }

    const result = await resolvePayoutCaseIdentity(client, {
      merchantId: input.merchantId,
      ticketId,
      sourceOrderId: row.source_order_id as string | null,
      sourceCustomerId,
      ticketEmail,
      claimId,
      provider: input.provider ?? 'gorgias',
      observedAt: (row.submitted_at as string | null) ?? null,
    });

    let attached = false;
    if (result.identityId) {
      const attach = await attachIdentityToPayoutCase(client, {
        merchantId: input.merchantId,
        claimId,
        identityId: result.identityId,
      });
      attached = attach.updated;
    }

    results.push({ claimId, result, attached });
  }

  return results;
}
