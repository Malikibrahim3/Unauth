/**
 * Side-effecting env bootstrap. MUST be the very first import in every entry
 * point (preflight.ts, runE2E.ts) — before any module that transitively imports
 * `@/lib/utils/env`, which validates `process.env` at load time.
 *
 * Responsibilities:
 *   1. Load `.env.local` (then `.env`) into process.env without overwriting
 *      anything already set in the real environment.
 *   2. Bridge the SUPABASE_URL ↔ NEXT_PUBLIC_SUPABASE_URL naming gap (the E2E
 *      spec uses SUPABASE_URL; the app reads NEXT_PUBLIC_SUPABASE_URL).
 *   3. Point the app's NEXT_PUBLIC_APP_URL at E2E_WEBHOOK_URL so that calling
 *      createMerchantGorgiasSupportConnection() directly registers the Gorgias
 *      webhook + sidebar against the deployed E2E endpoint (not localhost).
 *
 * Zero dependencies — a tiny dotenv parser, so the suite runs with only `tsx`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseDotenv(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key) continue;
    let value = line.slice(eq + 1).trim();
    // Strip surrounding single or double quotes.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadFile(relPath: string): void {
  const abs = resolve(process.cwd(), relPath);
  if (!existsSync(abs)) return;
  const parsed = parseDotenv(readFileSync(abs, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    // Real environment wins; only fill gaps.
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

// .env.local takes precedence over .env (loaded first, never overwritten).
loadFile('.env.local');
loadFile('.env');

// Bridge SUPABASE_URL ↔ NEXT_PUBLIC_SUPABASE_URL both directions.
if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL;
}

// The directly-called connection helpers register the Gorgias webhook + sidebar
// at env.NEXT_PUBLIC_APP_URL. For the E2E flow that must be the deployed webhook
// host so Scenario 1 can assert the registered integration points at it.
if (process.env.E2E_WEBHOOK_URL) {
  process.env.NEXT_PUBLIC_APP_URL = process.env.E2E_WEBHOOK_URL.replace(/\/$/, '');
}

export {};
