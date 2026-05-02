import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { processCsvJob } from '../lib/processing/worker';
import { cleanRow } from '../lib/csv/clean';
import { csvRowSchema } from '../lib/csv/schema';
import { normaliseRow } from '../lib/csv/normalise';
import { buildFastContext } from '../lib/engine/fastContext';
import { scoreBatch } from '../lib/engine/fastScore';

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
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function parseCSV(filePath: string): Record<string, string | undefined>[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row: Record<string, string | undefined> = {};
    headers.forEach((h, i) => {
      row[h] = values[i]?.trim();
    });
    return row;
  });
}

async function clearFraudEntities() {
  console.log('\n=== Clearing fraud_entities table ===');
  const { error } = await supabase.from('fraud_entities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) console.error('Error clearing fraud_entities:', error.message);
  else console.log('✓ Cleared fraud_entities');

  const { error: coError } = await supabase.from('fraud_entity_co_occurrences').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (coError) console.error('Error clearing co_occurrences:', coError.message);
  else console.log('✓ Cleared fraud_entity_co_occurrences');
}

async function countFraudEntities() {
  const { count, error } = await supabase.from('fraud_entities').select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Error counting fraud_entities:', error.message);
    return 0;
  }
  return count ?? 0;
}

async function getEntityStats(entityType: string, entityValue: string) {
  const { data, error } = await supabase
    .from('fraud_entities')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_value', entityValue)
    .single();
  
  if (error) return null;
  return data;
}

async function test1_BaselineMemory() {
  console.log('\n=== TEST 1: Baseline cross-CSV memory test ===');
  
  const rows = parseCSV(join(__dirname, '../test-data/clean.csv'));
  const jobId = 'test-job-1';
  
  await processCsvJob(rows, jobId, supabase);
  
  const count = await countFraudEntities();
  console.log(`✓ fraud_entities row count: ${count}`);
  
  if (count > 0) {
    console.log('✓ TEST 1 PASSED: Entities populated from CSV');
  } else {
    console.log('✗ TEST 1 FAILED: No entities populated');
  }
  
  return count;
}

async function test2_CrossUploadDetection() {
  console.log('\n=== TEST 2: Cross-upload detection test ===');
  
  // Get some rows with refunds from clean.csv
  const rows = parseCSV(join(__dirname, '../test-data/clean.csv'));
  const refundRows = rows.filter(r => r.refund_status && r.refund_status !== 'none').slice(0, 5);
  
  if (refundRows.length === 0) {
    console.log('⚠ No refund rows found, skipping test');
    return;
  }
  
  // Create new CSV with same emails/IPs but different names
  const modifiedRows = refundRows.map(r => ({
    ...r,
    customer_name: 'Different Name ' + Math.random().toString(36).substring(7),
    order_id: r.order_id + '-test2'
  }));
  
  // Score first time (after test1, historical data exists)
  const validPairs: any[] = [];
  for (const raw of modifiedRows) {
    const cleaned = cleanRow(raw);
    const parsed = csvRowSchema.safeParse(cleaned);
    if (parsed.success) {
      validPairs.push({ raw: parsed.data, parsed: parsed.data });
    }
  }
  
  const normOrders = validPairs.map(p => normaliseRow(p.parsed));
  const context = await buildFastContext(normOrders, supabase);
  const scored1 = scoreBatch(normOrders, context, {});
  
  console.log('First upload scores:', scored1.map(s => ({ orderId: s.order.orderId, score: s.totalScore })));
  
  // Score second time (should have higher historical context)
  const context2 = await buildFastContext(normOrders, supabase);
  const scored2 = scoreBatch(normOrders, context2, {});
  
  console.log('Second upload scores:', scored2.map(s => ({ orderId: s.order.orderId, score: s.totalScore })));
  
  const increased = scored2.filter((s, i) => s.totalScore > scored1[i].totalScore).length;
  console.log(`Rows with increased scores: ${increased}/${scored2.length}`);
  
  if (increased > 0) {
    console.log('✓ TEST 2 PASSED: Historical context increased scores');
  } else {
    console.log('✗ TEST 2 FAILED: No score increase detected');
  }
}

async function test3_IPCoOccurrence() {
  console.log('\n=== TEST 3: IP co-occurrence test ===');
  
  // First, create a fraudulent order to establish co-occurrence
  const fraudulentRow = {
    order_id: 'test-fraud-1',
    order_date: '2025-01-01',
    customer_email: 'badactor@test.com',
    customer_name: 'Bad Actor',
    shipping_address: '123 Fraud St',
    order_total: '100',
    currency: 'USD',
    ip_address: '192.168.1.100',
    card_last4: '1234'
  };
  
  const rows = [fraudulentRow];
  const jobId = 'test-job-3a';
  
  // Process fraudulent order
  await processCsvJob(rows, jobId, supabase);
  
  // Now create a new order with same IP but different email
  const newOrder = {
    ...fraudulentRow,
    order_id: 'test-fraud-2',
    customer_email: 'newemail@test.com',
    customer_name: 'New Customer'
  };
  
  const validPairs: any[] = [];
  const cleaned = cleanRow(newOrder);
  const parsed = csvRowSchema.safeParse(cleaned);
  if (parsed.success) {
    validPairs.push({ raw: parsed.data, parsed: parsed.data });
  }
  
  const normOrders = validPairs.map(p => normaliseRow(p.parsed));
  const context = await buildFastContext(normOrders, supabase);
  const scored = scoreBatch(normOrders, context, {});
  
  const crossMerchantSignal = scored[0].signals.find(s => s.name === 'crossMerchant');
  console.log('Cross-merchant signal result:', crossMerchantSignal);
  
  if (crossMerchantSignal && crossMerchantSignal.fired && crossMerchantSignal.score > 0) {
    console.log('✓ TEST 3 PASSED: IP co-occurrence triggered crossMerchant signal');
  } else {
    console.log('✗ TEST 3 FAILED: IP co-occurrence did not trigger signal');
  }
}

