/**
 * Test-suite resolution runner: collects the test merchants' strong signal
 * keys and hands them to the PRODUCTION engine (lib/identity/resolver.ts).
 * No local clustering/scoring — the suite now exercises the single source of
 * truth directly.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolveIdentitiesForKeys } from '../../lib/identity/resolver';
import { STRONG_IDENTIFIER_TYPES } from '../../lib/identity/observations';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const statePath = new URL('./state.json', import.meta.url);
const manifest = JSON.parse(readFileSync(statePath, 'utf8'));
const testMerchantIds: string[] = Object.values(manifest.merchants);
manifest.identityIds = manifest.identityIds ?? [];
const known = new Set<string>(manifest.identityIds);

async function main() {
  const keys = new Map<string, { type: string; hash: string }>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('identity_signals')
      .select('identifier_type, identifier_hash')
      .in('merchant_id', testMerchantIds)
      .range(from, from + 999);
    if (error) { console.error('RESOLVE FAILED:', error); process.exit(1); }
    for (const s of data) {
      if (STRONG_IDENTIFIER_TYPES.has(s.identifier_type)) {
        keys.set(`${s.identifier_type}|${s.identifier_hash}`, { type: s.identifier_type, hash: s.identifier_hash });
      }
    }
    if (data.length < 1000) break;
  }
  const summary = await resolveIdentitiesForKeys(sb, [...keys.values()], 'v2_test_suite');
  for (const id of summary.identityIds) {
    if (!known.has(id)) { known.add(id); manifest.identityIds.push(id); }
  }
  writeFileSync(statePath, JSON.stringify(manifest, null, 2));
  console.log(`RESOLVE OK: created=${summary.created} merged=${summary.merged} updated=${summary.updated} affected=${summary.identityIds.length}`);
}
main();
