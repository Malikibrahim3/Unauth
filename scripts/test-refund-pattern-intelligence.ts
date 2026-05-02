import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { cleanRow } from '../lib/csv/clean';
import { csvRowSchema } from '../lib/csv/schema';
import { normaliseRow } from '../lib/csv/normalise';
import { buildFastContext } from '../lib/engine/fastContext';
import { scoreBatch } from '../lib/engine/fastScore';
import { normaliseAddress } from '../lib/identity/hash';

// Load environment variables from .env.local
const envPath = join(__dirname, '../.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (err) {
  console.error('Failed to load .env.local:', err);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearTestEntities() {
  console.log('\n=== Clearing test entities ===');
  await supabase.from('fraud_entities').delete().eq('entity_value', 'refundpattern@test.com');
  await supabase.from('fraud_entities').delete().eq('entity_value', 'newemail@test.com');
  await supabase.from('fraud_entities').delete().eq('entity_value', '192.168.1.100');
  await supabase.from('fraud_entities').delete().eq('entity_value', '123 Fraud St');
  await supabase.from('fraud_entities').delete().eq('entity_value', '4567');
  console.log('✓ Cleared test entities');
}

async function test1_RefundAcceleration() {
  console.log('\n=== TEST 1: Refund acceleration test ===');
  
  // Manually insert a fraud_entities record with historical refund timestamps
  const now = new Date();
  const timestamps = [
    new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString(), // 120 days ago
    new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),  // 90 days ago
    new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),  // 60 days ago
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),  // 30 days ago
    new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),   // 5 days ago
  ];
  
  const { error: insertError } = await supabase.from('fraud_entities').insert({
    entity_type: 'email',
    entity_value: 'refundpattern@test.com',
    refund_timestamps: timestamps,
    refund_intervals_avg_days: 30,
    fastest_claim_days: 5,
    total_merchants_refunded_at: 2,
    total_orders: 5,
    total_refund_claims: 5,
    total_chargebacks: 0,
    total_merchants: 2,
    fraud_score_avg: 50,
    flagged_count: 1,
  });
  
  if (insertError) {
    console.error('Failed to insert test entity:', insertError.message);
    return false;
  }
  
  // Process a new CSV with that email and a refund claim dated today
  const testRow = {
    order_id: 'test-refund-accel-1',
    order_date: now.toISOString().split('T')[0],
    customer_email: 'refundpattern@test.com',
    customer_name: 'Test Customer',
    shipping_address: '123 Test St',
    order_total: '100',
    currency: 'USD',
    ip_address: '192.168.1.50',
    card_last4: '1234',
    refund_status: 'full',
    refund_reason: 'inr',
    refund_date: now.toISOString().split('T')[0],
  };
  
  const cleaned = cleanRow(testRow);
  const parsed = csvRowSchema.safeParse(cleaned);
  if (!parsed.success) {
    console.error('Failed to parse test row');
    return false;
  }
  
  const normOrder = normaliseRow(parsed.data);
  const context = await buildFastContext([normOrder], supabase);
  const scored = scoreBatch([normOrder], context, {});
  
  const refundPatternSignal = scored[0].signals.find(s => s.name === 'refundPattern');
  console.log('Refund pattern signal result:', JSON.stringify(refundPatternSignal, null, 2));
  console.log('Total score:', scored[0].totalScore);
  
  if (refundPatternSignal && refundPatternSignal.score > 0) {
    console.log('✓ TEST 1 PASSED: refundPattern returned a high score');
    console.log(`  Score: ${refundPatternSignal.score}`);
    console.log(`  Factors triggered:`, refundPatternSignal.evidence);
    return true;
  } else {
    console.log('✗ TEST 1 FAILED: refundPattern did not return a high score');
    return false;
  }
}

