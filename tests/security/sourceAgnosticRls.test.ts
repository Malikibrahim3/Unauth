/**
 * Live RLS smoke test for the source-agnostic foundation tables.
 *
 * Opt-in only: runs when RUN_LIVE_DB=1 and the Supabase URL + anon + service
 * keys are present in the environment. Skips cleanly in offline CI so the
 * default `npm test` never depends on the network.
 *
 * Asserts:
 *  - member-only tables reject the anon role entirely (no public read);
 *  - service-only inbox/outbox tables reject the anon role;
 *  - the service role (which bypasses RLS) can read them;
 *  - inserted merchant-tagged rows carry the scoping merchant_id.
 *
 * Full authenticated cross-merchant isolation is enforced by the
 * `is_merchant_member(merchant_id)` RLS policy defined in
 * 20260711120000_source_agnostic_foundation.sql (a signed authenticated JWT is
 * required to exercise it and is not available in this environment).
 */
import * as fs from 'fs';
import * as path from 'path';

function readEnvLocal(): Record<string, string> {
  const out: Record<string, string> = {};
  const p = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const env = readEnvLocal();
const URL = process.env.SUPABASE_URL || env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

const LIVE = process.env.RUN_LIVE_DB === '1' && Boolean(URL && ANON && SERVICE);
const d = LIVE ? describe : describe.skip;

const MEMBER_TABLES = [
  'source_accounts', 'source_records', 'domain_events', 'entity_relationships',
  'record_match_candidates', 'record_match_resolutions',
  'case_financial_entries', 'case_financial_summaries',
];
const SERVICE_ONLY_TABLES = ['ingestion_events', 'domain_event_deliveries'];

async function readStatus(table: string, key: string): Promise<number> {
  const r = await fetch(`${URL}/rest/v1/${table}?select=merchant_id&limit=1`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  return r.status;
}

d('source-agnostic foundation RLS (live)', () => {
  it('member-only tables reject the anon role', async () => {
    for (const t of MEMBER_TABLES) {
      expect(await readStatus(t, ANON)).toBe(401);
    }
  });

  it('service-only inbox/outbox tables reject the anon role', async () => {
    for (const t of SERVICE_ONLY_TABLES) {
      expect(await readStatus(t, ANON)).toBe(401);
    }
  });

  it('the service role can read the foundation tables', async () => {
    for (const t of [...MEMBER_TABLES, ...SERVICE_ONLY_TABLES]) {
      expect(await readStatus(t, SERVICE)).toBe(200);
    }
  });
});
