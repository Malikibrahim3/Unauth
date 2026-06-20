import {
  appendSupportCaseEvent,
  extractOrderRefFromText,
  hashSupportEmail,
  hashRawPayload,
  normalizeProviderName,
  toPublicSupportProviderConnection,
  upsertSupportCaseIntake,
  upsertSupportProviderConnection,
} from '@/lib/support/intake/store';
import type { SupportProviderConnectionRow } from '@/lib/support/providers/types';

function makeUpsertSupabase() {
  const calls: Array<{ table: string; payload: Record<string, unknown>; onConflict: string }> = [];
  const supabase = {
    from: (table: string) => ({
      upsert: (payload: Record<string, unknown>, opts: { onConflict: string }) => ({
        select: () => ({
          single: async () => {
            calls.push({ table, payload, onConflict: opts.onConflict });
            return { data: payload, error: null };
          },
        }),
      }),
    }),
  };
  return { supabase, calls };
}

function makeCompatSqlFallbackUpsertSupabase() {
  const calls: Array<{ table: string; payload: Record<string, unknown>; onConflict: string }> = [];
  let attempt = 0;
  const supabase = {
    from: (table: string) => ({
      upsert: (payload: Record<string, unknown>, opts: { onConflict: string }) => ({
        select: () => ({
          single: async () => {
            attempt += 1;
            calls.push({ table, payload, onConflict: opts.onConflict });
            if (attempt === 1) {
              return {
                data: null,
                error: {
                  message: 'column support_case_intake.keyword_matched does not exist',
                },
              };
            }
            return { data: payload, error: null };
          },
        }),
      }),
    }),
  };
  return { supabase, calls };
}

function makeInsertSupabase() {
  const inserts: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const supabase = {
    from: (table: string) => ({
      insert: (payload: Record<string, unknown>) => ({
        select: () => ({
          single: async () => {
            inserts.push({ table, payload });
            return { data: { id: 'evt-1', ...payload }, error: null };
          },
        }),
      }),
    }),
  };
  return { supabase, inserts };
}

