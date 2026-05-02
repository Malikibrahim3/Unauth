import { readFileSync } from 'fs';

const projectRef = 'saeueexkqmubnveacepr';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZXVlZXhrcW11Ym52ZWFjZXByIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU3MDA1OSwiZXhwIjoyMDkzMTQ2MDU5fQ.mrjxDjY8wYxcoP-mSKPL1owjl5BnwrlgzvN9k145ROk';

const migrationSQL = readFileSync('/tmp/apply_migration.sql', 'utf-8');

async function applyMigration() {
  console.log('Applying migration via Supabase Management API...');

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: migrationSQL }),
    }
  );

  const text = await response.text();
  if (!response.ok) {
    console.error('Management API failed:', response.status, text);
    
    // Try alternative: execute SQL via pg connection string from env
    console.log('\nTrying direct SQL execution via Supabase REST...');
    const r2 = await fetch(
      `https://${projectRef}.supabase.co/rest/v1/`,
      {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'X-Client-Info': 'supabase-js/2.0.0',
        },
        body: JSON.stringify({ query: migrationSQL }),
      }
    );
    console.log('REST result:', r2.status, await r2.text());
    return;
  }

  console.log('Migration applied successfully:', text);
}

applyMigration().catch(console.error);