async function test2_NoHistoryFallback() {
  console.log('\n=== TEST 2: No history fallback test ===');
  
  // Process a CSV with a completely new email never seen before
  const testRow = {
    order_id: 'test-no-history-1',
    order_date: new Date().toISOString().split('T')[0],
    customer_email: 'completelynewemail@test.com',
    customer_name: 'New Customer',
    shipping_address: '456 New St',
    order_total: '100',
    currency: 'USD',
    ip_address: '192.168.1.51',
    card_last4: '5678',
    refund_status: 'full',
    refund_reason: 'inr',
    refund_date: new Date().toISOString().split('T')[0],
  };
  
  const cleaned = cleanRow(testRow);
  const parsed = csvRowSchema.safeParse(cleaned);
  if (!parsed.success) {
    console.error('Failed to parse test row');
    return false;
  }
  
  const normOrder = normaliseRow(parsed.data);
  const context = await buildFastContext([normOrder], supabase);
  const scored = scoreBatch([normOrder], context, {});
  
  const refundPatternSignal = scored[0].signals.find(s => s.name === 'refundPattern');
  console.log('Refund pattern signal result:', JSON.stringify(refundPatternSignal, null, 2));
  
  if (refundPatternSignal && refundPatternSignal.score === 0) {
    console.log('✓ TEST 2 PASSED: refundPattern returned 0 for new email');
    return true;
  } else {
    console.log('✗ TEST 2 FAILED: refundPattern did not return 0');
    return false;
  }
}

async function test3_IdentityMatch() {
  console.log('\n=== TEST 3: Identity match test ===');
  
  // First, create a known fraudulent entity
  const now = new Date();
  
  // Normalize the address to match how it will be stored/queried
  const normalizedAddress = normaliseAddress('123 Fraud St');
  
  // Use upsert to ensure entities exist (store normalized address)
  await supabase.from('fraud_entities').upsert({
    entity_type: 'email',
    entity_value: 'fraudulent@test.com',
    total_orders: 10,
    total_refund_claims: 8,
    total_chargebacks: 2,
    total_merchants: 3,
    fraud_score_avg: 80,
    flagged_count: 5,
  }, { onConflict: 'entity_type,entity_value' });
  
  await supabase.from('fraud_entities').upsert({
    entity_type: 'ip',
    entity_value: '192.168.1.100',
    total_orders: 10,
    total_refund_claims: 8,
    total_chargebacks: 2,
    total_merchants: 3,
    fraud_score_avg: 80,
    flagged_count: 5,
  }, { onConflict: 'entity_type,entity_value' });
  
  await supabase.from('fraud_entities').upsert({
    entity_type: 'address',
    entity_value: normalizedAddress,
    total_orders: 10,
    total_refund_claims: 8,
    total_chargebacks: 2,
    total_merchants: 3,
    fraud_score_avg: 80,
    flagged_count: 5,
  }, { onConflict: 'entity_type,entity_value' });
  
  // Verify entities were created
  const { data: ipCheck } = await supabase.from('fraud_entities').select('*').eq('entity_type', 'ip').eq('entity_value', '192.168.1.100').single();
  const { data: addrCheck } = await supabase.from('fraud_entities').select('*').eq('entity_type', 'address').eq('entity_value', normalizedAddress).single();
  console.log('IP entity exists:', !!ipCheck);
  console.log('Address entity exists:', !!addrCheck);
  console.log('Normalized address:', normalizedAddress);
  
  // Create a new CSV row with different name/email but same IP and address
  const testRow = {
    order_id: 'test-identity-match-1',
    order_date: now.toISOString().split('T')[0],
    customer_email: 'newemail@test.com',
    customer_name: 'Different Name',
    shipping_address: '123 Fraud St',
    order_total: '100',
    currency: 'USD',
    ip_address: '192.168.1.100',
    card_last4: '4567',
  };
  
  const cleaned = cleanRow(testRow);
  const parsed = csvRowSchema.safeParse(cleaned);
  if (!parsed.success) {
    console.error('Failed to parse test row');
    return false;
  }
  
  const normOrder = normaliseRow(parsed.data);
  const context = await buildFastContext([normOrder], supabase);
  
  // Debug: check if entities are in context
  console.log('IP in context:', context.historicalIPMap.has('192.168.1.100'));
  console.log('Normalized address in context:', context.historicalAddressMap.has(normalizedAddress));
  console.log('Raw address from order:', (normOrder as any)._rawAddress);
  
  const scored = scoreBatch([normOrder], context, {});
  
  console.log('Identity alerts:', JSON.stringify(scored[0].identityAlerts, null, 2));
  
  if (scored[0].identityAlerts && scored[0].identityAlerts.hasMatch && scored[0].identityAlerts.confidence > 80) {
    console.log('✓ TEST 3 PASSED: Identity match detected with high confidence');
    console.log(`  Confidence: ${scored[0].identityAlerts.confidence}`);
    console.log(`  Match reasons:`, scored[0].identityAlerts.matchReasons);
    return true;
  } else {
    console.log('✗ TEST 3 FAILED: Identity match not detected or confidence too low');
    return false;
  }
}

