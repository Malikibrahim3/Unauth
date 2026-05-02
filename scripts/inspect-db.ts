import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspectDatabase() {
  console.log('=== Checking if fraud_entities table exists ===');
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
    console.log('RPC function call successful');
  }
}

inspectDatabase().catch(console.error);
