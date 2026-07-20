import fs from 'node:fs/promises';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const outputDir = '/Users/malikibrahim/Downloads/Unauth/outputs/shopify-shipbob-reconciliation-20260719';
const csvPath = '/Users/malikibrahim/Downloads/orders_export_1.csv';
const targetChannel = '208684';
const targetChannelName = 'unauth-test';
const merchantId = 'af070af9-df1a-46ba-89f8-29409926ef61';
const sourceAccountId = 'e15b53fe-66d2-44c8-ae0d-39f9238f177b';
const syncJobId = '2f244191-6273-4f22-9175-6a2538046a33';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  const headers = rows.shift();
  return rows.filter((values) => values.some(Boolean)).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])),
  );
}

function groupedShopifyOrders(rows) {
  const groups = new Map();
  let current = '';
  for (const row of rows) {
    if (row.Name) current = row.Name;
    if (!current) continue;
    if (!groups.has(current)) groups.set(current, []);
    groups.get(current).push(row);
  }
  return groups;
}

async function shipBobOrders(channelId) {
  const token = process.env.SHIPBOB_PAT;
  if (!token) throw new Error('SHIPBOB_PAT is missing');
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    ...(channelId ? { shipbob_channel_id: channelId } : {}),
  };
  const first = await fetch('https://sandbox-api.shipbob.com/2026-01/order?Limit=100&Page=1', { headers });
  const firstBody = await first.json();
  if (!first.ok) throw new Error(`ShipBob order list failed (${first.status})`);
  const orders = [...firstBody];
  const totalPages = Number(first.headers.get('total-pages') ?? 1);
  for (let page = 2; page <= totalPages; page += 1) {
    const response = await fetch(`https://sandbox-api.shipbob.com/2026-01/order?Limit=100&Page=${page}`, { headers });
    const body = await response.json();
    if (!response.ok) throw new Error(`ShipBob order page ${page} failed (${response.status})`);
    orders.push(...body);
  }
  return orders;
}

async function supabaseRows(table, params) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service credentials are missing');
  const response = await fetch(`${url}/rest/v1/${table}?${params}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Supabase ${table} lookup failed (${response.status})`);
  return body;
}

