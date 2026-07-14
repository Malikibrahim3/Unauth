/**
 * READ-ONLY structural probe for one Gorgias ticket. Prints ONLY shape:
 * top-level key names, presence/length of text fields, message-object key names,
 * and which body-ish fields are non-empty (booleans). NEVER prints field values,
 * message text, emails, payloads, tokens, or secrets.
 *
 * Goal: determine why normalizeGorgiasTicket does not see claim text in the live
 * API ticket (which message-body key actually carries the customer text).
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { createServiceClient } from '@/lib/supabase/server';
import { getActiveGorgiasMerchantApiAccess } from '@/lib/support/gorgias/merchantApiAccess';
import { fetchGorgiasTicketById } from '@/lib/support/gorgias/fetchTicket';
import { requiredControlledAccountEnv } from '@/scripts/e2e/controlledAccountEnv';

const MERCHANT_ID = requiredControlledAccountEnv('E2E_MERCHANT_ID');
const TICKET_ID = process.argv[2]?.trim() || '63091193';

const len = (v: unknown) => (typeof v === 'string' ? v.length : v == null ? 'null' : typeof v);
const nonEmptyStr = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

async function main() {
  const sb = createServiceClient();
  const access = await getActiveGorgiasMerchantApiAccess(sb, MERCHANT_ID);
  if (!access) { console.error('No Gorgias API access'); process.exit(1); }

  const ticket = await fetchGorgiasTicketById({
    providerBaseUrl: access.providerBaseUrl,
    credentials: access.credentials,
    ticketId: TICKET_ID,
  }) as Record<string, unknown>;

  console.log('Top-level keys:', Object.keys(ticket).sort().join(', '));
  console.log('subject length:', len(ticket.subject));

  const messages = Array.isArray(ticket.messages) ? ticket.messages : null;
  console.log('messages: ', messages ? `array(${messages.length})` : typeof ticket.messages);

  if (messages && messages.length) {
    messages.slice(0, 3).forEach((m, i) => {
      const row = (m && typeof m === 'object') ? m as Record<string, unknown> : {};
      const src = (row.source && typeof row.source === 'object') ? row.source as Record<string, unknown> : null;
      console.log(`\n message[${i}] keys: ${Object.keys(row).sort().join(', ')}`);
      console.log(`   from_agent=${row.from_agent} sender_type=${typeof row.sender_type === 'string' ? row.sender_type : 'n/a'} source.type=${src && typeof src.type === 'string' ? src.type : 'n/a'}`);
      console.log('   non-empty body-ish fields:',
        ['body', 'stripped_text', 'body_text', 'body_html', 'text', 'snippet']
          .filter((k) => nonEmptyStr(row[k]))
          .join(', ') || '(none)');
    });
  }

  // Which extractor inputs would be populated?
  console.log('\nClassifier input availability:');
  console.log('  subject non-empty:', nonEmptyStr(ticket.subject));
  console.log('  has integrations block:', ticket.integrations != null);
  console.log('  has meta block:', ticket.meta != null);

  // SAFE content signal: per message, role + whether the body matches claim/INR
  // markers and the subject too. Prints ONLY booleans, never any body text.
  const CLAIM = /\b(refund|claim|chargeback|dispute|reimburs|money back|not received|never (received|arrived)|hasn'?t|haven'?t|missing (package|parcel)|not delivered|where(?:'?s| is)|return|cancel)\b/i;
  const fold = (s: unknown) => (typeof s === 'string' ? s.replace(/[‘’]/g, "'").toLowerCase() : '');
  console.log('\nClaim-marker presence (booleans only, no text):');
  console.log('  subject matches claim markers:', CLAIM.test(fold(ticket.subject)));
  if (messages) {
    let anyCustomerClaim = false;
    let anyMsgClaim = false;
    messages.forEach((m, i) => {
      const row = (m && typeof m === 'object') ? m as Record<string, unknown> : {};
      const text = fold(row.stripped_text ?? row.body_text ?? row.body);
      const hit = CLAIM.test(text);
      if (hit) {
        anyMsgClaim = true;
        if (row.from_agent !== true) anyCustomerClaim = true;
        console.log(`  message[${i}] from_agent=${row.from_agent} CLAIM_MARKER=true len=${text.length}`);
      }
    });
    console.log('  ANY message matches claim markers:', anyMsgClaim);
    console.log('  ANY non-agent message matches claim markers:', anyCustomerClaim);
    const customerCount = messages.filter((m) => (m as Record<string, unknown>)?.from_agent !== true).length;
    console.log('  customer (non-agent) message count:', customerCount, 'of', messages.length);
  }
}

main().catch((e) => { console.error('Fatal:', (e as Error).message); process.exit(1); });
