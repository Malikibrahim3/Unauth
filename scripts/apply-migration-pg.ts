import { Client } from 'pg';
import { readFileSync } from 'fs';

const migrationSQL = readFileSync('/tmp/apply_migration.sql', 'utf-8');

const client = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.saeueexkqmubnveacepr',
  password: 'Boyo19961996!uuu',
});

async function applyMigration() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully');
    
    console.log('Executing migration...');
    await client.query(migrationSQL);
    console.log('Migration applied successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

applyMigration();
