import type { SupabaseClient } from '@supabase/supabase-js';
import { extractOrderRefFromText } from '@/lib/support/intake/store';

export type ResolvedTicketOrder = {
  sourceOrderId: string | null;
  orderRef: string | null;
  totalPrice: number | null;
  currency: string | null;
  matchMethod: 'order_ref' | 'email_fallback' | null;
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

async function lookupOrderByEmail(
  supabase: SupabaseClient,
  merchantId: string,
  email: string,
  preferredOrderRef?: string | null,
): Promise<{ id: string; total_price: number | null; currency: string | null; order_number: string | null } | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  if (preferredOrderRef) {
    const byRef = await lookupOrderByRef(supabase, merchantId, preferredOrderRef);
    if (byRef) {
      const { data } = await supabase
        .from('source_orders')
        .select('order_number')
        .eq('id', byRef.id)
        .maybeSingle();
      return { ...byRef, order_number: (data?.order_number as string | null) ?? null };
    }
  }

  const { data: rows } = await supabase
    .from('source_orders')
    .select('id, total_price, currency, order_number, placed_at')
    .eq('merchant_id', merchantId)
    .ilike('email', normalizedEmail)
    .order('placed_at', { ascending: false })
    .limit(5);

  const match = (rows ?? [])[0];
  if (!match?.id) return null;
  return {
    id: match.id as string,
    total_price: match.total_price != null ? Number(match.total_price) : null,
    currency: (match.currency as string | null) ?? null,
    order_number: (match.order_number as string | null) ?? null,
  };
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

  if (email) {
    const preferredRef = refs.values().next().value as string | undefined;
    const order = await lookupOrderByEmail(supabase, input.merchantId, email, preferredRef ?? null);
    if (order) {
      return {
        sourceOrderId: order.id,
        orderRef: order.order_number ?? preferredRef ?? null,
        totalPrice: order.total_price,
        currency: order.currency,
        matchMethod: 'email_fallback',
      };
    }
  }

  return {
    sourceOrderId: null,
    orderRef: refs.values().next().value ?? null,
    totalPrice: null,
    currency: null,
    matchMethod: null,
  };
}
