import { readFileSync } from 'fs';

const supabaseUrl = 'https://saeueexkqmubnveacepr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZXVlZXhrcW11Ym52ZWFjZXByIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU3MDA1OSwiZXhwIjoyMDkzMTQ2MDU5fQ.mrjxDjY8wYxcoP-mSKPL1owjl5BnwrlgzvN9k145ROk';

const migrationSQL = readFileSync('/tmp/apply_migration.sql', 'utf-8');

async function applyMigration() {
  console.log('Applying migration via REST API...');
  
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ sql: migrationSQL }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Migration failed:', error);
    throw new Error(`Migration failed: ${error}`);
  }

  const result = await response.json();
  console.log('Migration applied successfully:', result);
}

applyMigration().catch(console.error);
