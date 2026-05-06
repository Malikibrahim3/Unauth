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
const get = (f, n) => { const i = headers.indexOf(n); return i>=0 ? (f[i]||'').trim() : ''; };

// Simulate normaliseEmail like the engine
function normaliseEmail(raw) {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  const at = lower.indexOf('@');
  if (at < 1) return null;
  const local = lower.slice(0, at).split('+')[0];
  const domain = lower.slice(at+1);
  return local + '@' + domain;
}

// Simulate normaliseAddress
function normaliseAddress(raw) {
  if (!raw) return null;
  return raw.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Build address -> distinct emails map
const addrToEmails = {};
const addrToOrders = {};

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const f = parseCSVRow(lines[i]);
  if (f.length < 10) continue;
  const email = get(f, 'email');
  const oid = get(f, 'order_id');
  const shipping = get(f, 'shipping_address');
  const billing = get(f, 'billing_address');
  const cb = get(f, 'chargeback_dispute');
  const ref = get(f, 'refund_requested');
  const ret = get(f, 'return_requested');
  
  // Engine uses shipping address for addressHash
  const norm = normaliseAddress(shipping);
  if (!norm) continue;
  
  const normEmail = normaliseEmail(email);
  if (!addrToEmails[norm]) addrToEmails[norm] = new Set();
  if (!addrToOrders[norm]) addrToOrders[norm] = [];
  addrToEmails[norm].add(normEmail || email);
  addrToOrders[norm].push({oid, email, cb, ref, ret, billing, shipping});
}

// Show all addresses with 2+ distinct emails
const shared = Object.entries(addrToEmails)
  .filter(([a, es]) => es.size >= 2)
  .sort((a, b) => b[1].size - a[1].size);

console.log('Addresses shared by 2+ distinct emails:', shared.length);
console.log('');
shared.slice(0, 20).forEach(([addr, emails]) => {
  const orders = addrToOrders[addr];
  const hasFraud = orders.some(o => {
    const v = (x) => x.toLowerCase();
    return v(o.cb) === 'yes' || v(o.ref) === 'yes' || v(o.ret) === 'yes';
  });
  console.log(`[${emails.size} emails, ${orders.length} orders, fraud:${hasFraud}] ${addr}`);
  [...emails].forEach(e => console.log('  email:', e));
  orders.forEach(o => console.log('  order:', o.oid, '| cb:', o.cb, '| ref:', o.ref, '| ret:', o.ret));
  console.log();
});

// Also show distribution
const dist = {};
for (const [, es] of Object.entries(addrToEmails)) {
  const k = es.size;
  dist[k] = (dist[k] || 0) + 1;
}
console.log('Distribution of address->distinct_email counts:');
Object.entries(dist).sort((a,b) => Number(a[0])-Number(b[0])).forEach(([k,v]) => console.log(`  ${k} emails: ${v} addresses`));