async function test4_CleanCustomer() {
  console.log('\n=== TEST 4: Clean customer test ===');
  
  const rows = parseCSV(join(__dirname, '../test-data/clean.csv'));
  const cleanRows = rows.filter(r => (!r.refund_status || r.refund_status === 'none')).slice(0, 5);
  
  const validPairs: any[] = [];
  for (const raw of cleanRows) {
    const cleaned = cleanRow(raw);
    const parsed = csvRowSchema.safeParse(cleaned);
    if (parsed.success) {
      validPairs.push({ raw: parsed.data, parsed: parsed.data });
    }
  }
  
  const normOrders = validPairs.map(p => normaliseRow(p.parsed));
  const context = await buildFastContext(normOrders, supabase);
  const scored = scoreBatch(normOrders, context, {});
  
  console.log('Clean row scores:', scored.map(s => ({ orderId: s.order.orderId, score: s.totalScore })));
  
  const allLow = scored.every(s => s.totalScore < 25);
  if (allLow) {
    console.log('✓ TEST 4 PASSED: Clean customers have low scores');
  } else {
    console.log('✗ TEST 4 FAILED: Some clean customers have high scores');
  }
}

async function test5_Performance() {
  console.log('\n=== TEST 5: Performance test ===');
  
  // Generate 2000 test rows
  const rows: Record<string, string | undefined>[] = [];
  for (let i = 0; i < 2000; i++) {
    rows.push({
      order_id: `perf-test-${i}`,
      order_date: '2025-01-01',
      customer_email: `user${i}@test.com`,
      customer_name: `User ${i}`,
      shipping_address: `${i} Main St`,
      order_total: '100',
      currency: 'USD',
      ip_address: `192.168.1.${i % 255}`,
      card_last4: `${1000 + i % 9000}`
    });
  }
  
  const validPairs: any[] = [];
  for (const raw of rows) {
    const cleaned = cleanRow(raw);
    const parsed = csvRowSchema.safeParse(cleaned);
    if (parsed.success) {
      validPairs.push({ raw: parsed.data, parsed: parsed.data });
    }
  }
  
  const normOrders = validPairs.map(p => normaliseRow(p.parsed));
  
  const startTime = Date.now();
  const context = await buildFastContext(normOrders, supabase);
  const enrichmentTime = Date.now() - startTime;
  
  console.log(`Historical enrichment time for 2000 rows: ${enrichmentTime}ms`);
  
  if (enrichmentTime < 2000) {
    console.log('✓ TEST 5 PASSED: Enrichment completed in <2 seconds');
  } else {
    console.log('✗ TEST 5 FAILED: Enrichment took too long');
  }
}

async function test6_WriteBack() {
  console.log('\n=== TEST 6: Write-back test ===');
  
  await clearFraudEntities();
  
  const testRow = {
    order_id: 'writeback-test-1',
    order_date: '2025-01-01',
    customer_email: 'writeback@test.com',
    customer_name: 'Writeback Test',
    shipping_address: '456 Writeback St',
    order_total: '100',
    currency: 'USD',
    ip_address: '10.0.0.1',
    card_last4: '9999'
  };
  
  // Process first time
  await processCsvJob([testRow], 'test-job-6a', supabase);
  
  const stats1 = await getEntityStats('email', 'writeback@test.com');
  console.log('After first process:', stats1);
  
  // Process second time
  await processCsvJob([testRow], 'test-job-6b', supabase);
  
  const stats2 = await getEntityStats('email', 'writeback@test.com');
  console.log('After second process:', stats2);
  
  if (stats2 && stats1 && stats2.total_orders === stats1.total_orders * 2) {
    console.log('✓ TEST 6 PASSED: Entity counts doubled correctly');
  } else {
    console.log('✗ TEST 6 FAILED: Entity counts did not double correctly');
  }
}

async function runAllTests() {
  console.log('==========================================');
  console.log('FRAUD INTELLIGENCE TEST SUITE');
  console.log('==========================================');
  
  try {
    await clearFraudEntities();
    
    await test1_BaselineMemory();
    await test2_CrossUploadDetection();
    await test3_IPCoOccurrence();
    await test4_CleanCustomer();
    await test5_Performance();
    await test6_WriteBack();
    
    console.log('\n==========================================');
    console.log('TEST SUITE COMPLETE');
    console.log('==========================================');
  } catch (error) {
    console.error('Test suite error:', error);
    process.exit(1);
  }
}

runAllTests();
