import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const m = JSON.parse(readFileSync('scripts/v2-tests/state.json', 'utf8'));
async function main() {
  for (const [email, id] of Object.entries(m.users as Record<string, string>)) {
    const { error } = await sb.auth.admin.deleteUser(id as string);
    console.log(email, error ? `ERROR ${error.message}` : 'deleted');
  }
}
main();