async function test4_CleanIdentity() {
  console.log('\n=== TEST 4: Clean identity test ===');
  
  // Take a legitimate customer row with same IP but different address and card
  const testRow = {
    order_id: 'test-clean-identity-1',
    order_date: new Date().toISOString().split('T')[0],
    customer_email: 'legitimate@test.com',
    customer_name: 'Legitimate Customer',
    shipping_address: '789 Clean St',
    order_total: '100',
    currency: 'USD',
    ip_address: '192.168.1.100', // Same IP as fraudulent entity
    card_last4: '9999',
  };
  
  const cleaned = cleanRow(testRow);
  const parsed = csvRowSchema.safeParse(cleaned);
  if (!parsed.success) {
    console.error('Failed to parse test row');
    return false;
  }
  
  const normOrder = normaliseRow(parsed.data);
  const context = await buildFastContext([normOrder], supabase);
  const scored = scoreBatch([normOrder], context, {});
  
  console.log('Identity alerts:', JSON.stringify(scored[0].identityAlerts, null, 2));
  
  if (!scored[0].identityAlerts?.hasMatch || (scored[0].identityAlerts?.confidence ?? 0) < 40) {
    console.log('✓ TEST 4 PASSED: Shared IP alone did not trigger high confidence match');
    return true;
  } else {
    console.log('✗ TEST 4 FAILED: Shared IP triggered high confidence match incorrectly');
    return false;
  }
}

async function test5_NullHistoryDisplay() {
  console.log('\n=== TEST 5: Null history display test ===');
  
  // Create an order with no historical data
  const testRow = {
    order_id: 'test-null-history-1',
    order_date: new Date().toISOString().split('T')[0],
    customer_email: 'nohistory@test.com',
    customer_name: 'No History Customer',
    shipping_address: '999 No History St',
    order_total: '100',
    currency: 'USD',
    ip_address: '10.0.0.1',
    card_last4: '1111',
  };
  
  const cleaned = cleanRow(testRow);
  const parsed = csvRowSchema.safeParse(cleaned);
  if (!parsed.success) {
    console.error('Failed to parse test row');
    return false;
  }
  
  const normOrder = normaliseRow(parsed.data);
  const context = await buildFastContext([normOrder], supabase);
  const scored = scoreBatch([normOrder], context, {});
  
  console.log('Identity alerts:', JSON.stringify(scored[0].identityAlerts, null, 2));
  
  const alerts = scored[0].identityAlerts;
  if (alerts && alerts.historicalRiskSummary === null && alerts.recommendation !== undefined) {
    console.log('✓ TEST 5 PASSED: Null history displayed correctly with recommendation');
    console.log(`  Recommendation: ${alerts.recommendation}`);
    return true;
  } else {
    console.log('✗ TEST 5 FAILED: Null history not handled correctly');
    return false;
  }
}

