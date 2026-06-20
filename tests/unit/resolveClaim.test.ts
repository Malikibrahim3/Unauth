import type { SupabaseClient } from '@supabase/supabase-js';
import {
  pickClaimFromCandidates,
  resolveClaimForTicketDecision,
  type ClaimResolutionCandidate,
} from '@/lib/claims/decision/resolveClaim';

function candidate(
  overrides: Partial<ClaimResolutionCandidate> & { claimId: string },
): ClaimResolutionCandidate {
  return {
    status: 'open',
    claimType: 'item_not_received',
    sourceTicketId: 't1',
    sourceOrderId: 'o1',
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('pickClaimFromCandidates', () => {
  it('resolves a single claim on a ticket', () => {
    const result = pickClaimFromCandidates([candidate({ claimId: 'c1' })]);
    expect(result.status).toBe('resolved');
    expect(result.claimId).toBe('c1');
  });

  it('prefers active claims over resolved when multiple exist', () => {
    const result = pickClaimFromCandidates([
      candidate({ claimId: 'c-old', status: 'resolved', createdAt: '2026-06-10T00:00:00.000Z' }),
      candidate({ claimId: 'c-open', status: 'open', createdAt: '2026-06-01T00:00:00.000Z' }),
    ]);
    expect(result.status).toBe('resolved');
    expect(result.claimId).toBe('c-open');
  });

  it('matches claim type when multiple active claims exist', () => {
    const result = pickClaimFromCandidates(
      [
        candidate({ claimId: 'c-inr', claimType: 'item_not_received', status: 'open' }),
        candidate({ claimId: 'c-damaged', claimType: 'damaged', status: 'open' }),
      ],
      'item_not_received',
    );
    expect(result.status).toBe('resolved');
    expect(result.claimId).toBe('c-inr');
  });

  it('returns ambiguous when multiple active claims remain after type filter', () => {
    const result = pickClaimFromCandidates(
      [
        candidate({ claimId: 'c1', status: 'open' }),
        candidate({ claimId: 'c2', status: 'escalated' }),
      ],
      'item_not_received',
    );
    expect(result.status).toBe('ambiguous');
    expect(result.claimId).toBeNull();
    expect(result.candidates).toHaveLength(2);
  });

  it('returns not_found for empty candidates', () => {
    const result = pickClaimFromCandidates([]);
    expect(result.status).toBe('not_found');
    expect(result.claimId).toBeNull();
  });
});

function mockSupabase(handlers: {
  sourceTickets?: Array<{ id: string; external_id: string }>;
  ticketClaims?: ClaimResolutionCandidate[];
  orderClaims?: ClaimResolutionCandidate[];
  sourceOrders?: Array<{ id: string }>;
}): SupabaseClient {
  const ticketClaims = handlers.ticketClaims ?? [];
  const orderClaims = handlers.orderClaims ?? [];
  const sourceTickets = handlers.sourceTickets ?? [];
  const sourceOrders = handlers.sourceOrders ?? [];

  function mapClaimRows(candidates: ClaimResolutionCandidate[]) {
    return candidates.map((c) => ({
      id: c.claimId,
      status: c.status,
      claim_type: c.claimType,
      source_ticket_id: c.sourceTicketId,
      source_order_id: c.sourceOrderId,
      created_at: c.createdAt,
      submitted_at: c.createdAt,
    }));
  }

  function claimsChain(filters: Array<{ col: string; val: string }>) {
    const chain = {
      select: () => chain,
      eq: (col: string, val: string) => {
        filters.push({ col, val });
        return chain;
      },
      in: () => chain,
      then(
        resolve: (value: { data: unknown; error: null }) => void,
        reject?: (reason: unknown) => void,
      ) {
        try {
          if (filters.some((f) => f.col === 'source_ticket_id')) {
            resolve({ data: mapClaimRows(ticketClaims), error: null });
            return;
          }
          if (filters.some((f) => f.col === 'source_order_id')) {
            resolve({ data: mapClaimRows(orderClaims), error: null });
            return;
          }
          resolve({ data: [], error: null });
        } catch (err) {
          reject?.(err);
        }
      },
    };
    return chain;
  }

  return {
    from(table: string) {
      if (table === 'support_payout_cases') {
        return claimsChain([]);
      }

      const builder = {
        select: () => builder,
        eq: (col: string, val: string) => {
          builder._filters = [...(builder._filters ?? []), { col, val }];
          return builder;
        },
        in: () => builder,
        or: () => builder,
        limit: () => builder,
        maybeSingle: async () => {
          if (table === 'source_tickets') {
            const ext = builder._filters?.find((f) => f.col === 'external_id')?.val;
            const row = sourceTickets.find((t) => t.external_id === ext);
            return { data: row ?? null, error: null };
          }
          if (table === 'source_orders') {
            return { data: sourceOrders[0] ?? null, error: null };
          }
          return { data: null, error: null };
        },
        _filters: [] as Array<{ col: string; val: string }>,
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

describe('resolveClaimForTicketDecision', () => {
  it('resolves one ticket to one claim', async () => {
    const client = mockSupabase({
      sourceTickets: [{ id: 'st1', external_id: '999' }],
      ticketClaims: [candidate({ claimId: 'c1', sourceTicketId: 'st1' })],
    });
    const result = await resolveClaimForTicketDecision(client, {
      merchantId: 'm1',
      ticketExternalId: '999',
    });
    expect(result.status).toBe('resolved');
    expect(result.claimId).toBe('c1');
  });

  it('uses order fallback only when exactly one open claim exists', async () => {
    const client = mockSupabase({
      sourceTickets: [],
      sourceOrders: [{ id: 'o1' }],
      orderClaims: [candidate({ claimId: 'c-order', sourceOrderId: 'o1', status: 'open' })],
    });
    const result = await resolveClaimForTicketDecision(client, {
      merchantId: 'm1',
      orderReference: '1001',
    });
    expect(result.status).toBe('resolved');
    expect(result.claimId).toBe('c-order');
    expect(result.reason).toBe('single_open_claim_on_order');
  });

  it('returns ambiguous for multiple open order claims', async () => {
    const client = mockSupabase({
      sourceOrders: [{ id: 'o1' }],
      orderClaims: [
        candidate({ claimId: 'c1', sourceOrderId: 'o1' }),
        candidate({ claimId: 'c2', sourceOrderId: 'o1' }),
      ],
    });
    const result = await resolveClaimForTicketDecision(client, {
      merchantId: 'm1',
      orderReference: '1001',
    });
    expect(result.status).toBe('ambiguous');
    expect(result.reason).toBe('multiple_open_claims_on_order');
  });

  it('returns not_found when ticket ingested but no claim row', async () => {
    const client = mockSupabase({
      sourceTickets: [{ id: 'st1', external_id: '999' }],
      ticketClaims: [],
    });
    const result = await resolveClaimForTicketDecision(client, {
      merchantId: 'm1',
      ticketExternalId: '999',
    });
    expect(result.status).toBe('not_found');
    expect(result.reason).toBe('ticket_exists_no_claim_row');
    expect(result.sourceTicketId).toBe('st1');
  });

  it('returns not_found when ticket not ingested yet', async () => {
    const client = mockSupabase({});
    const result = await resolveClaimForTicketDecision(client, {
      merchantId: 'm1',
      ticketExternalId: '999',
    });
    expect(result.status).toBe('not_found');
    expect(result.reason).toBe('ticket_not_ingested');
  });
});
