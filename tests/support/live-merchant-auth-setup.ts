import type { FullConfig } from '@playwright/test';
import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { TABLES } from '../../lib/supabase/tables';

const AUTH_DIR = path.join(__dirname, '.auth');
const STORAGE_PATH = path.join(AUTH_DIR, 'live-merchant.json');

type StoredCookie = {
  name: string;
  value: string;
  options?: {
    maxAge?: number;
    path?: string;
    domain?: string;
    sameSite?: string;
    secure?: boolean;
  };
};

function loadEnvLocal(): void {
  const envPath = path.join(__dirname, '../../.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

export default async function liveMerchantAuthSetup(_config: FullConfig): Promise<void> {
  loadEnvLocal();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const liveMerchantId = process.env.E2E_MERCHANT_ID?.trim();
  const liveMerchantEmail = process.env.E2E_MERCHANT_EMAIL?.trim();
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !liveMerchantId || !liveMerchantEmail) {
    throw new Error('Supabase public configuration, E2E_MERCHANT_ID, and E2E_MERCHANT_EMAIL are required');
  }

  const admin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  if (process.env.WALKTHROUGH_RESET_GORGIAS === '1') {
    await admin
      .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
      .delete()
      .eq('merchant_id', liveMerchantId)
      .eq('provider', 'gorgias');
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: liveMerchantEmail,
  });

  if (linkError || !link.properties?.hashed_token) {
    throw new Error(`Magic link failed: ${linkError?.message ?? 'no hashed_token'}`);
  }

  const anon = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  const { data: verified, error: verifyError } = await anon.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.properties.hashed_token,
  });

  if (verifyError || !verified.session) {
    throw new Error(`verifyOtp failed: ${verifyError?.message ?? 'no session'}`);
  }

  const stored: StoredCookie[] = [];
  const browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: async () => stored.map((c) => ({ name: c.name, value: c.value })),
      setAll: async (cookies) => {
        stored.length = 0;
        for (const cookie of cookies) {
          stored.push({
            name: cookie.name,
            value: cookie.value,
            options: cookie.options,
          });
        }
      },
    },
  });

  const { error: sessionError } = await browserClient.auth.setSession({
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  });

  if (sessionError) {
    throw new Error(`setSession failed: ${sessionError.message}`);
  }

  if (stored.length === 0) {
    throw new Error('No auth cookies captured after setSession');
  }

  const expires = Math.floor(Date.now() / 1000) + 60 * 60;
  const storageState = {
    cookies: stored.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: 'localhost',
      path: cookie.options?.path ?? '/',
      expires,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    })),
    origins: [],
  };

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(STORAGE_PATH, JSON.stringify(storageState, null, 2));
}
