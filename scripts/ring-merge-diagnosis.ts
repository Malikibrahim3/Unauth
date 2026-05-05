import { linkIdentities, normaliseEmail, normalisePhone, normalisePostcode, normaliseCard } from '../lib/linker';
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

// Identify Ring 1 orders (james.harrison emails)
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

// Identify Ring 3 orders (dave.clarke emails)
const ring3Emails = [
  'dave.clarke.brs@gmail.com',
  'daveclarke_bristol@yahoo.co.uk',
  'david.clarke.uk@outlook.com',
];
const ring3Orders = rows.filter((r: any) => {
  const norm = normaliseEmail(r.customer_email);
  return ring3Emails.some(e => normaliseEmail(e) === norm);
});

console.log('=== RING 1 (Harrison, London) ===');
console.log(`Orders: ${ring1Orders.length}`);
ring1Orders.forEach((r: any) => {
  console.log(`  ${r.order_id}: email="${r.customer_email}" phone="${r.phone}" card="${r.card_last4}" bin="${r.card_bin}" ip="${r.ip_address}" account="${r.account_id}" postcode="${r.shipping_postcode}"`);
});

console.log('\n=== RING 3 (Clarke, Bristol) ===');
console.log(`Orders: ${ring3Orders.length}`);
ring3Orders.forEach((r: any) => {
  console.log(`  ${r.order_id}: email="${r.customer_email}" phone="${r.phone}" card="${r.card_last4}" bin="${r.card_bin}" ip="${r.ip_address}" account="${r.account_id}" postcode="${r.shipping_postcode}"`);
});

// Normalised signals for each ring
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

console.log('\n=== SIGNAL OVERLAP ANALYSIS ===');

function findIntersection(setA: Set<string>, setB: Set<string>): string[] {
  return Array.from(setA).filter(x => setB.has(x));
}

const emailOverlap = findIntersection(ring1Sigs.emails, ring3Sigs.emails);
const phoneOverlap = findIntersection(ring1Sigs.phones, ring3Sigs.phones);
const cardOverlap = findIntersection(ring1Sigs.cards, ring3Sigs.cards);
const ipOverlap = findIntersection(ring1Sigs.ips, ring3Sigs.ips);
const accountOverlap = findIntersection(ring1Sigs.accounts, ring3Sigs.accounts);
const postcodeOverlap = findIntersection(ring1Sigs.postcodes, ring3Sigs.postcodes);

console.log(`Email overlap: ${emailOverlap.length > 0 ? emailOverlap.join(', ') : 'NONE'}`);
console.log(`Phone overlap: ${phoneOverlap.length > 0 ? phoneOverlap.join(', ') : 'NONE'}`);
console.log(`Card overlap: ${cardOverlap.length > 0 ? cardOverlap.join(', ') : 'NONE'}`);
console.log(`IP overlap: ${ipOverlap.length > 0 ? ipOverlap.join(', ') : 'NONE'}`);
console.log(`Account overlap: ${accountOverlap.length > 0 ? accountOverlap.join(', ') : 'NONE'}`);
console.log(`Postcode overlap: ${postcodeOverlap.length > 0 ? postcodeOverlap.join(', ') : 'NONE'}`);

// Show which specific orders contain the overlapping signal
if (phoneOverlap.length > 0) {
  console.log('\n=== PHONE OVERLAP DETAILS ===');
  phoneOverlap.forEach((phone: string) => {
    console.log(`Phone "${phone}" appears in:`);
    ring1Orders.filter((r: any) => normalisePhone(r.phone) === phone).forEach((r: any) => {
      console.log(`  Ring 1: ${r.order_id} (raw: "${r.phone}")`);
    });
    ring3Orders.filter((r: any) => normalisePhone(r.phone) === phone).forEach((r: any) => {
      console.log(`  Ring 3: ${r.order_id} (raw: "${r.phone}")`);
    });
  });
}

if (cardOverlap.length > 0) {
  console.log('\n=== CARD OVERLAP DETAILS ===');
  cardOverlap.forEach((card: string) => {
    console.log(`Card "${card}" appears in:`);
    ring1Orders.filter((r: any) => normaliseCard(r.card_last4, r.card_bin) === card).forEach((r: any) => {
      console.log(`  Ring 1: ${r.order_id} (raw: "${r.card_last4}"+"${r.card_bin}")`);
    });
    ring3Orders.filter((r: any) => normaliseCard(r.card_last4, r.card_bin) === card).forEach((r: any) => {
      console.log(`  Ring 3: ${r.order_id} (raw: "${r.card_last4}"+"${r.card_bin}")`);
    });
  });
}

if (ipOverlap.length > 0) {
  console.log('\n=== IP OVERLAP DETAILS ===');
  ipOverlap.forEach((ip: string) => {
    console.log(`IP "${ip}" appears in:`);
    ring1Orders.filter((r: any) => r.ip_address?.trim() === ip).forEach((r: any) => {
      console.log(`  Ring 1: ${r.order_id}`);
    });
    ring3Orders.filter((r: any) => r.ip_address?.trim() === ip).forEach((r: any) => {
      console.log(`  Ring 3: ${r.order_id}`);
    });
  });
}

if (accountOverlap.length > 0) {
  console.log('\n=== ACCOUNT OVERLAP DETAILS ===');
  accountOverlap.forEach((acc: string) => {
    console.log(`Account "${acc}" appears in:`);
    ring1Orders.filter((r: any) => r.account_id?.trim() === acc).forEach((r: any) => {
      console.log(`  Ring 1: ${r.order_id}`);
    });
    ring3Orders.filter((r: any) => r.account_id?.trim() === acc).forEach((r: any) => {
      console.log(`  Ring 3: ${r.order_id}`);
    });
  });
}

if (postcodeOverlap.length > 0) {
  console.log('\n=== POSTCODE OVERLAP DETAILS ===');
  postcodeOverlap.forEach((pc: string) => {
    console.log(`Postcode "${pc}" appears in:`);
    ring1Orders.filter((r: any) => normalisePostcode(r.shipping_postcode) === pc).forEach((r: any) => {
      console.log(`  Ring 1: ${r.order_id} (raw: "${r.shipping_postcode}")`);
    });
    ring3Orders.filter((r: any) => normalisePostcode(r.shipping_postcode) === pc).forEach((r: any) => {
      console.log(`  Ring 3: ${r.order_id} (raw: "${r.shipping_postcode}")`);
    });
  });
}
