import { linkIdentities, normaliseEmail, normalisePhone, normalisePostcode, normaliseCard } from '../lib/linker';
import { readFileSync } from 'fs';

function parseCSV(content: string): any[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;
  const rawLines = content.trim().split('\n');

  // First, properly split into lines (handling quoted newlines if any)
  for (const line of rawLines) {
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      current += c;
    }
    if (!inQuotes) {
      lines.push(current);
      current = '';
    } else {
      current += '\n';
    }
  }

  // Parse each line into fields
  const rows: any[] = [];
  const headers = parseCSVLine(lines[0]);

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const next = line[i + 1];

    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  fields.push(current.trim());

  // Strip surrounding quotes from each field
  return fields.map(f => {
    if (f.startsWith('"') && f.endsWith('"')) {
      return f.slice(1, -1);
    }
    return f;
  });
}

const rows = parseCSV(readFileSync('/Users/malikibrahim/Downloads/unauth_stress_test_merchant.csv', 'utf-8'));

// Verify column counts
const colCounts = rows.map((r: any) => Object.keys(r).length);
console.log(`Rows parsed: ${rows.length}`);
console.log(`Column counts: min=${Math.min(...colCounts)}, max=${Math.max(...colCounts)}`);

// Show the three "corrupted" rows
const testIds = ['ORD-581035', 'ORD-612027', 'ORD-359533'];
testIds.forEach(id => {
  const r = rows.find((row: any) => row.order_id === id);
  if (r) {
    console.log(`\n${id}:`);
    console.log(`  ip_address: "${r.ip_address}"`);
    console.log(`  account_id: "${r.account_id}"`);
    console.log(`  card_last4: "${r.card_last4}"`);
    console.log(`  card_bin: "${r.card_bin}"`);
    console.log(`  shipping_country: "${r.shipping_country}"`);
    console.log(`  currency: "${r.currency}"`);
  }
});

// Now re-run ring analysis with correct parser
const ring1Emails = [
  'james.harrison@gmail.com',
  'jamesharrison@gmail.com',
  'j.harrison99@gmail.com',
  'jharrison1987@hotmail.com',
  'james.harrison+orders@gmail.com',
];
const ring1Orders = rows.filter((r: any) => {
  const norm = normaliseEmail(r.customer_email);
  return ring1Emails.some(e => normaliseEmail(e) === norm);
});

const ring3Emails = [
  'dave.clarke.brs@gmail.com',
  'daveclarke_bristol@yahoo.co.uk',
  'david.clarke.uk@outlook.com',
];
const ring3Orders = rows.filter((r: any) => {
  const norm = normaliseEmail(r.customer_email);
  return ring3Emails.some(e => normaliseEmail(e) === norm);
});

console.log('\n=== CORRECTED RING 1 (Harrison) ===');
console.log(`Orders: ${ring1Orders.length}`);
ring1Orders.forEach((r: any) => {
  console.log(`  ${r.order_id}: email="${r.customer_email}" phone="${r.phone}" card="${r.card_last4}" bin="${r.card_bin}" ip="${r.ip_address}" account="${r.account_id}" postcode="${r.shipping_postcode}"`);
});

console.log('\n=== CORRECTED RING 3 (Clarke) ===');
console.log(`Orders: ${ring3Orders.length}`);
ring3Orders.forEach((r: any) => {
  console.log(`  ${r.order_id}: email="${r.customer_email}" phone="${r.phone}" card="${r.card_last4}" bin="${r.card_bin}" ip="${r.ip_address}" account="${r.account_id}" postcode="${r.shipping_postcode}"`);
});

// Run linker with correct data
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

// Check clusters for Ring 1 and Ring 3 orders
const allRing1Ids = ring1Orders.map((r: any) => r.order_id);
const allRing3Ids = ring3Orders.map((r: any) => r.order_id);

const ring1Clusters = result.clusters.filter((c: any) =>
  allRing1Ids.some((id: string) => c.order_ids.includes(id))
);
const ring3Clusters = result.clusters.filter((c: any) =>
  allRing3Ids.some((id: string) => c.order_ids.includes(id))
);

