/**
 * Clear demo/seed data for a specific merchant, leaving real Shopify/webhook data intact.
 * Run: node scripts/clear-demo-data.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lquvbikyvmbjbfffrlky.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdXZiaWt5dm1iamJmZmZybGt5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODE3NzAxMywiZXhwIjoyMDkzNzUzMDEzfQ.ti445m1WDHMhFoM9-iKestIxZrpZTMFf6Cy0ahh-PDM';

const TARGET_EMAIL = 'simeonmurray123@gmail.com';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  console.log('=== Unauth Demo Data Cleanup ===\n');

  // 1. Find the user by email
  const { data: { users }, error: userErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (userErr) { console.error('Failed to list users:', userErr.message); process.exit(1); }

  const user = users.find(u => u.email === TARGET_EMAIL);
  if (!user) { console.error(`User not found: ${TARGET_EMAIL}`); process.exit(1); }
  console.log(`User: ${user.email} (${user.id})`);

  // 2. Find their merchant
  const { data: merchantMember, error: mmErr } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('user_id', user.id)
    .single();
  if (mmErr) { console.error('Failed to find merchant:', mmErr.message); process.exit(1); }

  const merchantId = merchantMember.merchant_id;
  console.log(`Merchant ID: ${merchantId}\n`);

  // 3. Audit what data exists
  console.log('--- Current data audit ---');

  const { data: orderSources } = await supabase
    .from('source_orders')
    .select('source')
    .eq('merchant_id', merchantId);

  const sourceCounts = {};
  for (const row of orderSources ?? []) {
    sourceCounts[row.source ?? 'null'] = (sourceCounts[row.source ?? 'null'] ?? 0) + 1;
  }
  console.log('Orders by source:', sourceCounts);

  const { count: jobCount } = await supabase
    .from('sync_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId);
  console.log(`Sync jobs: ${jobCount}`);

  const { count: hiddenJobCount } = await supabase
    .from('sync_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('hidden_by_merchant', true);
  console.log(`  Already hidden: ${hiddenJobCount}`);

  const { count: profileCount } = await supabase
    .from('identities')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId);
  console.log(`Customer profiles: ${profileCount}`);

  const { count: claimCount } = await supabase
    .from('support_payout_cases')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId);
  console.log(`Claims: ${claimCount}`);

  const { count: ticketCount } = await supabase
    .from('source_tickets')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId);
  console.log(`Support tickets: ${ticketCount}`);

  const shopifyOrders = sourceCounts['shopify'] ?? 0;
  const demoOrders = sourceCounts['demo'] ?? 0;
  const wooOrders = sourceCounts['woocommerce'] ?? 0;
  const csvOrders = sourceCounts['csv'] ?? 0;

  console.log('\n--- Analysis ---');
  console.log(`Real order sources: shopify=${shopifyOrders}, woocommerce=${wooOrders}`);
  console.log(`Demo/seed orders: demo=${demoOrders}, csv=${csvOrders}`);

  if (demoOrders === 0 && csvOrders === 0 && (jobCount ?? 0) === 0) {
    console.log('\nNo demo data found. Nothing to clean up.');
    return;
  }

  // 4. Delete demo source_orders
  if (demoOrders > 0) {
    console.log(`\nDeleting ${demoOrders} demo source_orders...`);
    const { error: delErr } = await supabase
      .from('source_orders')
      .delete()
      .eq('merchant_id', merchantId)
      .eq('source', 'demo');
    if (delErr) console.error('  Error:', delErr.message);
    else console.log('  Done.');
  }

  // 5. Delete CSV source_orders (uploaded sample data, not real Shopify)
  if (csvOrders > 0) {
    console.log(`\nDeleting ${csvOrders} CSV-uploaded source_orders...`);
    const { error: delErr } = await supabase
      .from('source_orders')
      .delete()
      .eq('merchant_id', merchantId)
      .eq('source', 'csv');
    if (delErr) console.error('  Error:', delErr.message);
    else console.log('  Done.');
  }

  // 6. Hide all sync_jobs (audit runs) — soft delete so they disappear from UI
  if ((jobCount ?? 0) > 0) {
    console.log(`\nHiding all ${jobCount} sync_jobs...`);
    const { error: jobErr } = await supabase
      .from('sync_jobs')
      .update({ hidden_by_merchant: true })
      .eq('merchant_id', merchantId);
    if (jobErr) console.error('  Error:', jobErr.message);
    else console.log('  Done.');
  }

  // 7. Delete derived identity data (profiles, signals, edges, identifiers)
  //    These were built from demo orders so are now stale.
  //    Real Shopify orders will rebuild them when re-processed.
  console.log('\nCleaning up derived identity data...');

  const { count: signalCount } = await supabase
    .from('customer_identity_signals')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId);

  if ((signalCount ?? 0) > 0) {
    const { error } = await supabase
      .from('customer_identity_signals')
      .delete()
      .eq('merchant_id', merchantId);
    if (error) console.error('  Signals error:', error.message);
    else console.log(`  Deleted ${signalCount} identity signals.`);
  }

  const { count: identifierCount } = await supabase
    .from('identity_identifiers')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId);

  if ((identifierCount ?? 0) > 0) {
    const { error } = await supabase
      .from('identity_identifiers')
      .delete()
      .eq('merchant_id', merchantId);
    if (error) console.error('  Identifiers error:', error.message);
    else console.log(`  Deleted ${identifierCount} identity identifiers.`);
  }

  const { count: edgeCount } = await supabase
    .from('identity_edges')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId);

  if ((edgeCount ?? 0) > 0) {
    const { error } = await supabase
      .from('identity_edges')
      .delete()
      .eq('merchant_id', merchantId);
    if (error) console.error('  Edges error:', error.message);
    else console.log(`  Deleted ${edgeCount} identity edges.`);
  }

  if ((profileCount ?? 0) > 0) {
    const { error } = await supabase
      .from('identities')
      .delete()
      .eq('merchant_id', merchantId);
    if (error) console.error('  Profiles error:', error.message);
    else console.log(`  Deleted ${profileCount} customer profiles.`);
  }

  // 8. Delete claims derived from demo data (keep real claims if any flagged manually)
  if ((claimCount ?? 0) > 0) {
    console.log(`\nDeleting ${claimCount} claims (derived from demo processing)...`);
    const { error } = await supabase
      .from('support_payout_cases')
      .delete()
      .eq('merchant_id', merchantId);
    if (error) console.error('  Error:', error.message);
    else console.log('  Done.');
  }

  // 9. Final audit
  console.log('\n--- Post-cleanup audit ---');
  const { data: remainingOrders } = await supabase
    .from('source_orders')
    .select('source')
    .eq('merchant_id', merchantId);

  const remainingCounts = {};
  for (const row of remainingOrders ?? []) {
    remainingCounts[row.source ?? 'null'] = (remainingCounts[row.source ?? 'null'] ?? 0) + 1;
  }
  console.log('Remaining orders by source:', remainingCounts);

  const { count: remainingProfiles } = await supabase
    .from('identities')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId);
  console.log(`Remaining customer profiles: ${remainingProfiles}`);

  const { count: remainingClaims } = await supabase
    .from('support_payout_cases')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId);
  console.log(`Remaining claims: ${remainingClaims}`);

  console.log('\n✓ Cleanup complete. Real Shopify/Gorgias data preserved.');
  console.log('  The Shopify sync will rebuild customer profiles from real orders.');
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
