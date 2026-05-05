import { linkIdentities } from '../lib/linker';

// Test 1: GuardIP - country codes and currency codes should be rejected
const result1 = linkIdentities([
  { order_id: 'A', ip: 'GB', email: 'a@test.com' },
  { order_id: 'B', ip: 'GBP', email: 'b@test.com' },
]);
console.log('GuardIP (GB, GBP):', result1.candidatePairs.length === 0 ? 'PASS' : 'FAIL');

// Test 2: GuardIP - real IPs should still work
const result2 = linkIdentities([
  { order_id: 'A', ip: '82.45.123.67', email: 'a@test.com' },
  { order_id: 'B', ip: '82.45.123.67', email: 'b@test.com' },
]);
console.log('GuardIP (real IP):', result2.candidatePairs.length === 0 ? 'PASS (IP-only rejected)' : 'FAIL');

// Test 3: GuardCardLast4 - IP address in card field should be rejected
const result3 = linkIdentities([
  { order_id: 'A', card_last4: '82.45.123.67', email: 'a@test.com' },
  { order_id: 'B', card_last4: '82.45.123.67', email: 'b@test.com' },
]);
console.log('GuardCard (IP in last4):', result3.candidatePairs.length === 0 ? 'PASS' : 'FAIL');

// Test 4: GuardCardLast4 - valid card should still work
const result4 = linkIdentities([
  { order_id: 'A', card_last4: '7842', card_bin: '412345', email: 'a@test.com' },
  { order_id: 'B', card_last4: '7842', card_bin: '412345', email: 'b@test.com' },
]);
console.log('GuardCard (valid):', result4.candidatePairs.length === 1 && result4.clusters.length === 1 ? 'PASS' : 'FAIL');

// Test 5: Combined - country code IP + valid email + valid card still links
const result5 = linkIdentities([
  { order_id: 'A', ip: 'GB', card_last4: '7842', card_bin: '412345', email: 'a@test.com' },
  { order_id: 'B', ip: 'GB', card_last4: '7842', card_bin: '412345', email: 'a@test.com' },
]);
console.log('Combined (GB IP + valid card+email):', result5.candidatePairs.length === 1 ? 'PASS' : 'FAIL');