console.log('\n=== CLUSTER RESULTS ===');
console.log(`Ring 1 clusters: ${ring1Clusters.length}`);
ring1Clusters.forEach((c: any, i: number) => {
  console.log(`  Cluster ${i + 1}: ${c.cluster_id}`);
  console.log(`    Orders: ${c.order_ids.length}`);
  console.log(`    Score: ${c.confidence_score}`);
  console.log(`    Signals: ${c.signals_matched.join(', ')}`);
  console.log(`    Ring 1 orders: ${allRing1Ids.filter((id: string) => c.order_ids.includes(id)).join(', ')}`);
  console.log(`    Ring 3 orders: ${allRing3Ids.filter((id: string) => c.order_ids.includes(id)).join(', ') || 'NONE'}`);
});

console.log(`\nRing 3 clusters: ${ring3Clusters.length}`);
ring3Clusters.forEach((c: any, i: number) => {
  console.log(`  Cluster ${i + 1}: ${c.cluster_id}`);
  console.log(`    Orders: ${c.order_ids.length}`);
  console.log(`    Score: ${c.confidence_score}`);
  console.log(`    Signals: ${c.signals_matched.join(', ')}`);
  console.log(`    Ring 1 orders: ${allRing1Ids.filter((id: string) => c.order_ids.includes(id)).join(', ') || 'NONE'}`);
  console.log(`    Ring 3 orders: ${allRing3Ids.filter((id: string) => c.order_ids.includes(id)).join(', ')}`);
});

// Signal overlap check
function extractSignals(orders: any[]) {
  return {
    emails: new Set(orders.map((r: any) => normaliseEmail(r.customer_email)).filter((x): x is string => !!x)),
    phones: new Set(orders.map((r: any) => normalisePhone(r.phone)).filter((x): x is string => !!x)),
    cards: new Set(orders.map((r: any) => normaliseCard(r.card_last4, r.card_bin)).filter((x): x is string => !!x)),
    ips: new Set(orders.map((r: any) => r.ip_address?.trim()).filter((x): x is string => !!x)),
    accounts: new Set(orders.map((r: any) => r.account_id?.trim()).filter((x): x is string => !!x)),
    postcodes: new Set(orders.map((r: any) => normalisePostcode(r.shipping_postcode)).filter((x): x is string => !!x)),
  };
}

const ring1Sigs = extractSignals(ring1Orders);
const ring3Sigs = extractSignals(ring3Orders);

function findIntersection(setA: Set<string>, setB: Set<string>): string[] {
  return Array.from(setA).filter(x => setB.has(x));
}

const emailOverlap = findIntersection(ring1Sigs.emails, ring3Sigs.emails);
const phoneOverlap = findIntersection(ring1Sigs.phones, ring3Sigs.phones);
const cardOverlap = findIntersection(ring1Sigs.cards, ring3Sigs.cards);
const ipOverlap = findIntersection(ring1Sigs.ips, ring3Sigs.ips);
const accountOverlap = findIntersection(ring1Sigs.accounts, ring3Sigs.accounts);
const postcodeOverlap = findIntersection(ring1Sigs.postcodes, ring3Sigs.postcodes);

console.log('\n=== SIGNAL OVERLAP (with correct parser) ===');
console.log(`Email overlap: ${emailOverlap.length > 0 ? emailOverlap.join(', ') : 'NONE'}`);
console.log(`Phone overlap: ${phoneOverlap.length > 0 ? phoneOverlap.join(', ') : 'NONE'}`);
console.log(`Card overlap: ${cardOverlap.length > 0 ? cardOverlap.join(', ') : 'NONE'}`);
console.log(`IP overlap: ${ipOverlap.length > 0 ? ipOverlap.join(', ') : 'NONE'}`);
console.log(`Account overlap: ${accountOverlap.length > 0 ? accountOverlap.join(', ') : 'NONE'}`);
console.log(`Postcode overlap: ${postcodeOverlap.length > 0 ? postcodeOverlap.join(', ') : 'NONE'}`);
