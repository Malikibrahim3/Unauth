/** Phase 6 financial parity report. Outputs counts only; no PII or case IDs. */
import * as fs from 'fs';
import * as path from 'path';

function loadEnv(): Record<string, string> {
  const values: Record<string, string> = { ...process.env } as Record<string, string>;
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return values;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !values[match[1]]) values[match[1]] = match[2].trim();
  }
  return values;
}

const config = loadEnv();
const url = config.SUPABASE_URL || config.NEXT_PUBLIC_SUPABASE_URL;
const key = config.SUPABASE_SERVICE_ROLE_KEY;

async function allRows<T>(table: string, select: string): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 1000) {
    const response = await fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(select)}`, {
      headers: { apikey: key, authorization: `Bearer ${key}`, Range: `${start}-${start + 999}` },
    });
    if (!response.ok) throw new Error(`${table} read failed: ${response.status}`);
    const page = await response.json() as T[];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

const states = ['requested', 'exposed', 'approved', 'paid', 'estimated_loss', 'confirmed_loss', 'recoverable', 'recovered', 'prevented', 'written_off'] as const;
type State = typeof states[number];
type Entry = { merchant_id: string; support_payout_case_id: string | null; currency: string; state: State; amount_minor: number; reverses_entry_id: string | null; metadata: Record<string, unknown> };
type Summary = { merchant_id: string; support_payout_case_id: string; currency: string } & Record<`${State}_minor`, number>;

async function main() {
  if (!url || !key) throw new Error('Missing Supabase URL or service role key');
  const [entries, summaries] = await Promise.all([
    allRows<Entry>('case_financial_entries', 'merchant_id,support_payout_case_id,currency,state,amount_minor,reverses_entry_id,metadata'),
    allRows<Summary>('case_financial_summaries', `merchant_id,support_payout_case_id,currency,${states.map((state) => `${state}_minor`).join(',')}`),
  ]);

  const totals = new Map<string, Record<State, number>>();
  const migrationKeys = new Set<string>();
  let duplicateMigrationKeys = 0;
  for (const entry of entries) {
    if (!entry.support_payout_case_id) continue;
    const mapKey = `${entry.merchant_id}|${entry.support_payout_case_id}|${entry.currency.toUpperCase()}`;
    const current = totals.get(mapKey) ?? Object.fromEntries(states.map((state) => [state, 0])) as Record<State, number>;
    current[entry.state] += (entry.reverses_entry_id ? -1 : 1) * entry.amount_minor;
    totals.set(mapKey, current);
    const migrationKey = typeof entry.metadata?.migration_key === 'string' ? entry.metadata.migration_key : null;
    if (migrationKey) {
      const scoped = `${entry.merchant_id}|${migrationKey}`;
      if (migrationKeys.has(scoped)) duplicateMigrationKeys += 1;
      migrationKeys.add(scoped);
    }
  }

  const mismatchesByMerchant = new Map<string, number>();
  for (const summary of summaries) {
    const mapKey = `${summary.merchant_id}|${summary.support_payout_case_id}|${summary.currency.toUpperCase()}`;
    const projected = totals.get(mapKey);
    const mismatch = !projected || states.some((state) => Number(summary[`${state}_minor`]) !== projected[state]);
    if (mismatch) mismatchesByMerchant.set(summary.merchant_id, (mismatchesByMerchant.get(summary.merchant_id) ?? 0) + 1);
    totals.delete(mapKey);
  }

  const orphanedEntryGroups = totals.size;
  const mismatchCount = [...mismatchesByMerchant.values()].reduce((sum, count) => sum + count, 0);
  console.log('merchant_id,summary_mismatches');
  for (const [merchantId, count] of [...mismatchesByMerchant].sort()) console.log(`${merchantId},${count}`);
  console.log(`Summary: entries=${entries.length} summaries=${summaries.length} mismatches=${mismatchCount} orphaned_entry_groups=${orphanedEntryGroups} duplicate_migration_keys=${duplicateMigrationKeys}`);
  if (mismatchCount || orphanedEntryGroups || duplicateMigrationKeys) process.exit(2);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
