import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://saeueexkqmubnveacepr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZXVlZXhrcG11Ym52ZWFjZXByIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU3MDA1OSwiZXhwIjoyMDkzMTQ2MDU5fQ.mrjxDjY8wYxcoP-mSKPL1owjl5BnwrlgzvN9k145ROk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkConstraints() {
  console.log('=== Checking co-occurrences table constraints ===');
  
  const { data, error } = await supabase.rpc('sql' as any, {
    query: `
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'fraud_entity_co_occurrences'::regclass
      ORDER BY conname;
    `
  });
  
  if (error) {
    console.error('Error checking constraints:', error.message);
  } else {
    console.log('Constraints:', data);
  }
}

checkConstraints();
