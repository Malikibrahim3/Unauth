/**
 * One-off data fix for the email_root rule change (REPORT.md blocker #3).
 * Old rule (Phase 4 worker): plus+dot-stripped local for ALL domains.
 * New rule (lib/identity/normalise.emailRoot): dots folded for Gmail only.
 *
 * Verified before running: zero old-root collisions among live emails (the
 * only shared old roots are "+alias…" locals whose root is null under both
 * rules), so the old→new hash mapping is 1:1 and an in-place UPDATE of
 * identity_signals / identity_edges / identity_members is loss-free: no
 * merges, no splits, no score changes (email_root weight is 0).
 *
 * Emits /tmp/emailroot-remap.tsv (old_hash, new_hash) for the SQL pass.
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { hashIdentifier } from '../../lib/identity/hash';
import { normaliseEmail, emailRoot } from '../../lib/identity/normalise';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

/** the retired Phase 4 rule, byte-equivalent, for computing the old hashes */
function oldEmailRoot(raw: string | null): string | null {
  const norm = normaliseEmail(raw);
  if (!norm) return null;
  const [local, domain] = norm.split('@');
  const root = local.split('+')[0].replace(/\./g, '');
  return root ? `${root}@${domain}` : null;
}

async function fetchEmails(table: string): Promise<string[]> {
  const out: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select('email').not('email', 'is', null).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data.map((r: any) => r.email as string));
    if (data.length < 1000) break;
  }
  return out;
}

async function main() {
  const emails = new Set<string>();
  for (const t of ['source_customers', 'source_orders']) {
    for (const e of await fetchEmails(t)) {
      const n = normaliseEmail(e);
      if (n) emails.add(n);
    }
  }
  const rows: string[] = [];
  for (const e of emails) {
    const oldRoot = oldEmailRoot(e);
    const newRoot = emailRoot(e);
    if (oldRoot === newRoot) continue;          // unaffected
    if (!oldRoot || !newRoot) continue;          // null-root families: no signals existed
    rows.push(`${hashIdentifier(oldRoot)}\t${hashIdentifier(newRoot)}`);
  }
  writeFileSync('/tmp/emailroot-remap.tsv', rows.join('\n'));
  console.log(`emails=${emails.size} affected=${rows.length} → /tmp/emailroot-remap.tsv`);
}
main().catch((e) => { console.error(e); process.exit(1); });
