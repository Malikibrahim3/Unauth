import 'dotenv/config';
import { createServiceClient } from '@/lib/supabase/server';
import {
  resolveMerchantCustomer,
  syncPayoutCaseMerchantCustomer,
  type MerchantEntityType,
  type MerchantSignal,
} from '@/lib/identity/merchantCustomerResolver';

type BackfillRow = {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  source_customer_id?: string | null;
  merchant_customer_id?: string | null;
  source?: string | null;
  provider?: string | null;
  connection_id?: string | null;
  placed_at?: string | null;
  created_at_provider?: string | null;
};

async function loadSignals(client: any, merchantId: string, entityType: MerchantEntityType, entityId: string): Promise<MerchantSignal[]> {
  const { data, error } = await client
    .from('identity_signals')
    .select('identifier_type, identifier_hash')
    .eq('merchant_id', merchantId)
    .eq(entityType === 'source_customer' ? 'source_customer_id' : entityType === 'source_order' ? 'source_order_id' : 'source_ticket_id', entityId);
  if (error) throw new Error(`signal_lookup_failed:${entityType}:${entityId}:${error.message}`);
  return (data ?? []).map((row: any) => ({ type: row.identifier_type, hash: row.identifier_hash }));
}

async function backfillEntityType(client: any, merchantId: string, entityType: MerchantEntityType): Promise<number> {
  const table = entityType === 'source_customer' ? 'source_customers' : entityType === 'source_order' ? 'source_orders' : 'source_tickets';
  const select = entityType === 'source_customer'
    ? 'id,email,first_name,last_name,source,connection_id,merchant_customer_id,updated_at'
    : entityType === 'source_order'
      ? 'id,email,source,connection_id,source_customer_id,merchant_customer_id,placed_at'
      : 'id,provider,connection_id,source_customer_id,merchant_customer_id,created_at_provider';
  const { data, error } = await client.from(table).select(select).eq('merchant_id', merchantId).limit(100000);
  if (error) throw new Error(`entity_lookup_failed:${entityType}:${error.message}`);

  let resolved = 0;
  for (const row of (data ?? []) as BackfillRow[]) {
    const signals = await loadSignals(client, merchantId, entityType, row.id);
    const result = await resolveMerchantCustomer(client, {
      merchantId,
      entityType,
      entityId: row.id,
      source: row.source ?? row.provider ?? null,
      sourceAccountKey: row.connection_id,
      observedAt: row.placed_at ?? row.created_at_provider ?? null,
      email: row.email,
      displayName: [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || null,
    }, signals);
    if (result.merchantCustomerId) resolved += 1;
  }
  return resolved;
}

async function backfillCases(client: any, merchantId: string): Promise<number> {
  const { data, error } = await client
    .from('support_payout_cases')
    .select('id')
    .eq('merchant_id', merchantId)
    .limit(100000);
  if (error) throw new Error(`case_lookup_failed:${error.message}`);

  let linked = 0;
  for (const row of data ?? []) {
    const customerId = await syncPayoutCaseMerchantCustomer(client, merchantId, row.id);
    if (customerId) linked += 1;
  }
  return linked;
}

async function main() {
  const merchantId = process.argv[2]?.trim() ?? process.env.MERCHANT_ID?.trim();
  if (!merchantId) throw new Error('Usage: npm run backfill:merchant-customers -- <merchant-id>');
  const client = createServiceClient();
  const customers = await backfillEntityType(client, merchantId, 'source_customer');
  const orders = await backfillEntityType(client, merchantId, 'source_order');
  const tickets = await backfillEntityType(client, merchantId, 'source_ticket');
  const cases = await backfillCases(client, merchantId);
  console.log(JSON.stringify({ merchantId, customers, orders, tickets, cases }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
