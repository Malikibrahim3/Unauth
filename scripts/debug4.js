const { readFileSync } = require('fs');
const content = readFileSync('/Users/malikibrahim/Downloads/Unauth/friendly_fraud_blind_test_2000.csv', 'utf8');
const lines = content.trim().split('\n');

function parseCSVRow(line) {
  const fields = [];
  let cur = '';
  let inQ = false;
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { fields.push(cur); cur = ''; }
    else { cur += c; }
  }
  fields.push(cur);
  return fields;
}

const headers = parseCSVRow(lines[0]);
console.log('Headers:', headers.join(' | '));
console.log('Header count:', headers.length);

const get = (fields, name) => {
  const i = headers.indexOf(name);
  return i >= 0 ? (fields[i] || '').trim() : '';
};

// Sample first 5 rows to check actual values
console.log('\n--- Sample rows ---');
for (let i = 1; i <= 5; i++) {
  const f = parseCSVRow(lines[i]);
  console.log('Row', i, '| fields:', f.length);
  console.log('  cb:', get(f,'chargeback_dispute'), '| ref:', get(f,'refund_requested'), '| ret:', get(f,'return_requested'));
  console.log('  shipping:', get(f,'shipping_address'));
  console.log('  billing:', get(f,'billing_address'));
  console.log('  phone:', get(f,'phone'));
  console.log('  customer_id:', get(f,'customer_id'));
}

// Count fraud flags with proper parser
let cbCount = 0, refCount = 0, retCount = 0;
const cbVals = new Set(), refVals = new Set(), retVals = new Set();
const phone_to_emails = {};
const shipping_to_emails = {};
const card_to_emails = {};

function isTruthy(v) {
  const l = v.toLowerCase();
  return l === 'true' || l === 'yes' || l === '1';
}

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const f = parseCSVRow(lines[i]);
  if (f.length < headers.length - 2) continue;
  
  const cb = get(f, 'chargeback_dispute');
  const ref = get(f, 'refund_requested');
  const ret = get(f, 'return_requested');
  const email = get(f, 'email');
  const phone = get(f, 'phone');
  const shipping = get(f, 'shipping_address');
  
  cbVals.add(cb); refVals.add(ref); retVals.add(ret);
  if (isTruthy(cb)) cbCount++;
  if (isTruthy(ref)) refCount++;
  if (isTruthy(ret)) retCount++;
  
  if (phone) {
    if (!phone_to_emails[phone]) phone_to_emails[phone] = new Set();
    phone_to_emails[phone].add(email);
  }
  if (shipping) {
    if (!shipping_to_emails[shipping]) shipping_to_emails[shipping] = new Set();
    shipping_to_emails[shipping].add(email);
  }
}

console.log('\n--- Fraud flag totals ---');
console.log('CB unique values:', [...cbVals].join(' | '));
console.log('Ref unique values:', [...refVals].join(' | '));
console.log('Ret unique values:', [...retVals].join(' | '));
console.log('Chargebacks:', cbCount, '| Refunds:', refCount, '| Returns:', retCount);

const sharedPhones = Object.entries(phone_to_emails).filter(([p,es]) => es.size >= 2);
console.log('\nPhones shared by 2+ different emails:', sharedPhones.length);
sharedPhones.slice(0,5).forEach(([p, es]) => console.log(' ', p, '->', [...es].slice(0,5).join(' | ')));

const sharedShipping = Object.entries(shipping_to_emails).filter(([s,es]) => es.size >= 3);
console.log('\nShipping addresses shared by 3+ different emails:', sharedShipping.length);
sharedShipping.forEach(([s, es]) => console.log(' ', s.substring(0,60), '-> emails:', es.size));
