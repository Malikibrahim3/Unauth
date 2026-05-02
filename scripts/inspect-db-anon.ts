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

// Try with anon key first to check if tables exist
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function inspectDatabase() {
  console.log('=== Checking if fraud_entities table exists (using anon key) ===');
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
  
  console.log('\n=== List all tables in public schema ===');
  const { data: allTables, error: allTablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');
  
  if (allTablesError) {
    console.error('Error listing tables:', allTablesError.message);
  } else {
    console.log('All tables:', allTables?.map(t => t.table_name));
  }
}

inspectDatabase().catch(console.error);
