import { readFileSync } from 'fs';

const supabaseUrl = 'https://saeueexkqmubnveacepr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZXVlZXhrcW11Ym52ZWFjZXByIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU3MDA1OSwiZXhwIjoyMDkzMTQ2MDU5fQ.mrjxDjY8wYxcoP-mSKPL1owjl5BnwrlgzvN9k145ROk';

const migrationSQL = readFileSync('/tmp/apply_migration.sql', 'utf-8');

async function applyMigration() {
  console.log('Applying migration via Supabase REST API...');
  
  // Split SQL into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`Executing ${statements.length} SQL statements...`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`\nStatement ${i + 1}/${statements.length}:`);
    console.log(statement.substring(0, 100) + '...');
    
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          query: statement,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Statement ${i + 1} failed:`, error);
      } else {
        console.log(`Statement ${i + 1} succeeded`);
      }
    } catch (err) {
      console.error(`Statement ${i + 1} error:`, err);
    }
  }
  
  console.log('\nMigration execution complete');
}

applyMigration().catch(console.error);
