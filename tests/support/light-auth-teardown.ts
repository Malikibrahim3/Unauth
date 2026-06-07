import type { FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { loadEnvLocal } from './load-env-local';
import {
  cleanupLightAuthData,
  readLightAuthState,
  removeLightAuthFiles,
} from './light-auth-state';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

export default async function lightAuthTeardown(_config: FullConfig): Promise<void> {
  loadEnvLocal();
  const state = readLightAuthState();
  if (!state) {
    removeLightAuthFiles();
    return;
  }

  const supabase = createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
  );

  await cleanupLightAuthData(supabase, state);
  removeLightAuthFiles();
}
