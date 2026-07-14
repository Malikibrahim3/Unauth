import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function readAll(table, columns) {
  const rows = [];
  const pageSize = 1_000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table} preflight read failed: ${error.code ?? 'query_failed'}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function readSourceOrders() {
  try {
    return await readAll(
      'source_orders',
      'id,merchant_id,source,connection_id,source_account_id,external_id,raw_payload_hash',
    );
  } catch (error) {
    if (!(error instanceof Error) || !error.message.endsWith(': 42703')) throw error;
    const rows = await readAll(
      'source_orders',
      'id,merchant_id,source,connection_id,external_id,raw_payload_hash',
    );
    return rows.map((row) => ({ ...row, source_account_id: null }));
  }
}

const key = (...parts) => parts.map((part) => part ?? '<null>').join('\u001f');

function duplicateGroups(rows, keyForRow) {
  const counts = new Map();
  for (const row of rows) {
    const group = keyForRow(row);
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return [...counts.values()].filter((count) => count > 1).length;
}

function crossMerchantGroups(rows, keyForRow) {
  const groups = new Map();
  for (const row of rows) {
    const group = keyForRow(row);
    if (group === null) continue;
    const merchants = groups.get(group) ?? new Set();
    merchants.add(row.merchant_id);
    groups.set(group, merchants);
  }
  return [...groups.values()].filter((merchants) => merchants.size > 1).length;
}

function parentMismatchCount(rows, foreignKey, parents) {
  let count = 0;
  for (const row of rows) {
    const parentId = row[foreignKey];
    if (!parentId) continue;
    if (parents.get(parentId) !== row.merchant_id) count += 1;
  }
  return count;
}

const [
  integrations,
  stores,
  helpdesks,
  credentials,
  jobs,
  accounts,
  records,
  ingestionEvents,
  domainEvents,
  deliveries,
  orders,
  customers,
  disputes,
  fulfillments,
  locations,
  shipments,
  returns,
] = await Promise.all([
  readAll('merchant_integrations', 'id,merchant_id,provider_id,provider_account_id,environment,status,updated_at'),
  readAll('store_connections', 'id,merchant_id,platform,store_key,status,uninstalled_at'),
  readAll('helpdesk_connections', 'id,merchant_id,provider,provider_account_id,status'),
  readAll('integration_credentials', 'id,merchant_id,provider_id,connection_id'),
  readAll('sync_jobs', 'id,merchant_id,connection_id,source_account_id,status,job_kind'),
  readAll('source_accounts', 'id,merchant_id,connection_id'),
  readAll('source_records', 'id,merchant_id,connection_id,source_account_id'),
  readAll('ingestion_events', 'id,merchant_id,connection_id'),
  readAll('domain_events', 'id,merchant_id,connection_id,ingestion_event_id,source_record_id'),
  readAll('domain_event_deliveries', 'id,merchant_id,domain_event_id'),
  readSourceOrders(),
  readAll('source_customers', 'id,merchant_id,source,connection_id,external_id'),
  readAll('source_disputes', 'id,merchant_id,source_order_id,external_id'),
  readAll('source_fulfillments', 'id,merchant_id,source_order_id'),
  readAll('source_locations', 'id,merchant_id,source_account_id,source_record_id'),
  readAll('source_shipments', 'id,merchant_id,source_account_id,source_order_id,source_fulfillment_id,source_record_id'),
  readAll('source_returns', 'id,merchant_id,source_account_id,source_order_id,source_record_id'),
]);

const integrationMerchant = new Map(integrations.map((row) => [row.id, row.merchant_id]));
const accountMerchant = new Map(accounts.map((row) => [row.id, row.merchant_id]));
const recordMerchant = new Map(records.map((row) => [row.id, row.merchant_id]));
const ingestionMerchant = new Map(ingestionEvents.map((row) => [row.id, row.merchant_id]));
const eventMerchant = new Map(domainEvents.map((row) => [row.id, row.merchant_id]));
const orderMerchant = new Map(orders.map((row) => [row.id, row.merchant_id]));
const fulfillmentMerchant = new Map(fulfillments.map((row) => [row.id, row.merchant_id]));
const recordAccount = new Map(records.map((row) => [row.id, row.source_account_id]));

const activeIntegration = (row) => ['pending', 'connected', 'degraded', 'syncing'].includes(row.status);
const activeStore = (row) => row.status === 'active' && !row.uninstalled_at;
const activeHelpdesk = (row) => row.status === 'active';

const predictedCredentialConnections = credentials.map((credential) => {
  if (credential.connection_id) return credential.connection_id;
  const candidates = integrations
    .filter((row) => row.merchant_id === credential.merchant_id && row.provider_id === credential.provider_id)
    .sort((left, right) => {
      const leftRank = activeIntegration(left) ? 0 : 1;
      const rightRank = activeIntegration(right) ? 0 : 1;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return String(right.updated_at).localeCompare(String(left.updated_at));
    });
  return candidates[0]?.id ?? null;
});

let ambiguousCredentialBackfills = 0;
for (const credential of credentials.filter((row) => !row.connection_id)) {
  const candidates = integrations.filter(
    (row) => row.merchant_id === credential.merchant_id && row.provider_id === credential.provider_id,
  );
  const activeCandidates = candidates.filter(activeIntegration);
  if (candidates.length > 1 && activeCandidates.length !== 1) ambiguousCredentialBackfills += 1;
}

const predictedOrders = orders.map((order) => {
  if (order.source !== 'shipbob' || order.source_account_id || !order.raw_payload_hash) return order;
  return { ...order, source_account_id: recordAccount.get(order.raw_payload_hash) ?? null };
});

const checks = {
  ownership: {
    integrationCrossMerchantAccounts: crossMerchantGroups(
      integrations,
      (row) => row.provider_account_id && key(row.provider_id, row.environment ?? 'production', row.provider_account_id),
    ),
    storeCrossMerchantAccounts: crossMerchantGroups(stores, (row) => key(row.platform, row.store_key)),
    helpdeskCrossMerchantAccounts: crossMerchantGroups(
      helpdesks,
      (row) => row.provider_account_id && key(row.provider, row.provider_account_id),
    ),
    duplicateActiveIntegrations: duplicateGroups(integrations.filter(activeIntegration), (row) => key(row.merchant_id, row.provider_id)),
    duplicateActiveStores: duplicateGroups(stores.filter(activeStore), (row) => key(row.merchant_id, row.platform)),
    duplicateActiveHelpdesks: duplicateGroups(helpdesks.filter(activeHelpdesk), (row) => key(row.merchant_id, row.provider)),
  },
  credentials: {
    unresolvedBackfills: predictedCredentialConnections.filter((connectionId) => !connectionId).length,
    ambiguousBackfills: ambiguousCredentialBackfills,
    duplicatePredictedConnections: duplicateGroups(
      predictedCredentialConnections.map((connection_id) => ({ connection_id })),
      (row) => key(row.connection_id),
    ),
    existingMerchantMismatches: parentMismatchCount(credentials, 'connection_id', integrationMerchant),
  },
  jobs: {
    duplicateActiveConnectionWork: duplicateGroups(
      jobs.filter(
        (row) => ['pending', 'running'].includes(row.status)
          && ['initial_import', 'incremental_sync'].includes(row.job_kind)
          && row.connection_id,
      ),
      (row) => key(row.merchant_id, row.connection_id),
    ),
  },
  uniqueness: {
    sourceOrders: duplicateGroups(predictedOrders, (row) => key(row.merchant_id, row.source, row.connection_id, row.source_account_id, row.external_id)),
    sourceCustomers: duplicateGroups(customers, (row) => key(row.merchant_id, row.source, row.connection_id, row.external_id)),
    sourceDisputes: duplicateGroups(disputes, (row) => key(row.merchant_id, row.source_order_id, row.external_id)),
  },
  tenantConsistency: {
    sourceAccountsConnection: parentMismatchCount(accounts, 'connection_id', integrationMerchant),
    sourceRecordsConnection: parentMismatchCount(records, 'connection_id', integrationMerchant),
    sourceRecordsAccount: parentMismatchCount(records, 'source_account_id', accountMerchant),
    syncJobsConnection: parentMismatchCount(jobs, 'connection_id', integrationMerchant),
    syncJobsAccount: parentMismatchCount(jobs, 'source_account_id', accountMerchant),
    ingestionEventsConnection: parentMismatchCount(ingestionEvents, 'connection_id', integrationMerchant),
    domainEventsConnection: parentMismatchCount(domainEvents, 'connection_id', integrationMerchant),
    domainEventsIngestion: parentMismatchCount(domainEvents, 'ingestion_event_id', ingestionMerchant),
    domainEventsSourceRecord: parentMismatchCount(domainEvents, 'source_record_id', recordMerchant),
    deliveriesEvent: parentMismatchCount(deliveries, 'domain_event_id', eventMerchant),
    sourceOrdersAccount: parentMismatchCount(predictedOrders, 'source_account_id', accountMerchant),
    sourceFulfillmentsOrder: parentMismatchCount(fulfillments, 'source_order_id', orderMerchant),
    sourceLocationsAccount: parentMismatchCount(locations, 'source_account_id', accountMerchant),
    sourceLocationsRecord: parentMismatchCount(locations, 'source_record_id', recordMerchant),
    sourceShipmentsAccount: parentMismatchCount(shipments, 'source_account_id', accountMerchant),
    sourceShipmentsOrder: parentMismatchCount(shipments, 'source_order_id', orderMerchant),
    sourceShipmentsFulfillment: parentMismatchCount(shipments, 'source_fulfillment_id', fulfillmentMerchant),
    sourceShipmentsRecord: parentMismatchCount(shipments, 'source_record_id', recordMerchant),
    sourceReturnsAccount: parentMismatchCount(returns, 'source_account_id', accountMerchant),
    sourceReturnsOrder: parentMismatchCount(returns, 'source_order_id', orderMerchant),
    sourceReturnsRecord: parentMismatchCount(returns, 'source_record_id', recordMerchant),
  },
};

const nonZero = Object.entries(checks).flatMap(([section, values]) =>
  Object.entries(values)
    .filter(([, count]) => count !== 0)
    .map(([name, count]) => `${section}.${name}=${count}`),
);

console.log(JSON.stringify({
  status: nonZero.length === 0 ? 'pass' : 'fail',
  rowCounts: {
    integrations: integrations.length,
    credentials: credentials.length,
    jobs: jobs.length,
    sourceAccounts: accounts.length,
    sourceRecords: records.length,
    sourceOrders: orders.length,
  },
  checks,
  nonZero,
}, null, 2));

if (nonZero.length > 0) process.exitCode = 1;