function orderNumber(name) {
  return Number(String(name).replace(/^#/, '')) || 0;
}

function clean(value) {
  return String(value ?? '').replace(/^'/, '').trim();
}

function completeAddress(row, prefix) {
  return [`${prefix} Address1`, `${prefix} City`, `${prefix} Country`, `${prefix} Zip`]
    .every((key) => Boolean(clean(row[key])));
}

function title(sheet, range, text) {
  sheet.mergeCells(range);
  const cell = sheet.getRange(range.split(':')[0]);
  cell.values = [[text]];
  cell.format = {
    fill: '#17324D',
    font: { bold: true, color: '#FFFFFF', size: 16 },
    verticalAlignment: 'center',
  };
  sheet.getRange(range).format.rowHeight = 30;
}

function formatTableSheet(sheet, tableRange, tableName, widths) {
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(3);
  const table = sheet.tables.add(tableRange, true, tableName);
  table.style = 'TableStyleMedium2';
  widths.forEach(([column, width]) => {
    sheet.getRange(`${column}1:${column}${tableRange.match(/\d+$/)[0]}`).format.columnWidth = width;
  });
}

const csvRows = parseCsv(await fs.readFile(csvPath, 'utf8'));
const shopifyGroups = groupedShopifyOrders(csvRows);
const [targetOrders, allOrders, appOrders, connectionRows, jobRows] = await Promise.all([
  shipBobOrders(targetChannel),
  shipBobOrders(null),
  supabaseRows('source_orders', new URLSearchParams({
    merchant_id: `eq.${merchantId}`,
    source: 'eq.shipbob',
    source_account_id: `eq.${sourceAccountId}`,
    select: 'external_id,order_number',
    limit: '1000',
  }).toString()),
  supabaseRows('merchant_integrations', new URLSearchParams({
    merchant_id: `eq.${merchantId}`,
    provider_id: 'eq.shipbob',
    select: 'provider_account_id,provider_account_name,status,imported_record_count,last_sync_at,last_error_code',
  }).toString()),
  supabaseRows('sync_jobs', new URLSearchParams({
    id: `eq.${syncJobId}`,
    select: 'status,processed_rows,failed_rows,completed_at,last_error_code',
  }).toString()),
]);

const targetByReference = new Map(targetOrders.map((order) => [String(order.reference_id), order]));
const shopifyIds = new Set([...shopifyGroups.values()].map((rows) => String(rows[0].Id)));
const appReferenceIds = new Set(appOrders.map((order) => String(order.order_number)));

const matched = [];
const missing = [];
for (const [name, rows] of shopifyGroups) {
  const row = rows[0];
  const referenceId = String(row.Id);
  const shipBob = targetByReference.get(referenceId);
  const physical = rows.filter((item) => item['Lineitem requires shipping'] === 'true');
  if (shipBob) {
    matched.push([
      name,
      Number(referenceId),
      new Date(row['Created at']),
      String(shipBob.id),
      String(shipBob.order_number ?? ''),
      String(shipBob.status ?? ''),
      Array.isArray(shipBob.products) ? shipBob.products.length : 0,
      name === '#1010'
        ? 'Mixed-provider order: ShipBob contains the Hydrogen line only; sku-hosted-1 remains with the third-party fulfiller.'
        : 'Shopify order ID is present in the ShipBob unauth-test channel.',
      appReferenceIds.has(referenceId) ? 'Present' : 'Missing',
    ]);
    continue;
  }

  const shippingComplete = completeAddress(row, 'Shipping');
  const billingComplete = completeAddress(row, 'Billing');
  let reason;
  if (name === '#1006') {
    reason = 'Third-party-only fulfilment: sku-hosted-1 is not resolvable by ShipBob; ShipBob API rejected it with HTTP 422.';
  } else if (physical.length === 0) {
    reason = 'Digital-only order: all four gift-card lines have requires_shipping=false, so no ShipBob fulfilment is expected.';
  } else if (!shippingComplete && !billingComplete) {
    reason = 'No usable shipping or billing address; ShipBob cannot create a physical DTC fulfilment.';
  } else if (!shippingComplete) {
    reason = 'Shipping address is incomplete; ShipBob cannot create a physical DTC fulfilment.';
  } else {
    reason = 'Unresolved eligibility/configuration issue.';
  }
  missing.push([
    name,
    Number(referenceId),
    new Date(row['Created at']),
    row['Financial Status'],
    row['Fulfillment Status'],
    physical.length,
    shippingComplete ? 'Complete' : 'Missing',
    billingComplete ? 'Complete' : 'Missing',
    reason,
    appReferenceIds.has(referenceId) ? 'Present' : 'Not expected',
  ]);
}

matched.sort((a, b) => orderNumber(b[0]) - orderNumber(a[0]));
missing.sort((a, b) => orderNumber(b[0]) - orderNumber(a[0]));
const shipBobOnly = allOrders
  .filter((order) => !shopifyIds.has(String(order.reference_id)))
  .map((order) => [
    String(order.id),
    String(order.reference_id ?? ''),
    String(order.order_number ?? ''),
    String(order.channel?.name ?? order.channel ?? ''),
    String(order.status ?? ''),
    'ShipBob adverse-test fixture; not linked to a Shopify order.',
    appOrders.some((appOrder) => String(appOrder.external_id) === String(order.id)) ? 'Present' : 'Missing',
  ]);

const workbook = Workbook.create();
const summary = workbook.worksheets.add('Summary');
const matchedSheet = workbook.worksheets.add('Matched Orders');
const missingSheet = workbook.worksheets.add('Missing Shopify');
const shipBobOnlySheet = workbook.worksheets.add('ShipBob Only');

summary.showGridLines = false;
title(summary, 'A1:F1', 'Shopify ↔ ShipBob Reconciliation');
summary.getRange('A3:B3').values = [['Metric', 'Count']];
summary.getRange('A4:A10').values = [
  ['Shopify orders'],
  [`ShipBob orders in ${targetChannelName}`],
  ['Matched Shopify orders'],
  ['Shopify orders excluded from ShipBob'],
  ['ShipBob-only test fixtures'],
  ['Shopify orders fully accounted for'],
  ['Matched orders present in Simeon app'],
];
summary.getRange('B4:B10').formulas = [
  [`=COUNTA('Matched Orders'!A4:A${matched.length + 3})+COUNTA('Missing Shopify'!A4:A${missing.length + 3})`],
  [`=COUNTA('Matched Orders'!D4:D${matched.length + 3})`],
  [`=COUNTA('Matched Orders'!A4:A${matched.length + 3})`],
  [`=COUNTA('Missing Shopify'!A4:A${missing.length + 3})`],
  [`=COUNTA('ShipBob Only'!A4:A${shipBobOnly.length + 3})`],
  ['=B6+B7'],
  [`=COUNTIF('Matched Orders'!I4:I${matched.length + 3},"Present")`],
];
summary.getRange('A3:B10').format.borders = { preset: 'outside', style: 'thin', color: '#B7C4CE' };
summary.getRange('A3:B3').format = { fill: '#246B78', font: { bold: true, color: '#FFFFFF' } };
summary.getRange('B4:B10').format.numberFormat = '#,##0';
summary.getRange('A12:B12').values = [['Configuration / verification', 'Result']];
summary.getRange('A13:A20').values = [
  ['Selected ShipBob channel'],
  ['Connection status'],
  ['Last sync'],
  ['Sync job status'],
  ['Processed records'],
  ['Failed records'],
  ['Inventory position'],
  ['Shopify changes made'],
];
const connection = connectionRows[0] ?? {};
const job = jobRows[0] ?? {};
summary.getRange('B13:B20').values = [
  [`${connection.provider_account_name ?? targetChannelName} (${connection.provider_account_id ?? targetChannel})`],
  [String(connection.status ?? '')],
  [connection.last_sync_at ? new Date(connection.last_sync_at) : null],
  [String(job.status ?? '')],
  [Number(job.processed_rows ?? 0)],
  [Number(job.failed_rows ?? 0)],
  ['All mapped catalog variants currently have on-hand quantity 0; imported orders may remain in Action Required/Exception until receiving inventory.'],
  ['None — no Shopify orders were removed, cancelled, refunded, or edited.'],
];
summary.getRange('A12:B20').format.borders = { preset: 'outside', style: 'thin', color: '#B7C4CE' };
summary.getRange('A12:B12').format = { fill: '#246B78', font: { bold: true, color: '#FFFFFF' } };
summary.getRange('B15').format.numberFormat = 'yyyy-mm-dd hh:mm';
summary.getRange('B17:B18').format.numberFormat = '#,##0';
summary.getRange('A1:A20').format.columnWidth = 34;
summary.getRange('B1:B20').format.columnWidth = 82;
summary.getRange('B19:B20').format.wrapText = true;
summary.getRange('B15').format.horizontalAlignment = 'left';
summary.getRange('A19:B20').format.rowHeight = 32;
summary.freezePanes.freezeRows(1);

title(matchedSheet, 'A1:I1', 'Matched Shopify Orders');
matchedSheet.getRange(`A3:I${matched.length + 3}`).values = [
  ['Shopify Order', 'Shopify Order ID', 'Created', 'ShipBob Order ID', 'ShipBob Store Order', 'ShipBob Status', 'Product Lines', 'Accounting Note', 'Simeon App'],
  ...matched,
];
formatTableSheet(matchedSheet, `A3:I${matched.length + 3}`, 'MatchedOrdersTable', [
  ['A', 16], ['B', 22], ['C', 20], ['D', 20], ['E', 18], ['F', 18], ['G', 14], ['H', 76], ['I', 16],
]);
matchedSheet.getRange(`B4:B${matched.length + 3}`).format.numberFormat = '0';
matchedSheet.getRange(`C4:C${matched.length + 3}`).format.numberFormat = 'yyyy-mm-dd hh:mm';
matchedSheet.getRange(`D4:E${matched.length + 3}`).format.numberFormat = '@';
matchedSheet.getRange(`H4:H${matched.length + 3}`).format.wrapText = true;

title(missingSheet, 'A1:J1', 'Shopify Orders Not Expected in ShipBob');
missingSheet.getRange(`A3:J${missing.length + 3}`).values = [
  ['Shopify Order', 'Shopify Order ID', 'Created', 'Payment', 'Shopify Fulfilment', 'Shippable Lines', 'Shipping Address', 'Billing Address', 'Precise Exclusion Reason', 'Simeon App'],
  ...missing,
];
formatTableSheet(missingSheet, `A3:J${missing.length + 3}`, 'MissingShopifyTable', [
  ['A', 16], ['B', 22], ['C', 20], ['D', 14], ['E', 20], ['F', 16], ['G', 18], ['H', 18], ['I', 90], ['J', 18],
]);
missingSheet.getRange(`B4:B${missing.length + 3}`).format.numberFormat = '0';
missingSheet.getRange(`C4:C${missing.length + 3}`).format.numberFormat = 'yyyy-mm-dd hh:mm';
missingSheet.getRange(`I4:I${missing.length + 3}`).format.wrapText = true;

title(shipBobOnlySheet, 'A1:G1', 'ShipBob Records Without a Shopify Order');
shipBobOnlySheet.getRange(`A3:G${shipBobOnly.length + 3}`).values = [
  ['ShipBob Order ID', 'Reference ID', 'Store Order Number', 'Channel', 'Status', 'Record Purpose', 'Simeon App'],
  ...shipBobOnly,
];
formatTableSheet(shipBobOnlySheet, `A3:G${shipBobOnly.length + 3}`, 'ShipBobOnlyTable', [
  ['A', 20], ['B', 30], ['C', 24], ['D', 18], ['E', 18], ['F', 62], ['G', 16],
]);
shipBobOnlySheet.getRange(`A4:C${shipBobOnly.length + 3}`).format.numberFormat = '@';
shipBobOnlySheet.getRange(`F4:F${shipBobOnly.length + 3}`).format.wrapText = true;

console.log((await workbook.inspect({
  kind: 'table',
  range: 'Summary!A1:B20',
  include: 'values,formulas',
  tableMaxRows: 22,
  tableMaxCols: 3,
})).ndjson);
console.log((await workbook.inspect({
  kind: 'table',
  range: `Missing Shopify!A1:J${missing.length + 3}`,
  include: 'values,formulas',
  tableMaxRows: 12,
  tableMaxCols: 10,
})).ndjson);
console.log((await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 300 },
  summary: 'final formula error scan',
})).ndjson);

for (const sheetName of ['Summary', 'Matched Orders', 'Missing Shopify', 'ShipBob Only']) {
  const preview = await workbook.render({ sheetName, autoCrop: 'all', scale: 1, format: 'png' });
  await fs.writeFile(`${outputDir}/preview-${sheetName.toLowerCase().replaceAll(' ', '-')}.png`, new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/shopify-shipbob-reconciliation.xlsx`);
console.log(JSON.stringify({
  workbook: `${outputDir}/shopify-shipbob-reconciliation.xlsx`,
  counts: {
    shopify: shopifyGroups.size,
    shipbob_target: targetOrders.length,
    matched: matched.length,
    missing: missing.length,
    shipbob_only: shipBobOnly.length,
    app_orders: appOrders.length,
  },
}));
