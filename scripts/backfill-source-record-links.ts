import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { shipBobOrdersUrl, shipBobShipmentUrl } from '@/lib/links/providerDeepLinks';

type Row = Record<string, any>;

function sameAccount(row: Row | undefined, sourceAccountId: string | null): boolean {
  return Boolean(row && (row.source_account_id ?? null) === sourceAccountId);
}

async function main() {
  const merchantId = process.argv[2]?.trim() ?? process.env.E2E_MERCHANT_ID?.trim();
  const apply = process.argv.includes('--apply');
  if (!merchantId) throw new Error('Usage: backfill-source-record-links <merchant-id> [--apply]');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const [{ data: records, error: recordsError }, { data: orders, error: ordersError }, { data: shipments, error: shipmentsError }, { data: fulfilments, error: fulfilmentsError }, { data: accounts, error: accountsError }, { data: integrations, error: integrationsError }] = await Promise.all([
    client.from('source_records').select('id,source_system,source_entity_type,external_id,source_url,source_account_id,connection_id').eq('merchant_id', merchantId).eq('source_system', 'shipbob'),
    client.from('source_orders').select('id,external_id,source_account_id').eq('merchant_id', merchantId).eq('source', 'shipbob'),
    client.from('source_shipments').select('id,external_id,source_order_id,source_account_id,source_record_id').eq('merchant_id', merchantId),
    client.from('source_fulfillments').select('id,external_id,source_order_id').eq('merchant_id', merchantId),
    client.from('source_accounts').select('id,connection_id,environment,provider_id').eq('merchant_id', merchantId).eq('provider_id', 'shipbob'),
    client.from('merchant_integrations').select('id,environment,provider_id').eq('merchant_id', merchantId).eq('provider_id', 'shipbob'),
  ]);
  const firstError = [recordsError, ordersError, shipmentsError, fulfilmentsError, accountsError, integrationsError].find(Boolean);
  if (firstError) throw new Error(`backfill_source_record_links_read_failed:${firstError.message}`);

  const accountById = new Map<string, Row>(((accounts ?? []) as Row[]).map((row) => [row.id, row]));
  const integrationById = new Map<string, Row>(((integrations ?? []) as Row[]).map((row) => [row.id, row]));
  const ordersRows = (orders ?? []) as Row[];
  const shipmentRows = (shipments ?? []) as Row[];
  const fulfilmentRows = (fulfilments ?? []) as Row[];
  const changes: Array<{ id: string; entityType: string; externalId: string; sourceUrl: string }> = [];
  const skipped: Array<{ id: string; entityType: string; externalId: string; reason: string }> = [];

  for (const record of (records ?? []) as Row[]) {
    const sourceAccountId = record.source_account_id ?? null;
    const account = sourceAccountId ? accountById.get(sourceAccountId) : undefined;
    const integration = account?.connection_id ? integrationById.get(account.connection_id) : record.connection_id ? integrationById.get(record.connection_id) : undefined;
    const environment = account?.environment ?? integration?.environment ?? 'production';
    const entityType = String(record.source_entity_type ?? '');
    const externalId = String(record.external_id ?? '');
    let sourceUrl: string | null = null;

    if (entityType === 'order') {
      const order = ordersRows.find((row) => row.external_id === externalId && sameAccount(row, sourceAccountId));
      const shipment = order
        ? shipmentRows.find((row) => row.source_order_id === order.id && sameAccount(row, sourceAccountId))
        : undefined;
      sourceUrl = shipment
        ? shipBobShipmentUrl(environment, externalId, String(shipment.external_id))
        : shipBobOrdersUrl(environment);
    } else if (entityType === 'shipment') {
      const shipment = shipmentRows.find((row) => (
        row.source_record_id === record.id ||
        (row.external_id === externalId && sameAccount(row, sourceAccountId))
      ));
      const order = shipment ? ordersRows.find((row) => row.id === shipment.source_order_id) : undefined;
      sourceUrl = order ? shipBobShipmentUrl(environment, String(order.external_id), externalId) : null;
    } else if (entityType === 'fulfilment') {
      const fulfilment = fulfilmentRows.find((row) => row.external_id === externalId);
      const order = fulfilment ? ordersRows.find((row) => row.id === fulfilment.source_order_id && sameAccount(row, sourceAccountId)) : undefined;
      sourceUrl = order ? shipBobShipmentUrl(environment, String(order.external_id), externalId) : null;
    }

    if (!sourceUrl) {
      skipped.push({ id: String(record.id), entityType, externalId, reason: 'no-supported-provider-detail-route' });
      continue;
    }
    if (record.source_url === sourceUrl) continue;
    changes.push({ id: String(record.id), entityType, externalId, sourceUrl });
  }

  if (apply) {
    for (const change of changes) {
      const { error } = await client.from('source_records').update({ source_url: change.sourceUrl }).eq('merchant_id', merchantId).eq('id', change.id);
      if (error) throw new Error(`backfill_source_record_links_write_failed:${error.message}`);
    }
  }

  console.log(JSON.stringify({ merchantId, mode: apply ? 'apply' : 'dry-run', scanned: (records ?? []).length, changed: changes.length, skipped: skipped.length, skippedByReason: skipped.reduce<Record<string, number>>((out, row) => { out[row.reason] = (out[row.reason] ?? 0) + 1; return out; }, {}) }));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });

