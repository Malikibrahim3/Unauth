/**
 * v2 bridge for helpdesk ticket intake: commerce linkage, claim creation and
 * identity-signal emission against the v2 schema (source_tickets / claims /
 * identity_signals). Replaces the legacy customer_profiles / merchant_claims /
 * bulk_upsert_* paths that were dropped at the 2026-06-11 cutover.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { emitIdentityObservations, type ObservationEntity } from '@/lib/identity/observations';
import { resolveIdentitiesForKeys } from '@/lib/identity/resolver';
import { normaliseAddress } from '@/lib/identity/normalise';

type Client = SupabaseClient<any>;

export type TicketCustomerRefs = {
  /** helpdesk contact id (e.g. Gorgias customer.id) */
  contactId: string | null;
  /** commerce-platform customer id the helpdesk linked (customer.external_id) */
  platformCustomerExternalId: string | null;
  email: string | null;
  phone: string | null;
};

export function extractTicketCustomer(rawTicket: unknown): TicketCustomerRefs {
  const empty: TicketCustomerRefs = { contactId: null, platformCustomerExternalId: null, email: null, phone: null };
  if (!rawTicket || typeof rawTicket !== 'object') return empty;
  const ticket = (rawTicket as Record<string, unknown>).ticket ?? rawTicket;
  if (!ticket || typeof ticket !== 'object') return empty;
  const customer = (ticket as Record<string, unknown>).customer;
  if (!customer || typeof customer !== 'object') return empty;
  const c = customer as Record<string, unknown>;
  const str = (v: unknown) => {
    if (v == null) return null;
    const s = String(v).trim();
    return s.length > 0 ? s : null;
  };
  return {
    contactId: str(c.id),
    platformCustomerExternalId: str(c.external_id),
    email: str(c.email),
    phone: str(c.phone),
  };
}

export type TicketLinkResult = {
  link_status: 'linked' | 'unlinked';
  source_customer_id: string | null;
  source_order_id: string | null;
  /** commerce-platform order id (external), kept for legacy response shape */
  shopify_order_id: string | null;
};

/**
 * Resolves the ticket's customer to a source_customers row (via the helpdesk
 * external_id link, falling back to email) and its order_ref to a
 * source_orders row, then persists both links on the source_tickets row.
 */
