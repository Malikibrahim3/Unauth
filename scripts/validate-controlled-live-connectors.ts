import { createServiceClient } from '@/lib/supabase/server';
import { verifyMerchantLiveConnections } from '@/lib/connections/liveVerification';
import { runShipBobAccountSync } from '@/lib/integrations/providers/shipbobSync';
import { requiredControlledAccountEnv } from '@/scripts/e2e/controlledAccountEnv';

async function main() {
const merchantId = requiredControlledAccountEnv('E2E_MERCHANT_ID');
const shouldSyncShipBob = process.argv.includes('--sync-shipbob');
const client = createServiceClient();

const health = await verifyMerchantLiveConnections(client, merchantId);
const safeHealth = Object.fromEntries(
  Object.entries(health).map(([provider, result]) => [
    provider,
    result ? { status: result.status, reason: result.reason ?? null } : null,
  ]),
);

let shipbobSync: Record<string, unknown> | null = null;
if (shouldSyncShipBob) {
  const { data: connections, error: connectionError } = await client
    .from('merchant_integrations')
    .select('id,status')
    .eq('merchant_id', merchantId)
    .eq('provider_id', 'shipbob')
    .in('status', ['pending', 'connected', 'degraded', 'syncing'])
    .limit(2);
  if (connectionError) throw new Error('controlled_shipbob_connection_lookup_failed');
  if (connections?.length !== 1) throw new Error('controlled_shipbob_connection_not_unique');
  const connectionId = connections[0].id;

  const { data: accounts, error: accountError } = await client
    .from('source_accounts')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('connection_id', connectionId)
    .limit(2);
  if (accountError) throw new Error('controlled_shipbob_account_lookup_failed');
  if (accounts?.length !== 1) throw new Error('controlled_shipbob_account_not_unique');
  const sourceAccountId = accounts[0].id;

  const result = await runShipBobAccountSync(client, {
    merchantId,
    connectionId,
    sourceAccountId,
  });

  const { data: sourceOrders, error: ordersError } = await client
    .from('source_orders')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('source', 'shipbob')
    .eq('source_account_id', sourceAccountId);
  if (ordersError) throw new Error('controlled_shipbob_orders_check_failed');
  const sourceOrderIds = (sourceOrders ?? []).map((row: { id: string }) => row.id);

  const [records, fulfillments, locations, shipments, returns] = await Promise.all([
    client.from('source_records').select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId).eq('connection_id', connectionId),
    sourceOrderIds.length > 0
      ? client.from('source_fulfillments').select('id', { count: 'exact', head: true })
          .eq('merchant_id', merchantId).in('source_order_id', sourceOrderIds)
      : Promise.resolve({ count: 0, error: null }),
    client.from('source_locations').select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId).eq('source_account_id', sourceAccountId),
    client.from('source_shipments').select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId).eq('source_account_id', sourceAccountId),
    client.from('source_returns').select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId).eq('source_account_id', sourceAccountId),
  ]);

  if ([records, fulfillments, locations, shipments, returns].some((query) => query.error)) {
    throw new Error('controlled_shipbob_count_check_failed');
  }

  shipbobSync = {
    ran: result.ran,
    status: result.ran ? result.state.status : result.reason,
    counts: {
      records: records.count ?? 0,
      orders: sourceOrderIds.length,
      fulfillments: fulfillments.count ?? 0,
      locations: locations.count ?? 0,
      shipments: shipments.count ?? 0,
      returns: returns.count ?? 0,
    },
  };
}

console.log(JSON.stringify({ health: safeHealth, shipbobSync }, null, 2));
}

main().catch(() => {
  console.error('controlled_live_validation_failed');
  process.exitCode = 1;
});
