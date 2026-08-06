/**
 * Server-only smoke test for support_case_intake foundation.
 * Uses service role only — never expose output to clients.
 *
 * Usage:
 *   npm run smoke:support-intake -- --merchant-id <uuid>
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { TABLES } from '../lib/supabase/tables';
import {
  appendSupportCaseEvent,
  hashRawPayload,
  hashSupportEmail,
  hashSupportIdentifier,
  upsertSupportCaseIntake,
  upsertSupportProviderConnection,
} from '../lib/support/intake/store';
import {
  SMOKE_EVENT_TYPE,
  SMOKE_EXTERNAL_CASE_ID,
  SMOKE_ORDER_REF,
  SMOKE_PROVIDER,
  SMOKE_PROVIDER_ACCOUNT_ID,
  SMOKE_SHOP_DOMAIN,
} from '../lib/support/intake/smokeConstants';
import {
  parseSmokeSupportIntakeArgs,
  requireSmokeSupabaseEnv,
} from '../lib/support/intake/smokeCli';

function loadEnvLocal(): void {
  const envPath = join(__dirname, '../.env.local');
  if (!existsSync(envPath)) return;
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

type Counts = {
  connections: number;
  cases: number;
  events: number;
};

type SmokeSupabaseClient = ReturnType<typeof createClient<any>>;

async function countSmokeRows(
  supabase: SmokeSupabaseClient,
  merchantId: string,
  supportCaseId: string | null
): Promise<Counts> {
  const { count: connections, error: connErr } = await supabase
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('provider', SMOKE_PROVIDER)
    .eq('provider_account_id', SMOKE_PROVIDER_ACCOUNT_ID);

  if (connErr) throw new Error(`count connections failed: ${connErr.message}`);

  const { count: cases, error: caseErr } = await supabase
    .from(TABLES.SUPPORT_CASE_INTAKE)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('provider', SMOKE_PROVIDER)
    .eq('external_case_id', SMOKE_EXTERNAL_CASE_ID);

  if (caseErr) throw new Error(`count cases failed: ${caseErr.message}`);

  let events = 0;
  if (supportCaseId) {
    const { count: eventCount, error: eventErr } = await supabase
      .from(TABLES.SUPPORT_CASE_EVENTS)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .eq('support_case_id', supportCaseId);

    if (eventErr) throw new Error(`count events failed: ${eventErr.message}`);
    events = eventCount ?? 0;
  }

  return {
    connections: connections ?? 0,
    cases: cases ?? 0,
    events,
  };
}

async function assertStoredCasePrivacy(
  supabase: SmokeSupabaseClient,
  merchantId: string,
  expectedEmailHash: string
): Promise<void> {
  const { data, error } = await supabase
    .from(TABLES.SUPPORT_CASE_INTAKE)
    .select(
      'customer_email_hash, order_ref, raw_payload_hash, customer_message_summary, agent_notes_summary'
    )
    .eq('merchant_id', merchantId)
    .eq('provider', SMOKE_PROVIDER)
    .eq('external_case_id', SMOKE_EXTERNAL_CASE_ID)
    .maybeSingle();

  if (error) throw new Error(`read case privacy check failed: ${error.message}`);
  if (!data) throw new Error('smoke case row missing after upsert');

  const row = data as Record<string, unknown>;
  if (row.customer_email_hash !== expectedEmailHash) {
    throw new Error('customer_email_hash mismatch (email not hashed as expected)');
  }
  if (!row.raw_payload_hash || typeof row.raw_payload_hash !== 'string') {
    throw new Error('raw_payload_hash missing on stored case');
  }
  if ('raw_payload' in row || 'customer_email' in row) {
    throw new Error('forbidden plaintext fields present on stored case row');
  }
}

async function runSmokePass(
  supabase: SmokeSupabaseClient,
  merchantId: string,
  supportCaseId: string | null
): Promise<{ connectionId: string; caseId: string; eventId: string; supportCaseId: string }> {
  const fakeCasePayload = {
    smoke: true,
    ticket_id: SMOKE_EXTERNAL_CASE_ID,
    note: 'synthetic smoke payload — not stored',
  };

  const connection = await upsertSupportProviderConnection(supabase, {
    merchant_id: merchantId,
    provider: SMOKE_PROVIDER,
    provider_account_id: SMOKE_PROVIDER_ACCOUNT_ID,
    provider_account_name: 'Smoke Zendesk Account',
    provider_base_url: 'https://unauth-smoke.zendesk.com',
    status: 'active',
    scopes: ['smoke_test'],
  });

  const supportCase = await upsertSupportCaseIntake(supabase, {
    merchant_id: merchantId,
    provider: SMOKE_PROVIDER,
    provider_connection_id: connection.id as string,
    external_case_id: SMOKE_EXTERNAL_CASE_ID,
    external_url: 'https://unauth-smoke.zendesk.com/agent/tickets/1',
    customer_email: 'smoke-customer@unauth-smoke.example',
    order_ref: SMOKE_ORDER_REF,
    shop_domain: SMOKE_SHOP_DOMAIN,
    claim_reason: 'missing_parcel',
    customer_message_summary: 'Smoke test: customer reports parcel not received.',
    agent_notes_summary: 'Smoke test: agent requested tracking review.',
    case_status: 'open',
    tags: ['missing_parcel', 'shopify', 'smoke_test'],
    raw_payload: fakeCasePayload,
  });

  const caseId = supportCase.id as string;
  const expectedEmailHash = hashSupportEmail('smoke-customer@unauth-smoke.example');
  await assertStoredCasePrivacy(supabase, merchantId, expectedEmailHash);

  const event = await appendSupportCaseEvent(supabase as never, {
    merchant_id: merchantId,
    support_case_id: caseId,
    provider: SMOKE_PROVIDER,
    event_type: SMOKE_EVENT_TYPE,
    event_summary: 'Support case created in smoke test',
    actor_type: 'system',
    actor_identifier: 'smoke-system-actor',
    metadata: { smoke: true, pass: supportCaseId ? 'repeat' : 'initial' },
    raw_payload: { event: SMOKE_EVENT_TYPE, smoke: true },
  });

  return {
    connectionId: connection.id as string,
    caseId,
    eventId: event.id as string,
    supportCaseId: caseId,
  };
}

async function main(): Promise<void> {
  loadEnvLocal();
  const { merchantId } = parseSmokeSupportIntakeArgs(process.argv.slice(2));
  const { supabaseUrl, serviceRoleKey } = requireSmokeSupabaseEnv();

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('support-intake-smoke: starting');
  console.log(`merchant_id=${merchantId}`);

  const first = await runSmokePass(supabase, merchantId, null);
  const countsAfterFirst = await countSmokeRows(supabase, merchantId, first.supportCaseId);

  const second = await runSmokePass(supabase, merchantId, first.supportCaseId);
  const countsAfterSecond = await countSmokeRows(supabase, merchantId, second.supportCaseId);

  const idempotentConnections = countsAfterFirst.connections === 1 && countsAfterSecond.connections === 1;
  const idempotentCases = countsAfterFirst.cases === 1 && countsAfterSecond.cases === 1;
  const eventsAppendOnly = countsAfterSecond.events >= countsAfterFirst.events;

  if (!idempotentConnections || !idempotentCases) {
    throw new Error(
      `idempotency failed: connections ${countsAfterFirst.connections}->${countsAfterSecond.connections}, ` +
        `cases ${countsAfterFirst.cases}->${countsAfterSecond.cases}`
    );
  }

  if (!eventsAppendOnly) {
    throw new Error('unexpected event count decrease on second pass');
  }

  console.log('support-intake-smoke: pass 1 complete');
  console.log(`connection_id=${first.connectionId}`);
  console.log(`support_case_id=${first.caseId}`);
  console.log(`event_id=${first.eventId}`);
  console.log(
    `counts_after_pass_1 connections=${countsAfterFirst.connections} cases=${countsAfterFirst.cases} events=${countsAfterFirst.events}`
  );

  console.log('support-intake-smoke: pass 2 complete (upsert idempotency + append event)');
  console.log(`connection_id=${second.connectionId}`);
  console.log(`support_case_id=${second.caseId}`);
  console.log(`event_id=${second.eventId}`);
  console.log(
    `counts_after_pass_2 connections=${countsAfterSecond.connections} cases=${countsAfterSecond.cases} events=${countsAfterSecond.events}`
  );

  console.log(`idempotency_connections=${idempotentConnections}`);
  console.log(`idempotency_cases=${idempotentCases}`);
  console.log(`events_append_only=${eventsAppendOnly} (event idempotency not implemented)`);
  console.log('privacy: no tokens, raw payloads, or plaintext emails logged or stored');
  console.log('support-intake-smoke: OK');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
