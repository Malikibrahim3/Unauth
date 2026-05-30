/**
 * READ-ONLY Gorgias ticket search to locate the real INR/refund claim ticket.
 *
 * Lists recent tickets (last 24h by default) and, per ticket, prints ONLY:
 * id, masked requester email, truncated subject, message count, and a set of
 * content booleans. NEVER prints raw emails, full subjects beyond a short
 * truncation, message bodies, payloads, tokens, or secrets. Mutates nothing.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json --transpile-only -r tsconfig-paths/register \
 *     scripts/find-gorgias-claim-ticket.ts
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { createServiceClient } from '@/lib/supabase/server';
import { getActiveGorgiasMerchantApiAccess } from '@/lib/support/gorgias/merchantApiAccess';
import { gorgiasApiBaseUrl, gorgiasApiRequest } from '@/lib/support/gorgias/registerSidebarWidget';

const MERCHANT_ID = 'af070af9-df1a-46ba-89f8-29409926ef61';
const WINDOW_HOURS = 24;
const LIST_LIMIT = 30;

// Patterns (apostrophe-folded, lowercased) — matches the production classifier intent.
const ORDER_1008 = /(?:order\s*#?\s*|#)1008\b/i;
const NOT_RECEIVED = /\b(not received|never (received|arrived)|hasn'?t (arrived|received)|haven'?t (received|arrived))\b/i;
const REFUND = /\brefund\b/i;
const CLAIM = /\b(refund|claim|chargeback|dispute|reimburs|money back|not received|never (received|arrived)|hasn'?t|haven'?t|missing (package|parcel)|not delivered|where(?:'?s| is))\b/i;

const fold = (v: unknown) => (typeof v === 'string' ? v.replace(/[‘’]/g, "'").toLowerCase() : '');

function maskEmail(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.includes('@')) return '(none)';
  const at = raw.indexOf('@');
  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  const shownLocal = local.length <= 2 ? local[0] + '*' : local.slice(0, 2) + '***';
  const dot = domain.lastIndexOf('.');
  return `${shownLocal}@${domain[0]}***${dot > 0 ? domain.slice(dot) : ''}`;
}

function truncSubject(raw: unknown): string {
  const s = typeof raw === 'string' ? raw : '';
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}

function bodyText(m: unknown): string {
  const row = (m && typeof m === 'object') ? m as Record<string, unknown> : {};
  return fold(row.stripped_text ?? row.body_text ?? row.body);
}
const isAgent = (m: unknown) => (m as Record<string, unknown>)?.from_agent === true;

async function main() {
  const sb = createServiceClient();
  const access = await getActiveGorgiasMerchantApiAccess(sb, MERCHANT_ID);
  if (!access) { console.error('No active Gorgias API access for merchant.'); process.exit(1); }
  const apiBase = gorgiasApiBaseUrl(access.providerBaseUrl);
  const creds = { email: access.credentials.email, api_key: access.credentials.api_key };

  const list = await gorgiasApiRequest<{ data?: Array<Record<string, unknown>> }>(
    apiBase,
    `/tickets?order_by=${encodeURIComponent('created_datetime:desc')}&limit=${LIST_LIMIT}`,
    creds,
    { method: 'GET' }
  );
  const tickets = list.data ?? [];

  const cutoffMs = Date.now() - WINDOW_HOURS * 3600 * 1000;
  const inWindow = tickets.filter((t) => {
    const created = typeof t.created_datetime === 'string' ? Date.parse(t.created_datetime) : NaN;
    return Number.isNaN(created) ? true : created >= cutoffMs;
  });

  console.log(`Scanning ${inWindow.length} ticket(s) from the last ${WINDOW_HOURS}h (of ${tickets.length} listed)\n`);

  type Scored = { id: string; score: number; line: string };
  const scored: Scored[] = [];

  for (const t of inWindow) {
    const id = String(t.id ?? '');
    // Fetch the full ticket so message bodies are present.
    let full: Record<string, unknown> = t;
    try {
      full = await gorgiasApiRequest<Record<string, unknown>>(apiBase, `/tickets/${encodeURIComponent(id)}`, creds, { method: 'GET' });
    } catch { /* fall back to list row */ }

    const subject = full.subject;
    const subjectFold = fold(subject);
    const messages = Array.isArray(full.messages) ? full.messages : [];
    const requesterEmail =
      (full.requester as Record<string, unknown> | undefined)?.email ??
      (full.customer as Record<string, unknown> | undefined)?.email ?? null;

    const subjectContainsOrder1008 = ORDER_1008.test(subjectFold);
    const anyMessageContainsOrder1008 = messages.some((m) => ORDER_1008.test(bodyText(m)));
    const anyMessageContainsNotReceived = messages.some((m) => NOT_RECEIVED.test(bodyText(m)));
    const anyMessageContainsRefund = messages.some((m) => REFUND.test(bodyText(m)));
    const anyNonAgentMessageContainsClaim = messages.some((m) => !isAgent(m) && CLAIM.test(bodyText(m)));
    const nonAgentMessageCount = messages.filter((m) => !isAgent(m)).length;
    const agentMessageCount = messages.filter((m) => isAgent(m)).length;

    const score =
      (subjectContainsOrder1008 ? 2 : 0) +
      (anyMessageContainsOrder1008 ? 2 : 0) +
      (anyMessageContainsNotReceived ? 2 : 0) +
      (anyMessageContainsRefund ? 1 : 0) +
      (anyNonAgentMessageContainsClaim ? 3 : 0);

    const line = [
      `ticket ${id}  score=${score}`,
      `  requester      : ${maskEmail(requesterEmail)}`,
      `  subject        : "${truncSubject(subject)}"`,
      `  messages       : ${messages.length} (nonAgent=${nonAgentMessageCount}, agent=${agentMessageCount})`,
      `  subjectOrder1008=${subjectContainsOrder1008} msgOrder1008=${anyMessageContainsOrder1008} notReceived=${anyMessageContainsNotReceived} refund=${anyMessageContainsRefund} nonAgentClaim=${anyNonAgentMessageContainsClaim}`,
    ].join('\n');

    scored.push({ id, score, line });
  }

  for (const s of scored.sort((a, b) => b.score - a.score)) console.log(s.line + '\n');

  const best = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score)[0];
  console.log('────────────────────────────────────────────');
  if (best) {
    console.log(`Most likely claim ticket: ${best.id} (score ${best.score})`);
  } else {
    console.log('No ticket in the window contains claim language. Widen WINDOW_HOURS/LIST_LIMIT or check the store.');
  }
  console.log('No mutations performed.');
}

main().catch((e) => { console.error('Fatal:', (e as Error).message); process.exit(1); });
