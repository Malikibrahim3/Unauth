import { readFileSync } from 'fs';
import { join } from 'path';

const migrationNumber = process.argv[2] || '0009';
const migrationPath = join(__dirname, `../supabase/migrations/${migrationNumber}_fraud_intelligence.sql`);

try {
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('==========================================');
  console.log(`DATABASE MIGRATION SQL: ${migrationNumber}_fraud_intelligence.sql`);
  console.log('==========================================');
  console.log(migrationSQL);
  console.log('==========================================');
  console.log('');
  console.log('To run this migration:');
  console.log('1. Open: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new');
  console.log('2. Copy the SQL above (everything between the === lines)');
  console.log('3. Paste it into the SQL Editor');
  console.log('4. Click "Run" to execute');
  console.log('');
  console.log('Note: The Supabase REST API does not support raw SQL execution.');
  console.log('      Running migrations manually via the SQL Editor is the standard approach.');
  console.log('==========================================');
} catch (err) {
  console.error(`Failed to read migration file: ${migrationPath}`);
  console.error('Usage: npm run migration 0009');
  process.exit(1);
}
