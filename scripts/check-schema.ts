import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://saeueexkqmubnveacepr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZXVlZXhrcG11Ym52ZWFjZXByIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU3MDA1OSwiZXhwIjoyMDkzMTQ2MDU5fQ.mrjxDjY8wYxcoP-mSKPL1owjl5BnwrlgzvN9k145ROk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('=== Checking current schema ===');
  
  // Try to insert a test record to check schema
  try {
    const { data: testData, error: testError } = await supabase
      .from('fraud_entities')
      .insert({
        entity_type: 'email',
        entity_value: 'test@example.com',
        total_orders: 1,
        total_refund_claims: 0,
        total_chargebacks: 0,
        total_merchants: 1,
        fraud_score_avg: 0,
        flagged_count: 0,
      })
      .select();
    
    if (testError) {
      console.error('fraud_entities schema check failed:', testError.message);
      console.error('Details:', testError);
    } else {
      console.log('✓ fraud_entities schema is correct');
      console.log('Test insert successful, cleaning up...');
      
      // Clean up
      await supabase
        .from('fraud_entities')
        .delete()
        .eq('entity_value', 'test@example.com');
    }
  } catch (err) {
    console.error('Unexpected error checking fraud_entities:', err);
  }
  
  // Check co-occurrences
  try {
    const { data: coData, error: coError } = await supabase
      .from('fraud_entity_co_occurrences')
      .insert({
        entity_a_type: 'email',
        entity_a_value: 'test@example.com',
        entity_b_type: 'ip',
        entity_b_value: '192.168.1.1',
        co_occurrence_count: 1,
      })
      .select();
    
    if (coError) {
      console.error('fraud_entity_co_occurrences schema check failed:', coError.message);
      console.error('Details:', coError);
    } else {
      console.log('✓ fraud_entity_co_occurrences schema is correct');
      console.log('Test insert successful, cleaning up...');
      
      // Clean up
      await supabase
        .from('fraud_entity_co_occurrences')
        .delete()
        .eq('entity_a_value', 'test@example.com');
    }
  } catch (err) {
    console.error('Unexpected error checking co_occurrences:', err);
  }
  
  // Test RPC function
  console.log('\n=== Testing RPC function ===');
  const { error: rpcError } = await supabase.rpc('upsert_fraud_entity' as any, {
    p_entity_type: 'email',
    p_entity_value: 'rpc-test@example.com',
    p_refund_claim: 0,
    p_chargeback: 0,
    p_flagged: 0,
    p_score: 0,
  });
  
  if (rpcError) {
    console.error('RPC function error:', rpcError.message);
  } else {
    console.log('✓ RPC function works');
    
    // Clean up
    await supabase
      .from('fraud_entities')
      .delete()
      .eq('entity_value', 'rpc-test@example.com');
  }
}

checkSchema();