describe('support intake store', () => {
  const merchantA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const merchantB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const caseId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  it('support case upsert is idempotent by merchant_id + provider + external_case_id', async () => {
    const { supabase, calls } = makeUpsertSupabase();
    const input = {
      merchant_id: merchantA,
      provider: 'zendesk' as const,
      external_case_id: 'ZD-9001',
      raw_payload: { ticket: { id: 9001, body: 'secret' } },
    };

    await upsertSupportCaseIntake(supabase, input);
    await upsertSupportCaseIntake(supabase, input);

    expect(calls).toHaveLength(2);
    expect(calls[0].onConflict).toBe('merchant_id,provider,external_id');
    expect(calls[1].onConflict).toBe('merchant_id,provider,external_id');
    expect(calls[0].payload.external_id).toBe('ZD-9001');
    expect(calls[1].payload.external_id).toBe('ZD-9001');
  });

  it('different merchants can share the same external_case_id', async () => {
    const { supabase, calls } = makeUpsertSupabase();
    await upsertSupportCaseIntake(supabase, {
      merchant_id: merchantA,
      provider: 'gorgias',
      external_case_id: 'SHARED-1',
      raw_payload: { id: 1 },
    });
    await upsertSupportCaseIntake(supabase, {
      merchant_id: merchantB,
      provider: 'gorgias',
      external_case_id: 'SHARED-1',
      raw_payload: { id: 2 },
    });

    expect(calls[0].payload.merchant_id).toBe(merchantA);
    expect(calls[1].payload.merchant_id).toBe(merchantB);
    expect(calls[0].payload.external_id).toBe('SHARED-1');
    expect(calls[1].payload.external_id).toBe('SHARED-1');
  });

  it('provider enum rejects invalid provider', async () => {
    const { supabase } = makeUpsertSupabase();
    await expect(
      upsertSupportCaseIntake(supabase, {
        merchant_id: merchantA,
        provider: 'deskforce' as 'zendesk',
        external_case_id: 'X-1',
      })
    ).rejects.toThrow();
    expect(() => normalizeProviderName('not-a-provider')).toThrow();
  });

  it('appends support case events without upsert', async () => {
    const { supabase, inserts } = makeInsertSupabase();
    await appendSupportCaseEvent(supabase, {
      merchant_id: merchantA,
      support_case_id: caseId,
      provider: 'intercom',
      event_type: 'status_changed',
      event_summary: 'Ticket marked solved',
      actor_identifier: 'agent-42@example.com',
      raw_payload: { change: 'solved' },
    });

    expect(inserts).toHaveLength(1);
    expect(inserts[0].table).toBe('source_ticket_events');
    expect(inserts[0].payload.event_type).toBe('status_changed');
    expect(inserts[0].payload.actor_identifier).toBeUndefined();
    expect((inserts[0].payload.metadata as Record<string, unknown>).actor_identifier_hash).toMatch(
      /^[a-f0-9]{64}$/,
    );
  });

  it('does not store raw payload on case intake', async () => {
    const { supabase, calls } = makeUpsertSupabase();
    await upsertSupportCaseIntake(supabase, {
      merchant_id: merchantA,
      provider: 'freshdesk',
      external_case_id: 'FD-22',
      raw_payload: { conversation: ['full', 'thread'] },
      customer_message_summary: 'Where is my order?',
    });

    const payload = calls[0].payload;
    expect(payload.raw_payload).toBeUndefined();
    expect(payload.rawPayload).toBeUndefined();
    expect(payload.raw_payload_hash).toBe(hashRawPayload({ conversation: ['full', 'thread'] }));
  });

  it('never sends classification-only columns on the v2 source_tickets row', async () => {
    // v2 source_tickets keeps classification (detection_method, trigger tags,
    // keyword_matched, requires_merchant_review) off the ticket row — those
    // live on the claim row / source_ticket_events. The single upsert payload
    // must therefore never carry them, regardless of input.
    const { supabase, calls } = makeUpsertSupabase();
    await upsertSupportCaseIntake(supabase, {
      merchant_id: merchantA,
      provider: 'gorgias',
      external_case_id: 'g-compat-1',
      detection_method: 'tag',
      trigger_tag: 'refund-requested',
      trigger_tags: ['refund-requested'],
      requires_merchant_review: true,
      keyword_matched: 'refund',
      raw_payload: { id: 1 },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.detection_method).toBeUndefined();
    expect(calls[0].payload.trigger_tag).toBeUndefined();
    expect(calls[0].payload.trigger_tags).toBeUndefined();
    expect(calls[0].payload.requires_merchant_review).toBeUndefined();
    expect(calls[0].payload.keyword_matched).toBeUndefined();
  });

  it('throws when the source_tickets upsert reports a missing column', async () => {
    const { supabase } = makeCompatSqlFallbackUpsertSupabase();
    await expect(
      upsertSupportCaseIntake(supabase, {
        merchant_id: merchantA,
        provider: 'gorgias',
        external_case_id: 'g-compat-2',
        raw_payload: { id: 2 },
      }),
    ).rejects.toThrow(/source_tickets/);
  });

  it('hashes customer email and omits plaintext', async () => {
    const { supabase, calls } = makeUpsertSupabase();
    const result = await upsertSupportCaseIntake(supabase, {
      merchant_id: merchantA,
      provider: 'zendesk',
      external_case_id: 'ZD-EMAIL',
      customer_email: 'Buyer@Example.com',
      raw_payload: {},
    });

    const payload = calls[0].payload;
    expect(payload.customer_email).toBeUndefined();
    // Plaintext email is never persisted on the ticket row; the hash is returned
    // for the caller's downstream identity-signal write.
    expect(payload.customer_email_hash).toBeUndefined();
    expect(result.customer_email_hash).toBe(hashSupportEmail('Buyer@Example.com'));
  });

  it('public provider connection shape omits token fields', async () => {
    const row: SupportProviderConnectionRow = {
      id: 'conn-1',
      merchant_id: merchantA,
      provider: 'zendesk',
      provider_account_id: 'zd-sub',
      provider_account_name: 'Acme',
      provider_base_url: 'https://acme.zendesk.com',
      status: 'active',
      access_token_encrypted: 'enc-access',
      refresh_token_encrypted: 'enc-refresh',
      token_expires_at: null,
      scopes: [],
      last_sync_at: null,
      last_error: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };

    const pub = toPublicSupportProviderConnection(row);
    expect(pub.access_token_encrypted).toBeUndefined();
    expect(pub.refresh_token_encrypted).toBeUndefined();
    expect(pub.provider).toBe('zendesk');
  });

  it('upsertSupportProviderConnection does not return provider tokens', async () => {
    const { supabase, calls } = makeUpsertSupabase();
    const result = await upsertSupportProviderConnection(supabase, {
      merchant_id: merchantA,
      provider: 'zendesk',
      provider_account_id: 'sub-1',
      access_token_encrypted: 'secret-access',
      refresh_token_encrypted: 'secret-refresh',
    });

    expect(calls[0].table).toBe('helpdesk_connections');
    expect(calls[0].onConflict).toBe('merchant_id,provider,provider_account_id');
    expect(result.access_token_encrypted).toBeUndefined();
    expect(result.refresh_token_encrypted).toBeUndefined();
  });
});

describe('provider timestamp normalization (upsertSupportCaseIntake)', () => {
  const merchant = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const baseInput = {
    merchant_id: merchant,
    provider: 'gorgias' as const,
    external_case_id: 'g-63091193',
  };

  it.each([
    ['Z form', '2026-05-30T21:00:00Z', '2026-05-30T21:00:00.000Z'],
    ['+00:00 offset', '2026-05-30T21:00:00+00:00', '2026-05-30T21:00:00.000Z'],
    ['microseconds + offset', '2026-05-30T21:00:00.123456+00:00', '2026-05-30T21:00:00.123Z'],
  ])('accepts %s and canonicalises to ISO Z', async (_label, input, expected) => {
    const { supabase, calls } = makeUpsertSupabase();
    await upsertSupportCaseIntake(supabase, {
      ...baseInput,
      created_at_provider: input,
      updated_at_provider: input,
    });
    expect(calls[0].payload.created_at_provider).toBe(expected);
    expect(calls[0].payload.updated_at_provider).toBe(expected);
  });

  it('rejects a non-date string', async () => {
    const { supabase } = makeUpsertSupabase();
    await expect(
      upsertSupportCaseIntake(supabase, { ...baseInput, created_at_provider: 'not-a-date' })
    ).rejects.toThrow();
  });

  it('rejects an empty string (never coerced to now)', async () => {
    const { supabase } = makeUpsertSupabase();
    await expect(
      upsertSupportCaseIntake(supabase, { ...baseInput, created_at_provider: '' })
    ).rejects.toThrow();
  });

  it('passes null/undefined through unchanged', async () => {
    const { supabase, calls } = makeUpsertSupabase();
    await upsertSupportCaseIntake(supabase, { ...baseInput, created_at_provider: null });
    expect(calls[0].payload.created_at_provider).toBeNull();
  });
});

describe('extractOrderRefFromText', () => {
  it.each([
    ['Please check ORD-2025-00341', 'ORD-2025-00341'],
    ['Ticket about #1007', '1007'],
    ['Customer wrote: Order 1007 never arrived', '1007'],
    ['Ref SM-0090-001 on label', 'SM-0090-001'],
    ['Order #1008 not received', '1008'],
    ['order #1008', '1008'],
    ['#1008', '1008'],
    ['order number 1008 please', '1008'],
    ['my order no. 1008 has not arrived', '1008'],
    ['order no 1008', '1008'],
  ])('extracts %s -> %s', (text, expected) => {
    expect(extractOrderRefFromText(text)).toBe(expected);
  });
});
