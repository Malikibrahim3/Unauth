import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

export type InferredPaymentProcessor = 'stripe' | 'paypal' | 'adyen' | 'other';

function normalizeGateway(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, '_');
}

function gatewayToProcessor(gateway: string): InferredPaymentProcessor | null {
  const normalized = normalizeGateway(gateway);
  if (!normalized) return null;
  if (normalized.includes('shopify_payment')) return null;
  if (normalized.includes('stripe')) return 'stripe';
  if (normalized.includes('paypal')) return 'paypal';
  if (normalized.includes('adyen')) return 'adyen';
  return 'other';
}

function topProcessor(counts: Map<InferredPaymentProcessor, number>): InferredPaymentProcessor | null {
  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export async function inferPaymentProcessor(
  client: SupabaseClient,
  merchantId: string,
): Promise<InferredPaymentProcessor | null> {
  const { data: orderRows, error: orderError } = await client
    .from(TABLES.AUDIT_TRANSACTIONS)
    .select('payment_gateway')
    .eq('merchant_id', merchantId)
    .not('payment_gateway', 'is', null)
    .order('placed_at', { ascending: false })
    .limit(25);

  if (orderError) {
    throw new Error(`payment_gateway_inference_failed: ${orderError.message}`);
  }

  const counts = new Map<InferredPaymentProcessor, number>();
  for (const row of orderRows ?? []) {
    const gateway = (row as { payment_gateway?: string | null }).payment_gateway;
    if (!gateway) continue;
    const processor = gatewayToProcessor(gateway);
    if (!processor) continue;
    counts.set(processor, (counts.get(processor) ?? 0) + 1);
  }

  return topProcessor(counts);
}
