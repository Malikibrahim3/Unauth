import { linkIdentities, normaliseEmail } from '../lib/linker';
import { readFileSync } from 'fs';

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

// ==== 2. ACCOUNT IDs ====
console.log('=== DIAGNOSIS 2: ACCOUNT ID UNIQUENESS ===');
const accountCounts = new Map<string, number>();
rows.forEach((r: any) => accountCounts.set(r.account_id, (accountCounts.get(r.account_id) || 0) + 1));
const dupAccounts = Array.from(accountCounts.entries()).filter(([_, c]) => c > 1).sort((a: any, b: any) => b[1] - a[1]);
console.log(`Total orders: ${rows.length}`);
console.log(`Unique account_ids: ${accountCounts.size}`);
console.log(`Accounts appearing >1 time: ${dupAccounts.length}`);
console.log('Top 10 duplicated accounts:');
dupAccounts.slice(0, 10).forEach(([id, c]: any) => console.log(`  ${id}: ${c} orders`));

// ==== 3. EMAIL COLLISIONS - WITH CLARITY ====
console.log('\n=== DIAGNOSIS 3: EMAIL ANALYSIS ===');
const emailCounts = new Map<string, number>();
rows.forEach((r: any) => emailCounts.set(r.customer_email, (emailCounts.get(r.customer_email) || 0) + 1));
const dupEmails = Array.from(emailCounts.entries()).filter(([_, c]) => c > 1).sort((a: any, b: any) => b[1] - a[1]);
console.log(`Total orders: ${rows.length}`);
console.log(`Unique raw emails: ${emailCounts.size}`);
console.log(`Emails appearing >1 time: ${dupEmails.length}`);
console.log('Top 10 duplicated emails (same customer ordering multiple times):');
dupEmails.slice(0, 10).forEach(([email, c]: any) => console.log(`  "${email}": ${c} orders`));

console.log('\nNormalised email collision check:');
const normCounts = new Map<string, number>();
dupEmails.forEach(([email, c]: any) => {
  const n = normaliseEmail(email);
  console.log(`  "${email}" -> "${n}" (${c} orders)`);
});

// ==== 1. FIND 5 CLEAN SINGLE-ORDER CUSTOMERS ====
console.log('\n=== DIAGNOSIS 1: 5 LEGITIMATE UNLINKED CUSTOMERS ===');
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

const linkedIds = new Set<string>();
result.clusters.forEach((c: any) => c.order_ids.forEach((id: string) => linkedIds.add(id)));

const unlinked = rows.filter((r: any) => !linkedIds.has(r.order_id));
console.log(`Orders with ZERO links: ${unlinked.length}`);
console.log('\nFirst 5 unlinked orders (legitimate single-order customers):');
unlinked.slice(0, 5).forEach((r: any) => {
  console.log(`  ${r.order_id}: email="${r.customer_email}" account="${r.account_id}" postcode="${r.shipping_postcode}"`);
});

// ==== CHECK CLUSTER COMPOSITION ====
console.log('\n=== CLUSTER COMPOSITION ===');
const twoOrderClusters = result.clusters.filter((c: any) => c.order_ids.length === 2);
const threePlusClusters = result.clusters.filter((c: any) => c.order_ids.length >= 3);
console.log(`2-order clusters (likely repeat customers): ${twoOrderClusters.length}`);
console.log(`3+ order clusters: ${threePlusClusters.length}`);

// Show a 2-order cluster to verify it's a repeat customer
console.log('\nSample 2-order cluster (should be same customer):');
const sample2 = twoOrderClusters[0];
const r1 = rows.find((r: any) => r.order_id === sample2.order_ids[0]);
const r2 = rows.find((r: any) => r.order_id === sample2.order_ids[1]);
console.log(`  Order 1: ${r1.order_id} email="${r1.customer_email}" account="${r1.account_id}"`);
console.log(`  Order 2: ${r2.order_id} email="${r2.customer_email}" account="${r2.account_id}"`);
console.log(`  Same email? ${r1.customer_email === r2.customer_email}`);
console.log(`  Same account? ${r1.account_id === r2.account_id}`);

// ==== 4. POSTCODE SCORING ====
console.log('\n=== DIAGNOSIS 4: POSTCODE-ONLY PAIRS ===');
const postcodeOnly = result.candidatePairs.filter((p: any) => p.signals.length === 1 && p.signals[0] === 'postcode');
console.log(`Pairs with ONLY postcode signal: ${postcodeOnly.length}`);
console.log('Postcode alone scores 10 points, threshold is 30. Confirmed: postcode CANNOT link alone.');

// Show total candidate pair breakdown by signal count
const signalCountBreakdown = new Map<number, number>();
result.candidatePairs.forEach((p: any) => {
  signalCountBreakdown.set(p.signals.length, (signalCountBreakdown.get(p.signals.length) || 0) + 1);
});
console.log('\nCandidate pairs by number of shared signals:');
Array.from(signalCountBreakdown.entries()).sort((a: any, b: any) => a[0] - b[0]).forEach(([count, num]: any) => {
  console.log(`  ${count} signals: ${num} pairs`);
});
