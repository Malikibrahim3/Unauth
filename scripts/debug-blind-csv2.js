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

// normaliseEmail like the linker does
function normaliseEmail(raw) {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  const at = lower.indexOf('@');
  if (at < 1 || at === lower.length - 1) return null;
  const localPart = lower.slice(0, at).split('+')[0].replace(/\./g, '');
  const domain = lower.slice(at + 1);
  if (!localPart) return null;
  return localPart + '@' + domain;
}

const normEmail_to_raws = {};
const normEmail_to_orders = {};

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const f = parseRow(lines[i]);
  const email = get(f, 'email');
  const oid = get(f, 'order_id');
  const cust = get(f, 'customer_id');
  const pm = get(f, 'payment_method');
  const date = get(f, 'order_date');
  const status = get(f, 'order_status');
  const cb = get(f, 'chargeback_dispute').toLowerCase();
  const ref = get(f, 'refund_requested').toLowerCase();
  const ret = get(f, 'return_requested').toLowerCase();
  const shipping = get(f, 'shipping_address');
  
  const norm = normaliseEmail(email);
  if (!norm) continue;
  
  if (!normEmail_to_raws[norm]) normEmail_to_raws[norm] = new Set();
  normEmail_to_raws[norm].add(email);
  
  if (!normEmail_to_orders[norm]) normEmail_to_orders[norm] = [];
  normEmail_to_orders[norm].push({oid, email, cust, pm, date, status, cb, ref, ret, shipping});
}

// Find norm-emails that have DIFFERENT raw emails (email variant pattern)
const variant_clusters = Object.entries(normEmail_to_raws).filter(([norm, raws]) => raws.size >= 2);
console.log('Norm-email clusters with 2+ different raw emails:', variant_clusters.length);
variant_clusters.sort((a, b) => b[1].size - a[1].size).slice(0, 20).forEach(([norm, raws]) => {
  const os = normEmail_to_orders[norm];
  const hasFraud = os.some(o => o.cb === 'true' || o.ref === 'true' || o.ret === 'true');
  const pms = [...new Set(os.map(o => o.pm))].join('/');
  const custs = [...new Set(os.map(o => o.cust))].join(', ');
  console.log('  norm: ' + norm);
  console.log('  raws: ' + [...raws].join(' | '));
  console.log('  orders: ' + os.length + ', fraud: ' + hasFraud + ', pms: ' + pms);
  console.log('  custs: ' + custs);
  console.log('  order ids: ' + os.map(o => o.oid).join(', '));
  console.log();
});

// Also check customer_id patterns (account ID variants)
const cust_to_emails = {};
for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const f = parseRow(lines[i]);
  const email = get(f, 'email');
  const cust = get(f, 'customer_id');
  const oid = get(f, 'order_id');
  if (!cust) continue;
  if (!cust_to_emails[cust]) cust_to_emails[cust] = {emails: new Set(), oids: []};
  cust_to_emails[cust].emails.add(email);
  cust_to_emails[cust].oids.push(oid);
}

// customer IDs shared by multiple emails
const shared_custs = Object.entries(cust_to_emails).filter(([c, d]) => d.emails.size >= 2);
console.log('Customer IDs shared by 2+ different emails:', shared_custs.length);
shared_custs.slice(0,10).forEach(([c, d]) => {
  console.log('  cust: ' + c + ', emails: ' + [...d.emails].join(', '), ', orders: ' + d.oids.join(', '));
});

// Check payment churn - customers with many different PMs
const email_pms = {};
for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const f = parseRow(lines[i]);
  const email = get(f, 'email');
  const pm = get(f, 'payment_method');
  if (!email_pms[email]) email_pms[email] = new Set();
  if (pm) email_pms[email].add(pm);
}
const high_pm_churn = Object.entries(email_pms).filter(([e, pms]) => pms.size >= 4);
console.log('\nEmails with 4+ distinct payment methods:', high_pm_churn.length);

// Check IP patterns
const ip_emails = {};
for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const f = parseRow(lines[i]);
  const email = get(f, 'email');
  const ip = get(f, 'ip_address');
  if (!email_pms[email]) email_pms[email] = new Set();
  if (!ip_emails[ip]) ip_emails[ip] = new Set();
  if (ip) ip_emails[ip].add(email);
}
const shared_ips = Object.entries(ip_emails).filter(([ip, emails]) => emails.size >= 3);
console.log('\nIPs shared by 3+ emails:', shared_ips.length);
shared_ips.slice(0, 5).forEach(([ip, emails]) => console.log('  ' + ip + ': ' + [...emails].join(', ')));
