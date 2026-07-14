/**
 * PRODUCTION WRITE (single test ticket): create one controlled inbound,
 * customer-authored Gorgias ticket so the full claim pipeline can be exercised
 * with from_agent=false and the shopper as requester.
 *
 * Creates exactly one ticket, reads it back, and prints only masked emails +
 * verification booleans. Never prints tokens, secrets, or full payloads.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json --transpile-only -r tsconfig-paths/register \
 *     scripts/create-gorgias-test-ticket.ts
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { createServiceClient } from '@/lib/supabase/server';
import { getActiveGorgiasMerchantApiAccess } from '@/lib/support/gorgias/merchantApiAccess';
import { gorgiasApiBaseUrl, gorgiasApiRequest } from '@/lib/support/gorgias/registerSidebarWidget';
import { requiredControlledAccountEnv } from '@/scripts/e2e/controlledAccountEnv';

const MERCHANT_ID = requiredControlledAccountEnv('E2E_MERCHANT_ID');
const SHOPPER_EMAIL = 'simeonmurray123@gmail.com';
const SUPPORT_INBOX = requiredControlledAccountEnv('E2E_GORGIAS_SUPPORT_INBOX');
const SUBJECT = 'Order #1008 not received';
const BODY = "Hi, I still haven't received order #1008. I'd like a refund please.";

function maskEmail(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.includes('@')) return '(none)';
  const at = raw.indexOf('@');
  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  const shownLocal = local.length <= 2 ? local[0] + '*' : local.slice(0, 2) + '***';
  return `${shownLocal}@${domain[0]}***${dot > 0 ? domain.slice(dot) : ''}`;
}
const fold = (v: unknown) => (typeof v === 'string' ? v.replace(/[‘’]/g, "'").toLowerCase() : '');

async function main() {
  const sb = createServiceClient();
  const access = await getActiveGorgiasMerchantApiAccess(sb, MERCHANT_ID);
  if (!access) { console.error('No active Gorgias API access.'); process.exit(1); }
  const apiBase = gorgiasApiBaseUrl(access.providerBaseUrl);
  const creds = { email: access.credentials.email, api_key: access.credentials.api_key };

  // Inbound customer email: sender = shopper, receiver = support inbox, from_agent=false.
  const payload = {
    channel: 'email',
    via: 'email',
    subject: SUBJECT,
    customer: { email: SHOPPER_EMAIL },
    messages: [
      {
        channel: 'email',
        via: 'email',
        from_agent: false,
        subject: SUBJECT,
        body_text: BODY,
        body_html: `<p>${BODY}</p>`,
        sender: { email: SHOPPER_EMAIL },
        receiver: { email: SUPPORT_INBOX },
        source: {
          type: 'email',
          from: { address: SHOPPER_EMAIL },
          to: [{ address: SUPPORT_INBOX }],
        },
      },
    ],
  };

  console.log('Creating one inbound customer-authored ticket…');
  console.log(`  sender (customer): ${maskEmail(SHOPPER_EMAIL)}  ->  inbox: ${maskEmail(SUPPORT_INBOX)}`);

  const created = await gorgiasApiRequest<Record<string, unknown>>(
    apiBase, '/tickets', creds, { method: 'POST', body: JSON.stringify(payload) }
  );
  const ticketId = String(created.id ?? '');
  console.log(`  created ticket id: ${ticketId}`);

  // Read back the canonical ticket.
  const ticket = await gorgiasApiRequest<Record<string, unknown>>(
    apiBase, `/tickets/${encodeURIComponent(ticketId)}`, creds, { method: 'GET' }
  );
  const requester =
    (ticket.requester as Record<string, unknown> | undefined)?.email ??
    (ticket.customer as Record<string, unknown> | undefined)?.email ?? null;
  const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
  const m0 = (messages[0] ?? {}) as Record<string, unknown>;
  const text = fold(m0.stripped_text ?? m0.body_text ?? m0.body);
  const subjectFold = fold(ticket.subject);

  console.log('\nVerification (read-back):');
  console.log(`  requester email            : ${maskEmail(requester)}  (expect shopper)`);
  console.log(`  requester == shopper       : ${typeof requester === 'string' && requester.toLowerCase() === SHOPPER_EMAIL}`);
  console.log(`  messages                   : ${messages.length}`);
  console.log(`  message[0].from_agent      : ${m0.from_agent}  (expect false)`);
  console.log(`  subject contains #1008     : ${/(?:order\s*#?\s*|#)1008\b/.test(subjectFold)}`);
  console.log(`  body contains 'not received': ${/not received/.test(text)}`);
  console.log(`  body contains 'refund'     : ${/refund/.test(text)}`);
  console.log(`  body contains \"haven't received\": ${/haven'?t received/.test(text)}`);

  console.log(`\nNext: npx ts-node ... scripts/reprocess-gorgias-ticket.ts ${ticketId}`);
}

main().catch((e) => { console.error('Fatal:', (e as Error).message); process.exit(1); });