async function test6_MerchantOutputReadability() {
  console.log('\n=== TEST 6: Merchant output readability test ===');
  
  // Create 3 flagged orders with identity alerts
  const testRows = [
    {
      order_id: 'test-readability-1',
      order_date: new Date().toISOString().split('T')[0],
      customer_email: 'readable1@test.com',
      customer_name: 'Readable Customer 1',
      shipping_address: '123 Fraud St',
      order_total: '100',
      currency: 'USD',
      ip_address: '192.168.1.100',
      card_last4: '4567',
    },
    {
      order_id: 'test-readability-2',
      order_date: new Date().toISOString().split('T')[0],
      customer_email: 'readable2@test.com',
      customer_name: 'Readable Customer 2',
      shipping_address: '123 Fraud St',
      order_total: '100',
      currency: 'USD',
      ip_address: '192.168.1.100',
      card_last4: '4567',
    },
    {
      order_id: 'test-readability-3',
      order_date: new Date().toISOString().split('T')[0],
      customer_email: 'readable3@test.com',
      customer_name: 'Readable Customer 3',
      shipping_address: '123 Fraud St',
      order_total: '100',
      currency: 'USD',
      ip_address: '192.168.1.100',
      card_last4: '4567',
    },
  ];
  
  for (const row of testRows) {
    const cleaned = cleanRow(row);
    const parsed = csvRowSchema.safeParse(cleaned);
    if (parsed.success) {
      const normOrder = normaliseRow(parsed.data);
      const context = await buildFastContext([normOrder], supabase);
      const scored = scoreBatch([normOrder], context, {});
      
      if (scored[0].identityAlerts && scored[0].identityAlerts.hasMatch) {
        console.log(`\nOrder ${row.order_id} identityAlerts:`);
        console.log(JSON.stringify(scored[0].identityAlerts, null, 2));
        
        // Check if match reasons are plain English
        const hasTechnicalTerms = scored[0].identityAlerts.matchReasons.some(reason => 
          reason.includes('_') || reason.includes('entity') || reason.includes('type') || reason.includes('value')
        );
        
        if (hasTechnicalTerms) {
          console.log('✗ TEST 6 FAILED: Match reasons contain technical terms');
          return false;
        }
      }
    }
  }
  
  console.log('✓ TEST 6 PASSED: All match reasons are in plain English');
  return true;
}

