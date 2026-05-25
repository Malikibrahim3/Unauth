import { createClient } from '@supabase/supabase-js';
import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import path from 'path';
loadEnvConfig(path.resolve('/Users/malikibrahim/Downloads/Unauth'));

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ELARA_USER_ID = 'c1361d17-0797-459e-baa9-234936b2976d';
const { data } = await sb.auth.admin.getUserById(ELARA_USER_ID);
console.log('Elara owner:', {
  email: data?.user?.email,
  created: data?.user?.created_at,
  metadata: data?.user?.user_metadata,
});
