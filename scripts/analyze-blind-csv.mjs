import { readFileSync } from 'fs';

const content = readFileSync('friendly_fraud_blind_test_2000.csv', 'utf8');
const lines = content.trim().split('\n');

function parseRow(line) {
  const fields = [];
  let cur = '', inQ = false;
  for (const c of line) {
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { fields.push(cur); cur = ''; }
    else cur += c;
  }
  fields.push(cur);
  return fields;
}

const headers = parseRow(lines[0]);
const idx = (name) => headers.indexOf(name);
const phoneIdx = idx('phone');
const emailIdx = idx('email');
const custIdx = idx('customer_id');
const addrIdx = idx('shipping_address');
const pmIdx = idx('payment_method');
const refIdx = idx('refund_requested');
const cbIdx = idx('chargeback_dispute');
const retIdx = idx('return_requested');

console.log('Headers found:', headers.join(', '));

const phone_map = {};
const cust_map = {};
const addr_map = {};
const email_map = {};

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const f = parseRow(lines[i]);
  const oid = f[0];
  const phone = f[phoneIdx]?.trim();
  const email = f[emailIdx]?.trim();
  const cust = f[custIdx]?.trim();
  const addr = f[addrIdx]?.trim();
  if (phone) { phone_map[phone] = phone_map[phone] || []; phone_map[phone].push({oid, email}); }
  if (cust) { cust_map[cust] = cust_map[cust] || []; cust_map[cust].push({oid, email}); }
  if (addr && email) { addr_map[addr] = addr_map[addr] || new Set(); addr_map[addr].add(email); }
  if (email) { email_map[email] = email_map[email] || []; email_map[email].push(oid); }
}

console.log('\n=== Phone clusters (2+ orders with DIFFERENT emails) ===');
Object.entries(phone_map)
  .filter(([k,v]) => {
    const emails = new Set(v.map(x => x.email));
    return v.length >= 2 && emails.size >= 2;
  })
  .sort((a,b) => b[1].length - a[1].length)
  .slice(0, 20)
  .forEach(([k,v]) => {
    const emails = [...new Set(v.map(x => x.email))];
    console.log(k, `${v.length} orders, ${emails.length} distinct emails`, v.slice(0,3).map(x=>x.oid).join(','));
  });

console.log('\n=== Same email 3+ orders ===');
Object.entries(email_map)
  .filter(([k,v]) => v.length >= 3)
  .sort((a,b) => b[1].length - a[1].length)
  .slice(0, 10)
  .forEach(([k,v]) => console.log(k, v.length, v.slice(0,5).join(',')));

console.log('\n=== CustID clusters (different emails, 2+ orders) ===');
Object.entries(cust_map)
  .filter(([k,v]) => {
    const emails = new Set(v.map(x => x.email));
    return v.length >= 2 && emails.size >= 2;
  })
  .sort((a,b) => b[1].length - a[1].length)
  .slice(0, 15)
  .forEach(([k,v]) => {
    const emails = [...new Set(v.map(x => x.email))];
    console.log(k, `${v.length} orders, ${emails.length} distinct emails`, v.slice(0,3).map(x=>x.oid).join(','));
  });

console.log('\n=== Address clusters (3+ distinct emails) ===');
Object.entries(addr_map)
  .filter(([k,v]) => v.size >= 3)
  .sort((a,b) => b[1].size - a[1].size)
  .slice(0, 10)
  .forEach(([k,v]) => console.log(k.substring(0,60), v.size));

// Count refund/chargeback
let refunds = 0, chargebacks = 0, returns = 0, total = 0;
for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const f = parseRow(lines[i]);
  total++;
  const ref = f[refIdx]?.trim().toLowerCase();
  const cb = f[cbIdx]?.trim().toLowerCase();
  const ret = f[retIdx]?.trim().toLowerCase();
  if (ref === 'true' || ref === '1' || ref === 'yes') refunds++;
  if (cb === 'true' || cb === '1' || cb === 'yes') chargebacks++;
  if (ret === 'true' || ret === '1' || ret === 'yes') returns++;
}
console.log(`\nTotal rows: ${total}, refunds: ${refunds}, chargebacks: ${chargebacks}, returns: ${returns}`);
