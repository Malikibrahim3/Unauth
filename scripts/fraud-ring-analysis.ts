import { linkIdentities, normaliseEmail } from '../lib/linker';
import { readFileSync } from 'fs';

const RING_ANCHORS = [
  'james.harrison@gmail.com',
  'sophie.turner92@gmail.com',
  'dave.clarke.brs@gmail.com',
  'priya.patel@hotmail.com',
  'alex.w.freeman@gmail.com',
  'michael.wood.uk@gmail.com',
];

function parseCSV(content: string) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row: any = {};
    headers.forEach((h, i) => row[h.trim()] = values[i]?.trim() || '');
    return row;
  });
}

const rows = parseCSV(readFileSync('/Users/malikibrahim/Downloads/unauth_stress_test_merchant.csv', 'utf-8'));

// Run full linker to get all clusters
const input = rows.map((r: any) => ({
  order_id: r.order_id,
  email: r.customer_email || null,
  phone: r.phone || null,
  address: r.shipping_address || null,
  postcode: r.shipping_postcode || null,
  ip: r.ip_address || null,
  card_last4: r.card_last4 || null,
  card_bin: r.card_bin || null,
  device_fingerprint: null,
  account_id: r.account_id || null,
}));
const result = linkIdentities(input);

console.log('=== FRAUD RING ANALYSIS ===\n');

RING_ANCHORS.forEach((anchorEmail, idx) => {
  const normAnchor = normaliseEmail(anchorEmail);
  console.log(`\n--- RING ${idx + 1}: ${anchorEmail} (norm: ${normAnchor}) ---\n`);

  // Find all orders with this normalized email
  const ringOrders = rows.filter((r: any) => normaliseEmail(r.customer_email) === normAnchor);
  console.log(`Orders with this email: ${ringOrders.length}`);
  ringOrders.forEach((r: any) => {
    console.log(`  ${r.order_id}: email="${r.customer_email}" phone="${r.phone}" card="${r.card_last4}" bin="${r.card_bin}" ip="${r.ip_address}" account="${r.account_id}" postcode="${r.shipping_postcode}"`);
  });

  // Find which cluster(s) these orders belong to
  const orderIds = ringOrders.map((r: any) => r.order_id);
  const matchingClusters = result.clusters.filter((c: any) =>
    orderIds.some((id: string) => c.order_ids.includes(id))
  );

  console.log(`\nClusters containing these orders: ${matchingClusters.length}`);

  matchingClusters.forEach((cluster: any, cidx: number) => {
    console.log(`\n  Cluster ${cidx + 1}: ${cluster.cluster_id}`);
    console.log(`    Total orders in cluster: ${cluster.order_ids.length}`);
    console.log(`    Confidence score: ${cluster.confidence_score}`);
    console.log(`    Signals: ${cluster.signals_matched.join(', ')}`);

    // Get full details for ALL orders in this cluster
    const clusterRows = rows.filter((r: any) => cluster.order_ids.includes(r.order_id));
    const uniqueEmails = new Set(clusterRows.map((r: any) => r.customer_email));
    const uniquePhones = new Set(clusterRows.map((r: any) => r.phone).filter(Boolean));
    const uniqueCards = new Set(clusterRows.map((r: any) => `${r.card_bin}-${r.card_last4}`).filter((s: string) => s !== '-'));
    const uniqueIPs = new Set(clusterRows.map((r: any) => r.ip_address).filter(Boolean));
    const uniqueAccounts = new Set(clusterRows.map((r: any) => r.account_id));
    const uniquePostcodes = new Set(clusterRows.map((r: any) => r.shipping_postcode));

    console.log(`    Unique emails: ${uniqueEmails.size}`);
    console.log(`    Unique phones: ${uniquePhones.size}`);
    console.log(`    Unique cards (bin-last4): ${uniqueCards.size}`);
    console.log(`    Unique IPs: ${uniqueIPs.size}`);
    console.log(`    Unique accounts: ${uniqueAccounts.size}`);
    console.log(`    Unique postcodes: ${uniquePostcodes.size}`);

    // Print all emails in cluster
    console.log(`    Emails in cluster:`);
    Array.from(uniqueEmails).forEach((e: any) => console.log(`      - "${e}"`));

    // Signal diversity check
    const emailDiversity = uniqueEmails.size / cluster.order_ids.length;
    const cardDiversity = uniqueCards.size / cluster.order_ids.length;
    console.log(`    Email diversity ratio: ${emailDiversity.toFixed(2)} (${uniqueEmails.size}/${cluster.order_ids.length})`);
    console.log(`    Card diversity ratio: ${cardDiversity.toFixed(2)} (${uniqueCards.size}/${cluster.order_ids.length})`);
    console.log(`    Fraud ring indicator: ${emailDiversity > 0.5 || uniqueEmails.size >= 3 ? 'HIGH (multiple identities)' : 'LOW (likely repeat customer)'}`);
  });
});

// Summary table
console.log('\n\n=== SUMMARY TABLE ===\n');
console.log('Ring | Anchor Email                        | Orders | Clusters | Score | Unique Emails | Unique Cards | Fraud Indicator');
console.log('-----|-------------------------------------|--------|----------|-------|---------------|--------------|----------------');

RING_ANCHORS.forEach((anchorEmail, idx) => {
  const normAnchor = normaliseEmail(anchorEmail);
  const ringOrders = rows.filter((r: any) => normaliseEmail(r.customer_email) === normAnchor);
  const orderIds = ringOrders.map((r: any) => r.order_id);
  const clusters = result.clusters.filter((c: any) => orderIds.some((id: string) => c.order_ids.includes(id)));

  clusters.forEach((cluster: any) => {
    const clusterRows = rows.filter((r: any) => cluster.order_ids.includes(r.order_id));
    const uniqueEmails = new Set(clusterRows.map((r: any) => r.customer_email)).size;
    const uniqueCards = new Set(clusterRows.map((r: any) => `${r.card_bin}-${r.card_last4}`).filter((s: string) => s !== '-')).size;
    const fraudInd = uniqueEmails >= 3 || (uniqueEmails / cluster.order_ids.length) > 0.5 ? 'FRAUD RING' : 'REPEAT CUSTOMER';
    console.log(` ${idx + 1}   | ${anchorEmail.padEnd(36)} | ${ringOrders.length.toString().padStart(6)} | ${clusters.length.toString().padStart(8)} | ${cluster.confidence_score.toString().padStart(5)} | ${uniqueEmails.toString().padStart(13)} | ${uniqueCards.toString().padStart(12)} | ${fraudInd}`);
  });
});
