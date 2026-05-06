const {readFileSync} = require('fs');
const lines = readFileSync('friendly_fraud_blind_test_2000.csv','utf8').trim().split('\n');
const headers = lines[0].split(',');
const idx = (n) => headers.indexOf(n);

const cbIdx = idx('chargeback_dispute'), refIdx = idx('refund_requested'), retIdx = idx('return_requested');
const emailIdx = idx('email'), phoneIdx = idx('phone'), shippingIdx = idx('shipping_address');
const billingIdx = idx('billing_address'), cardIdx = idx('payment_method'), deviceIdx = idx('device_type');

const cbVals = new Set(), refVals = new Set(), retVals = new Set();
const phone_to_emails = {};
const shipping_to_emails = {};
let cbCount = 0, refCount = 0, retCount = 0;

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const f = lines[i].split(',');
  const cb = (f[cbIdx]||'').trim();
  const ref = (f[refIdx]||'').trim();
  const ret = (f[retIdx]||'').trim();
  const email = (f[emailIdx]||'').trim();
  const phone = (f[phoneIdx]||'').trim();
  const shipping = (f[shippingIdx]||'').trim();
  
  cbVals.add(cb); refVals.add(ref); retVals.add(ret);
  if (cb && cb !== 'false' && cb !== '0' && cb !== 'False') cbCount++;
  if (ref && ref !== 'false' && ref !== '0' && ref !== 'False') refCount++;
  if (ret && ret !== 'false' && ret !== '0' && ret !== 'False') retCount++;
  
  if (phone) {
    if (!phone_to_emails[phone]) phone_to_emails[phone] = new Set();
    phone_to_emails[phone].add(email);
  }
  if (shipping) {
    if (!shipping_to_emails[shipping]) shipping_to_emails[shipping] = new Set();
    shipping_to_emails[shipping].add(email);
  }
}

console.log('CB unique values:', [...cbVals].slice(0,5).join('|'));
console.log('Ref unique values:', [...refVals].slice(0,5).join('|'));
console.log('Ret unique values:', [...retVals].slice(0,5).join('|'));
console.log('CB truthy count:', cbCount, 'Ref:', refCount, 'Ret:', retCount);

const sharedPhones = Object.entries(phone_to_emails).filter(([p,es]) => es.size >= 2);
console.log('\nPhones shared by 2+ different emails:', sharedPhones.length);
sharedPhones.slice(0,10).forEach(([p, es]) => console.log(' ', p, '->', [...es].join(' | ')));

const sharedShipping = Object.entries(shipping_to_emails).filter(([s,es]) => es.size >= 3);
console.log('\nShipping addresses shared by 3+ different emails:', sharedShipping.length);
sharedShipping.slice(0,10).forEach(([s, es]) => console.log(' ', s, '-> emails:', es.size));
