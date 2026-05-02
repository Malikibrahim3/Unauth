import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://saeueexkqmubnveacepr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZXVlZXhrcW11Ym52ZWFjZXByIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU3MDA1OSwiZXhwIjoyMDkzMTQ2MDU5fQ.mrjxDjY8wYxcoP-mSKPL1owjl5BnwrlgzvN9k145ROk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectDatabase() {
  console.log('=== Testing connection with provided credentials ===');
  
  try {
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('merchants')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('Connection test failed:', testError.message);
      return;
    }
    
    console.log('✓ Connection successful');
    
    console.log('\n=== Checking if fraud_entities table exists ===');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'fraud_entities');
    
    if (tablesError) {
      console.error('Error checking tables:', tablesError.message);
    } else {
      console.log('fraud_entities exists:', tables && tables.length > 0);
    }
    
    console.log('\n=== Checking fraud_entity_co_occurrences table ===');
    const { data: coTable, error: coError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'fraud_entity_co_occurrences');
    
    if (coError) {
      console.error('Error checking co_occurrences table:', coError.message);
    } else {
      console.log('fraud_entity_co_occurrences exists:', coTable && coTable.length > 0);
    }
    
    console.log('\n=== Checking upsert_fraud_entity function ===');
    const { data: functions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .eq('routine_name', 'upsert_fraud_entity');
    
    if (funcError) {
      console.error('Error checking function:', funcError.message);
    } else {
      console.log('upsert_fraud_entity function exists:', functions && functions.length > 0);
    }
    
    console.log('\n=== Current row counts ===');
    const { count: entityCount, error: countError } = await supabase
      .from('fraud_entities')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('fraud_entities count error:', countError.message);
    } else {
      console.log('fraud_entities row count:', entityCount);
    }
    
    const { count: coCount, error: coCountError } = await supabase
      .from('fraud_entity_co_occurrences')
      .select('*', { count: 'exact', head: true });
    
    if (coCountError) {
      console.log('fraud_entity_co_occurrences count error:', coCountError.message);
    } else {
      console.log('fraud_entity_co_occurrences row count:', coCount);
    }
    
    console.log('\n=== Testing RPC function ===');
    const { error: rpcError } = await supabase.rpc('upsert_fraud_entity' as any, {
      p_entity_type: 'email',
      p_entity_value: 'test@example.com',
      p_refund_claim: 0,
      p_chargeback: 0,
      p_flagged: 0,
      p_score: 0
    });
    
    if (rpcError) {
      console.error('RPC test error:', rpcError.message);
    } else {
      console.log('✓ RPC function call successful');
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

inspectDatabase();
