import { linkIdentities, normaliseEmail, normalisePostcode, normalisePhone, normaliseCard } from '../lib/linker';
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

// Diagnosis 2: Account IDs
console.log('=== DIAGNOSIS 2: ACCOUNT IDs ===');
const allAccounts = rows.map((r: any) => r.account_id);
const uniqueAll = new Set(allAccounts);
console.log(`Total: ${allAccounts.length}, Unique: ${uniqueAll.size}`);
if (uniqueAll.size !== allAccounts.length) {
  const counts = new Map<string, number>();
  allAccounts.forEach((a: string) => counts.set(a, (counts.get(a) || 0) + 1));
  const dups = Array.from(counts.entries()).filter(([_, c]) => c > 1).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10);
  dups.forEach(([id, c]: any) => console.log(`  "${id}" appears ${c} times`));
}

// Diagnosis 3: Email collisions
console.log('\n=== DIAGNOSIS 3: EMAIL COLLISIONS ===');
const emails = rows.map((r: any) => r.customer_email).filter(Boolean);
const normMap = new Map<string, string[]>();
emails.forEach((e: string) => {
  const n = normaliseEmail(e);
  if (n) {
    const arr = normMap.get(n) || [];
    arr.push(e);
    normMap.set(n, arr);
  }
});
const collisions = Array.from(normMap.entries()).filter(([_, o]) => o.length > 1).sort((a: any, b: any) => b[1].length - a[1].length);
console.log(`Unique normalised: ${normMap.size}, Collisions: ${collisions.length}`);
collisions.slice(0, 5).forEach(([norm, originals]: any, i: number) => {
  console.log(`\nGroup ${i + 1}: "${norm}" (${originals.length} originals)`);
  originals.slice(0, 5).forEach((o: string) => console.log(`  - "${o}"`));
});

// Run linker
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

// Identify fraud ring orders
const fraudRingIds = new Set<string>();
result.clusters.filter((c: any) => c.order_ids.length >= 3 && c.confidence_score >= 50)
  .forEach((c: any) => c.order_ids.forEach((id: string) => fraudRingIds.add(id)));

console.log(`\nFraud ring orders: ${fraudRingIds.size}`);

// Diagnosis 1: 5 random non-fraud orders
const nonFraud = rows.filter((r: any) => !fraudRingIds.has(r.order_id));
console.log(`\nNon-fraud orders: ${nonFraud.length}`);

const seededRandom = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};
const rand = seededRandom(42);

console.log('\n=== DIAGNOSIS 1: 5 RANDOM NON-FRAUD ORDERS ===');
for (let i = 0; i < 5; i++) {
  const order = nonFraud[Math.floor(rand() * nonFraud.length)];
  const cluster = result.clusters.find((c: any) => c.order_ids.includes(order.order_id));
  console.log(`\n${order.order_id}:`);
  console.log(`  email: "${order.customer_email}" -> "${normaliseEmail(order.customer_email)}"`);
  console.log(`  phone: "${order.phone}" -> "${normalisePhone(order.phone)}"`);
  console.log(`  postcode: "${order.shipping_postcode}" -> "${normalisePostcode(order.shipping_postcode)}"`);
  console.log(`  card: "${order.card_last4}"+"${order.card_bin}" -> "${normaliseCard(order.card_last4, order.card_bin)}"`);
  console.log(`  ip: "${order.ip_address}"`);
  console.log(`  account: "${order.account_id}"`);
  if (cluster) {
    console.log(`  >>> CLUSTERED: ${cluster.order_ids.length} orders, score ${cluster.confidence_score}, signals: ${cluster.signals_matched.join(',')}`);
    const others = cluster.order_ids.filter((id: string) => id !== order.order_id).slice(0, 3);
    others.forEach((oid: string) => {
      const o = rows.find((r: any) => r.order_id === oid);
      console.log(`      linked to ${oid}: email="${o?.customer_email}" account="${o?.account_id}"`);
    });
  } else {
    console.log(`  >>> NO CLUSTER (correct)`);
  }
}

// Diagnosis 4: Postcode-only pairs
console.log('\n=== DIAGNOSIS 4: POSTCODE-ONLY PAIRS ===');
const postcodeOnly = result.candidatePairs.filter((p: any) => p.signals.length === 1 && p.signals[0] === 'postcode');
console.log(`Postcode-only pairs: ${postcodeOnly.length}`);
if (postcodeOnly.length > 0) {
  postcodeOnly.slice(0, 5).forEach((p: any) => {
    console.log(`  ${p.order_id_a} <-> ${p.order_id_b}: score ${p.score}`);
  });
}

// Find orders with NO links at all
const linkedIds = new Set<string>();
result.clusters.forEach((c: any) => c.order_ids.forEach((id: string) => linkedIds.add(id)));
const unlinked = rows.filter((r: any) => !linkedIds.has(r.order_id));
console.log(`\n=== UNLINKED ORDERS (no connections): ${unlinked.length} ===`);
if (unlinked.length > 0) {
  unlinked.slice(0, 5).forEach((r: any) => {
    console.log(`  ${r.order_id}: email="${r.customer_email}" account="${r.account_id}" postcode="${normalisePostcode(r.shipping_postcode)}"`);
  });
}

console.log(`\nTotal orders: ${rows.length}`);
console.log(`Orders in clusters: ${linkedIds.size}`);
console.log(`Orders unlinked: ${unlinked.length}`);
