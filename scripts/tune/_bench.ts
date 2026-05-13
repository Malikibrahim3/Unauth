const {linkIdentitiesLocal} = require('/Users/malikibrahim/Downloads/Unauth/scripts/tune/localLinker');
const {DEFAULT_CONFIG} = require('/Users/malikibrahim/Downloads/Unauth/scripts/tune/config');
const fs = require('fs');
const orders = JSON.parse(fs.readFileSync('/Users/malikibrahim/Downloads/Unauth/test-data/tune/dataset_75000_0_orders.json','utf8'));
const input = orders.map((o: any)=>({order_id:o.order_id,email:o.customer_email,phone:o.phone,device_fingerprint:o.device_fingerprint,ip:o.device_ip,shipping_address:o.shipping_address,card_last4:o.card_last4,card_bin:o.card_bin,card_fingerprint:o.card_fingerprint,postcode:o.postcode,account_id:o.account_id,name:o.customer_name}));
const t=Date.now();
const r=linkIdentitiesLocal(input,DEFAULT_CONFIG);
console.log('75k link:',Date.now()-t,'ms clusters:',r.clusters.length);
