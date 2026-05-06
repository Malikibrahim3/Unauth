const { readFileSync } = require('fs');
const content = readFileSync('friendly_fraud_blind_test_2000.csv', 'utf8');
const lines = content.trim().split('\n');

function parseRow(line) {
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

const headers = parseRow(lines[0]);
const get = (row, name) => {
  const idx = headers.indexOf(name);
  return idx >= 0 ? (row[idx] || '').trim() : '';
};

let mismatches = 0;
const email_orders = {};
for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const f = parseRow(lines[i]);
  const email = get(f, 'email');
  const billing = get(f, 'billing_address');
  const shipping = get(f, 'shipping_address');
  const cb = get(f, 'chargeback_dispute').toLowerCase();
  const ref = get(f, 'refund_requested').toLowerCase();
  const ret = get(f, 'return_requested').toLowerCase();
  const pm = get(f, 'payment_method');
  const status = get(f, 'order_status');
  const total = parseFloat(get(f, 'order_total') || '0');
  const date = get(f, 'order_date');
  if (billing !== shipping) mismatches++;
  if (!email_orders[email]) email_orders[email] = [];
  email_orders[email].push({ oid: get(f,'order_id'), billing, shipping, cb, ref, ret, pm, status, total, date });
}

console.log('Billing!=Shipping mismatches:', mismatches);

const hasFraud = (o) => o.cb === 'true' || o.cb === '1' || o.ref === 'true' || o.ref === '1' || o.ret === 'true' || o.ret === '1';

const fraud_emails = Object.entries(email_orders).filter(([e, os]) => os.some(hasFraud));
console.log('\nEmails with ANY fraud signal:', fraud_emails.length);
fraud_emails.slice(0, 15).forEach(([e, os]) => {
  const fraud = os.filter(hasFraud);
  const types = fraud.map(o => {
    const t = [];
    if (o.cb === 'true' || o.cb === '1') t.push('CB');
    if (o.ref === 'true' || o.ref === '1') t.push('REF');
    if (o.ret === 'true' || o.ret === '1') t.push('RET');
    return t.join('+');
  });
  console.log('  ' + e + ': ' + os.length + ' total orders, ' + fraud.length + ' fraud: ' + types.join(', '));
});

const multi_fraud = Object.entries(email_orders).filter(([e, os]) => os.length >= 3 && os.some(hasFraud));
console.log('\nEmails with 3+ orders AND fraud signal:', multi_fraud.length);
multi_fraud.forEach(([e, os]) => {
  const fraud = os.filter(hasFraud);
  const types = fraud.map(o => {
    const t = [];
    if (o.cb === 'true' || o.cb === '1') t.push('CB');
    if (o.ref === 'true' || o.ref === '1') t.push('REF');
    if (o.ret === 'true' || o.ret === '1') t.push('RET');
    return t.join('+');
  });
  console.log('  ' + e + ': ' + os.length + ' orders, fraud: ' + types.join(', '));
});

// Large same-email groups (potential identity rings)
const large_groups = Object.entries(email_orders).filter(([e, os]) => os.length >= 5);
console.log('\nEmails with 5+ orders:', large_groups.length);
large_groups.sort((a, b) => b[1].length - a[1].length).slice(0, 15).forEach(([e, os]) => {
  const fraud = os.filter(hasFraud);
  const pms = [...new Set(os.map(o => o.pm))].join('/');
  const statuses = [...new Set(os.map(o => o.status))].join('/');
  const addrs = new Set(os.map(o => o.shipping));
  console.log('  ' + e + ': ' + os.length + ' orders, ' + fraud.length + ' fraud, PMs: ' + pms + ', addrs: ' + addrs.size + ', statuses: ' + statuses);
});
