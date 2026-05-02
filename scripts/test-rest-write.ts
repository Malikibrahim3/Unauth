import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://saeueexkqmubnveacepr.supabase.co/rest/v1/';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZXVlZXhrcG11Ym52ZWFjZXByIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU3MDA1OSwiZXhwIjoyMDkzMTQ2MDU5fQ.mrjxDjY8wYxcoP-mSKPL1owjl5BnwrlgzvN9k145ROk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testWrite() {
  console.log('=== Testing write with rest/v1/ URL ===');
  
  // Test direct insert
  const { error: insertError } = await supabase
    .from('fraud_entities')
    .insert({
      entity_type: 'email',
      entity_value: 'rest-url-test@example.com',
      total_orders: 1,
      total_refund_claims: 0,
      total_chargebacks: 0,
      total_merchants: 1,
      fraud_score_avg: 0,
      flagged_count: 0,
    });
  
  if (insertError) {
    console.error('Insert failed:', insertError.message);
    console.error('Details:', insertError);
  } else {
    console.log('✓ Insert successful');
    
    // Clean up
    await supabase
      .from('fraud_entities')
      .delete()
      .eq('entity_value', 'rest-url-test@example.com');
  }
}

testWrite();
