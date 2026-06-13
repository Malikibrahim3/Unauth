import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

export type CheckoutSignalPlatform = 'shopify' | 'woocommerce' | 'bigcommerce';

export type LinkCheckoutSignalsInput = {
  merchantId: string;
  platformOrderId: string;
  visitorId: string;
  platform: CheckoutSignalPlatform;
  lookbackMs?: number;
};

export async function linkCheckoutSignalsToOrder(
  supabase: SupabaseClient,
  input: LinkCheckoutSignalsInput
): Promise<{ linked: number; orderId: string | null }> {
  const since = new Date(Date.now() - (input.lookbackMs ?? 86_400_000)).toISOString();

  const { data: signals, error: signalError } = await supabase
    .from(TABLES.CHECKOUT_SIGNALS)
    .select('id')
    .eq('merchant_id', input.merchantId)
    .eq('visitor_id', input.visitorId)
    .gte('created_at', since);
  if (signalError) throw new Error(`checkout_signal_lookup_failed: ${signalError.message}`);
  if (!signals?.length) return { linked: 0, orderId: null };

  const { data: order, error: orderError } = await supabase
    .from(TABLES.AUDIT_TRANSACTIONS)
    .select('id')
    .eq('merchant_id', input.merchantId)
    .eq('source', input.platform)
    .eq('external_id', input.platformOrderId)
    .maybeSingle();
  if (orderError) throw new Error(`checkout_signal_order_lookup_failed: ${orderError.message}`);
  if (!order?.id) return { linked: 0, orderId: null };

  const rows = signals.map((signal: { id: string }) => ({
    checkout_signal_id: signal.id,
    order_id: order.id,
    merchant_id: input.merchantId,
  }));

  const { error: linkError } = await supabase
    .from(TABLES.CHECKOUT_SIGNAL_ORDER_LINKS)
    .upsert(rows, { onConflict: 'checkout_signal_id,order_id', ignoreDuplicates: true });
  if (linkError) throw new Error(`checkout_signal_order_link_failed: ${linkError.message}`);

  return { linked: rows.length, orderId: order.id };
}
