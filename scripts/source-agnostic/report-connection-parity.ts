/**
 * Connection parity report — source-agnostic MVP+ (Phase 2 / Phase 11).
 *
 * Compares the legacy connection stores (store_connections, helpdesk_connections)
 * with the canonical merchant_integrations rows the backfill produced. Outputs a
 * per-row parity line and a summary. Merchant-scoped output only; no credentials
 * or PII are printed.
 *
 * Usage: reads Supabase URL + service role key from the environment / .env.local.
 *   npx ts-node --transpile-only scripts/source-agnostic/report-connection-parity.ts
 */
import * as fs from 'fs';
import * as path from 'path';

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = { ...process.env } as Record<string, string>;
  const p = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !out[m[1]]) out[m[1]] = m[2].trim();
    }
  }
  return out;
}

const env = loadEnv();
const URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const STORE_STATUS: Record<string, string> = { active: 'connected', revoked: 'revoked', error: 'error', disabled: 'disabled' };
const HELPDESK_STATUS: Record<string, string> = { active: 'connected', disabled: 'disabled', error: 'error', revoked: 'revoked' };

async function rest<T>(table: string, query: string): Promise<T[]> {
  const r = await fetch(`${URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: KEY as string, authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) throw new Error(`${table} read failed: ${r.status}`);
  return (await r.json()) as T[];
}

type Row = { merchant_id: string; provider_id: string; provider_account_id: string | null; status: string };

async function main() {
  if (!URL || !KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const stores = await rest<{ merchant_id: string; platform: string; store_key: string; status: string }>(
    'store_connections', 'select=merchant_id,platform,store_key,status',
  );
  const helpdesks = await rest<{ merchant_id: string; provider: string; provider_account_id: string | null; status: string }>(
    'helpdesk_connections', 'select=merchant_id,provider,provider_account_id,status',
  );
  const canonical = await rest<Row>(
    'merchant_integrations', 'select=merchant_id,provider_id,provider_account_id,status',
  );

  const canonKey = (r: { merchant_id: string; provider_id: string; provider_account_id: string | null }) =>
    `${r.merchant_id}|${r.provider_id}|${r.provider_account_id ?? ''}`;
  const canonMap = new Map(canonical.map((r) => [canonKey(r), r]));

  let matched = 0;
  const mismatches: string[] = [];
  console.log('merchant_id,provider_id,account,old_status,new_status,mismatch_reason');

  const check = (
    legacyRows: Array<{ merchant_id: string; provider_id: string; account: string | null; status: string }>,
    map: Record<string, string>,
  ) => {
    for (const row of legacyRows) {
      const expected = map[row.status] ?? 'pending';
      const canon = canonMap.get(`${row.merchant_id}|${row.provider_id}|${row.account ?? ''}`);
      const newStatus = canon?.status ?? '(missing)';
      let reason = '';
      if (!canon) reason = 'no_canonical_row';
      else if (canon.status !== expected) reason = `status_expected_${expected}`;
      if (reason) mismatches.push(`${row.merchant_id} ${row.provider_id}: ${reason}`);
      else matched += 1;
      console.log(
        [row.merchant_id, row.provider_id, row.account ?? '', row.status, newStatus, reason || 'ok'].join(','),
      );
    }
  };

  check(stores.map((s) => ({ merchant_id: s.merchant_id, provider_id: s.platform, account: s.store_key, status: s.status })), STORE_STATUS);
  check(helpdesks.map((h) => ({ merchant_id: h.merchant_id, provider_id: h.provider, account: h.provider_account_id, status: h.status })), HELPDESK_STATUS);

  console.log(`\nSummary: ${matched} matched, ${mismatches.length} mismatch(es).`);
  if (mismatches.length) {
    for (const m of mismatches) console.log(`  - ${m}`);
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
