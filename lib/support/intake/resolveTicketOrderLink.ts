import type { SupabaseClient } from '@supabase/supabase-js';
import { extractOrderRefFromText } from '@/lib/support/intake/store';

export type ResolvedTicketOrder = {
  sourceOrderId: string | null;
  orderRef: string | null;
  totalPrice: number | null;
  currency: string | null;
  matchMethod: 'order_ref' | 'email_fallback' | null;
  /**
   * Explicit match state. `confirmed` for a unique order-ref hit or a unique
   * email hit; `ambiguous` when an email matches several orders (no silent
   * pick — sourceOrderId stays null and candidateOrderIds lists them);
   * `unmatched` when nothing resolves.
   */
  matchStatus: 'confirmed' | 'ambiguous' | 'unmatched';
  candidateOrderIds: string[];
};

function readLinkedOrderRefs(linked: unknown): string[] {
  if (!Array.isArray(linked)) return [];
  return linked
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.replace(/^#/, '').trim());
}

async function lookupOrderByRef(
  supabase: SupabaseClient,
  merchantId: string,
  ref: string,
): Promise<{ id: string; total_price: number | null; currency: string | null } | null> {
  const normalized = ref.replace(/^#/, '').trim();
  if (!normalized) return null;

  const { data } = await supabase
    .from('source_orders')
    .select('id, total_price, currency')
    .eq('merchant_id', merchantId)
    .or(`order_number.eq.${normalized},external_id.eq.${normalized}`)
    .limit(1)
    .maybeSingle();

  if (!data?.id) return null;
  return {
    id: data.id as string,
    total_price: data.total_price != null ? Number(data.total_price) : null,
    currency: (data.currency as string | null) ?? null,
  };
}

type EmailOrderMatch = { id: string; total_price: number | null; currency: string | null; order_number: string | null };

/**
 * Returns every order matching the email. The caller decides confirmed vs
 * ambiguous — this never silently picks the newest of several.
 */
async function lookupOrdersByEmail(
  supabase: SupabaseClient,
  merchantId: string,
  email: string,
): Promise<EmailOrderMatch[]> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return [];

  const { data: rows } = await supabase
    .from('source_orders')
    .select('id, total_price, currency, order_number, placed_at')
    .eq('merchant_id', merchantId)
    .ilike('email', normalizedEmail)
    .order('placed_at', { ascending: false })
    .limit(25);

  return ((rows ?? []) as Array<Record<string, unknown>>)
    .filter((r) => typeof r.id === 'string')
    .map((r) => ({
      id: r.id as string,
      total_price: r.total_price != null ? Number(r.total_price) : null,
      currency: (r.currency as string | null) ?? null,
      order_number: (r.order_number as string | null) ?? null,
    }));
}

/**
 * Resolves a helpdesk ticket to a merchant-scoped source_orders row.
 * Priority: explicit order ref → subject/body #ref → linked_order_external_ids → customer email.
 */
export async function resolveTicketOrderLink(
  supabase: SupabaseClient,
  input: {
    merchantId: string;
    orderRef?: string | null;
    subject?: string | null;
    bodyText?: string | null;
    linkedOrderExternalIds?: unknown;
    customerEmail?: string | null;
    sourceCustomerId?: string | null;
  },
): Promise<ResolvedTicketOrder> {
  const refs = new Set<string>();
  for (const ref of [
    input.orderRef,
    ...readLinkedOrderRefs(input.linkedOrderExternalIds),
    extractOrderRefFromText(input.subject ?? ''),
    extractOrderRefFromText(input.bodyText ?? ''),
  ]) {
    if (ref?.trim()) refs.add(ref.replace(/^#/, '').trim());
  }

  for (const ref of refs) {
    const order = await lookupOrderByRef(supabase, input.merchantId, ref);
    if (order) {
      return {
        sourceOrderId: order.id,
        orderRef: ref,
        totalPrice: order.total_price,
        currency: order.currency,
        matchMethod: 'order_ref',
        matchStatus: 'confirmed',
        candidateOrderIds: [order.id],
      };
    }
  }

  let email = input.customerEmail?.trim() || null;
  if (!email && input.sourceCustomerId) {
    const { data: customer } = await supabase
      .from('source_customers')
      .select('email')
      .eq('id', input.sourceCustomerId)
      .eq('merchant_id', input.merchantId)
      .maybeSingle();
    email = (customer?.email as string | undefined) ?? null;
  }

  const preferredRef = (refs.values().next().value as string | undefined) ?? null;

  if (email) {
    const matches = await lookupOrdersByEmail(supabase, input.merchantId, email);
    if (matches.length === 1) {
      const order = matches[0];
      return {
        sourceOrderId: order.id,
        orderRef: order.order_number ?? preferredRef,
        totalPrice: order.total_price,
        currency: order.currency,
        matchMethod: 'email_fallback',
        matchStatus: 'confirmed',
        candidateOrderIds: [order.id],
      };
    }
    if (matches.length > 1) {
      // Ambiguous: several orders share this email. Do not silently pick one.
      return {
        sourceOrderId: null,
        orderRef: preferredRef,
        totalPrice: null,
        currency: null,
        matchMethod: 'email_fallback',
        matchStatus: 'ambiguous',
        candidateOrderIds: matches.map((m) => m.id),
      };
    }
  }

  return {
    sourceOrderId: null,
    orderRef: preferredRef,
    totalPrice: null,
    currency: null,
    matchMethod: null,
    matchStatus: 'unmatched',
    candidateOrderIds: [],
  };
}