export async function linkTicketToCommerceV2(
  supabase: Client,
  input: { merchantId: string; ticketId: string; orderRef: string | null; rawTicket: unknown }
): Promise<TicketLinkResult> {
  const refs = extractTicketCustomer(input.rawTicket);

  let customerId: string | null = null;
  if (refs.platformCustomerExternalId) {
    const { data } = await supabase.from('source_customers')
      .select('id')
      .eq('merchant_id', input.merchantId)
      .eq('external_id', refs.platformCustomerExternalId)
      .limit(1).maybeSingle();
    customerId = data?.id ?? null;
  }
  if (!customerId && refs.email) {
    const { data } = await supabase.from('source_customers')
      .select('id')
      .eq('merchant_id', input.merchantId)
      .ilike('email', refs.email)
      .limit(1).maybeSingle();
    customerId = data?.id ?? null;
  }

  let orderId: string | null = null;
  let orderExternalId: string | null = null;
  if (input.orderRef) {
    const ref = input.orderRef.replace(/^#/, '').trim();
    if (ref) {
      const { data } = await supabase.from('source_orders')
        .select('id, external_id')
        .eq('merchant_id', input.merchantId)
        .or(`order_number.eq.${ref},external_id.eq.${ref}`)
        .limit(1).maybeSingle();
      orderId = data?.id ?? null;
      orderExternalId = data?.external_id ?? null;
    }
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (customerId) patch.source_customer_id = customerId;
  if (input.orderRef) patch.linked_order_external_ids = [input.orderRef.replace(/^#/, '').trim()];
  const { error } = await supabase.from('source_tickets')
    .update(patch)
    .eq('id', input.ticketId)
    .eq('merchant_id', input.merchantId);
  if (error) throw new Error(`ticket_link_update_failed: ${error.message}`);

  return {
    link_status: customerId || orderId ? 'linked' : 'unlinked',
    source_customer_id: customerId,
    source_order_id: orderId,
    shopify_order_id: orderExternalId,
  };
}

/**
 * Emits hashed identity observations for the ticket (email, helpdesk contact,
 * plus any commerce identifiers visible on the raw payload) and runs the
 * resolution engine. Best-effort: failures log but never break ingestion.
 */
export async function captureTicketIdentitySignalsV2(
  supabase: Client,
  input: {
    merchantId: string;
    ticketId: string;
    provider: string;
    rawTicket: unknown;
    observedAt: string | null;
    phone?: string | null;
    shippingAddressRaw?: string | null;
    billingAddressRaw?: string | null;
    ip?: string | null;
  }
): Promise<string[]> {
  try {
    const refs = extractTicketCustomer(input.rawTicket);
    const source = (['gorgias', 'zendesk', 'freshdesk'].includes(input.provider)
      ? input.provider : 'manual') as ObservationEntity['source'];
    const entity: ObservationEntity = {
      provenance: { ticketId: input.ticketId },
      source,
      observedAt: input.observedAt,
      email: refs.email,
      phone: input.phone ?? refs.phone,
      ip: input.ip ?? null,
      shippingNormalized: normaliseAddress(input.shippingAddressRaw ?? null),
      billingNormalized: normaliseAddress(input.billingAddressRaw ?? null),
      helpdeskContactExternalId: refs.contactId,
    };
    const { signalKeys } = await emitIdentityObservations(supabase, input.merchantId, [entity]);
    if (signalKeys.length === 0) return [];
    const summary = await resolveIdentitiesForKeys(supabase, signalKeys);
    return summary.identityIds;
  } catch (error) {
    console.error('captureTicketIdentitySignalsV2 failed', {
      merchantId: input.merchantId,
      ticketId: input.ticketId,
      message: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

const TICKET_CLAIM_TYPE_MAP: Record<string, string> = {
  INR: 'item_not_received',
  damaged: 'damaged',
  wrong_item: 'wrong_item',
  not_as_described: 'not_as_described',
  other: 'other',
};

const DETECTION_METHOD_MAP: Record<string, string> = {
  tag: 'tag',
  keyword_fallback: 'keyword',
  manual: 'manual',
  shopify_dispute: 'platform_dispute',
};

/**
 * Creates (or confirms) a v2 claim anchored to the ticket when classification
 * marked it as a claim. Returns the claim id, or null when not a claim.
 */
export async function ensureClaimForTicketV2(
  supabase: Client,
  input: {
    merchantId: string;
    ticketId: string;
    sourceOrderId: string | null;
    identityId: string | null;
    isClaim: boolean;
    claimType: string | null;
    claimReason: string | null;
    detectionMethod: string;
    triggerTags: string[];
    requiresReview: boolean;
    submittedAt: string | null;
  }
): Promise<string | null> {
  if (!input.isClaim) return null;
  const claimType = TICKET_CLAIM_TYPE_MAP[input.claimType ?? 'other'] ?? 'other';
  const detectionMethod = DETECTION_METHOD_MAP[input.detectionMethod] ?? 'keyword';

  const { data: existing, error: le } = await supabase.from('claims')
    .select('id')
    .eq('merchant_id', input.merchantId)
    .eq('source_ticket_id', input.ticketId)
    .eq('claim_type', claimType)
    .limit(1).maybeSingle();
  if (le) throw new Error(`ticket_claim_lookup_failed: ${le.message}`);
  if (existing) return existing.id;

  const { data: claim, error } = await supabase.from('claims').insert({
    merchant_id: input.merchantId,
    source_ticket_id: input.ticketId,
    source_order_id: input.sourceOrderId,
    identity_id: input.identityId,
    claim_type: claimType,
    status: 'open',
    detection_method: detectionMethod,
    detection_detail: { trigger_tags: input.triggerTags, source: 'helpdesk_intake' },
    reason_raw: input.claimReason,
    requires_review: input.requiresReview,
    submitted_at: input.submittedAt ?? new Date().toISOString(),
  }).select('id').single();
  if (error) throw new Error(`ticket_claim_insert_failed: ${error.message}`);

  const { error: ee } = await supabase.from('claim_events').insert({
    claim_id: claim.id,
    merchant_id: input.merchantId,
    event_type: 'created',
    to_status: 'open',
    metadata: { source: 'helpdesk_intake', detection_method: detectionMethod, trigger_tags: input.triggerTags },
  });
  if (ee) throw new Error(`ticket_claim_event_failed: ${ee.message}`);

  return claim.id;
}