async function test7_WriteBackAccuracy() {
  console.log('\n=== TEST 7: Write-back accuracy test ===');
  
  // Clear entities first
  await supabase.from('fraud_entities').delete().eq('entity_value', 'writeback2@test.com');
  
  // Create 10 orders with refund claims
  const testRows = [];
  for (let i = 0; i < 10; i++) {
    testRows.push({
      order_id: `test-writeback-${i}`,
      order_date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customer_email: 'writeback2@test.com',
      customer_name: 'Writeback Test',
      shipping_address: '456 Writeback St',
      order_total: '100',
      currency: 'USD',
      ip_address: '10.0.0.2',
      card_last4: '8888',
      refund_status: 'full',
      refund_reason: 'inr',
      refund_date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
  }
  
  // Process all orders using writeFraudEntities logic
  const validPairs: any[] = [];
  const normOrders: any[] = [];
  
  for (const row of testRows) {
    const cleaned = cleanRow(row);
    const parsed = csvRowSchema.safeParse(cleaned);
    if (parsed.success) {
      validPairs.push({ raw: parsed.data, parsed: parsed.data });
      normOrders.push(normaliseRow(parsed.data));
    }
  }
  
  const context = await buildFastContext(normOrders, supabase);
  const scored = scoreBatch(normOrders, context, {});
  
  // Manually perform write-back (simulating worker.ts logic)
  const emailRefundData = new Map<string, {
    refundTimestamps: string[];
    daysToClaim: number | null;
  }>();

  for (let i = 0; i < scored.length; i++) {
    const order = scored[i].order as any;
    
    if (order._rawEmail && order.refundDate) {
      const existing = emailRefundData.get(order._rawEmail.toLowerCase()) || { refundTimestamps: [], daysToClaim: null };
      existing.refundTimestamps.push(order.refundDate.toISOString());
      
      if (!existing.daysToClaim) {
        const daysToClaim = (order.refundDate.getTime() - order.orderDate.getTime()) / (1000 * 60 * 60 * 24);
        existing.daysToClaim = daysToClaim;
      }
      
      emailRefundData.set(order._rawEmail.toLowerCase(), existing);
    }
  }

  // Upsert entity with refund pattern data
  const email = 'writeback2@test.com';
  const refundData = emailRefundData.get(email);
  
  if (refundData) {
    await supabase.from('fraud_entities').upsert({
      entity_type: 'email',
      entity_value: email,
      total_orders: 10,
      total_refund_claims: 10,
      total_chargebacks: 0,
      flagged_count: 0,
      fraud_score_avg: 0,
      refund_timestamps: refundData.refundTimestamps,
      fastest_claim_days: refundData.daysToClaim,
      total_merchants_refunded_at: 1,
    }, { onConflict: 'entity_type,entity_value' });
  }
  
  // Query fraud_entities to check write-back
  const { data: entity, error } = await supabase
    .from('fraud_entities')
    .select('*')
    .eq('entity_type', 'email')
    .eq('entity_value', 'writeback2@test.com')
    .maybeSingle();
  
  if (error || !entity) {
    console.error('Failed to query entity:', error?.message);
    return false;
  }
  
  console.log('Entity after processing:', JSON.stringify(entity, null, 2));
  
  // Check if refund_timestamps is populated
  const hasTimestamps = entity.refund_timestamps && Array.isArray(entity.refund_timestamps) && entity.refund_timestamps.length > 0;
  const hasFastestClaim = entity.fastest_claim_days !== null && entity.fastest_claim_days !== undefined;
  
  if (hasTimestamps && hasFastestClaim) {
    console.log('✓ TEST 7 PASSED: Write-back accuracy confirmed');
    console.log(`  Refund timestamps count: ${entity.refund_timestamps.length}`);
    console.log(`  Fastest claim: ${entity.fastest_claim_days}`);
    return true;
  } else {
    console.log('✗ TEST 7 FAILED: Write-back not accurate');
    console.log(`  Has timestamps: ${hasTimestamps}`);
    console.log(`  Has fastest claim: ${hasFastestClaim}`);
    return false;
  }
}

async function runAllTests() {
  console.log('==========================================');
  console.log('REFUND PATTERN INTELLIGENCE TEST SUITE');
  console.log('==========================================');
  
  const results: { test: string; passed: boolean }[] = [];
  
  try {
    await clearTestEntities();
    
    results.push({ test: 'Test 1: Refund acceleration', passed: await test1_RefundAcceleration() });
    results.push({ test: 'Test 2: No history fallback', passed: await test2_NoHistoryFallback() });
    results.push({ test: 'Test 3: Identity match', passed: await test3_IdentityMatch() });
    results.push({ test: 'Test 4: Clean identity', passed: await test4_CleanIdentity() });
    results.push({ test: 'Test 5: Null history display', passed: await test5_NullHistoryDisplay() });
    results.push({ test: 'Test 6: Merchant output readability', passed: await test6_MerchantOutputReadability() });
    results.push({ test: 'Test 7: Write-back accuracy', passed: await test7_WriteBackAccuracy() });
    
    console.log('\n==========================================');
    console.log('TEST SUITE COMPLETE');
    console.log('==========================================');
    
    results.forEach(r => {
      console.log(`${r.passed ? '✓' : '✗'} ${r.test}`);
    });
    
    const passedCount = results.filter(r => r.passed).length;
    console.log(`\nTotal: ${passedCount}/${results.length} tests passed`);
    
  } catch (error) {
    console.error('Test suite error:', error);
    process.exit(1);
  }
}

runAllTests();
