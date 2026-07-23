import { createManualCase, resolveOrderReference } from '@/lib/cases/createManualCase';

/**
 * Mock client: source_orders lookups return `orders`; inserts are captured per
 * table. Case insert returns a fixed id.
 */
function makeClient(orders: Array<{ id: string }>) {
  const inserts: Record<string, any[]> = {};
  const client: any = {
    from: (table: string) => {
      if (table === 'source_orders') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ limit: async () => ({ data: orders, error: null }) }) }) }),
        };
      }
      const query: any = {
        eq: () => query,
        maybeSingle: async () => ({ data: null, error: null }),
        then: (resolve: any) => resolve({ data: [], error: null }),
      };
      return {
        select: () => query,
        insert: (payload: any) => {
          (inserts[table] ??= []).push(payload);
          return {
            select: () => ({ single: async () => ({ data: { id: 'case-1' }, error: null }) }),
            then: (r: any) => r({ error: null }),
          };
        },
        upsert: (payload: any) => {
          (inserts[table] ??= []).push(payload);
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  return { client, inserts };
}

describe('resolveOrderReference', () => {
  it('confirmed for exactly one match', async () => {
    const { client } = makeClient([{ id: 'o-1' }]);
    expect(await resolveOrderReference(client, 'm', 'ORDER-1')).toEqual({ status: 'confirmed', sourceOrderId: 'o-1' });
  });
  it('ambiguous for multiple matches', async () => {
    const { client } = makeClient([{ id: 'o-1' }, { id: 'o-2' }]);
    const r = await resolveOrderReference(client, 'm', 'ORDER-1');
    expect(r.status).toBe('ambiguous');
  });
  it('none for zero matches', async () => {
    const { client } = makeClient([]);
    expect(await resolveOrderReference(client, 'm', 'ORDER-1')).toEqual({ status: 'none' });
  });
});

describe('createManualCase', () => {
  it('creates a fully manual case with no source and a manual_reference', async () => {
    const { client, inserts } = makeClient([]);
    const res = await createManualCase(client, 'm-1', { customerEmail: 'a@b.com', issueType: 'item_not_received', amountMinor: 8400, currency: 'GBP' });
    expect(res.matchStatus).toBe('unmatched');
    const caseRow = inserts['support_payout_cases'][0];
    expect(caseRow.case_origin).toBe('manual');
    expect(caseRow.manual_reference).toBeTruthy();
    expect(caseRow.source_order_id).toBeNull();
    expect(caseRow.status).toBe('manual_review');
    expect(caseRow.detection_method).toBe('manual');
  });

  it('confirmed order reference links the order and records a confirmed relationship', async () => {
    const { client, inserts } = makeClient([{ id: 'o-1' }]);
    const res = await createManualCase(client, 'm-1', { orderReference: 'ORDER-1', issueType: 'damaged' });
    expect(res.matchStatus).toBe('confirmed');
    expect(inserts['support_payout_cases'][0].source_order_id).toBe('o-1');
    const rel = inserts['entity_relationships'][0];
    expect(rel).toMatchObject({ from_entity_type: 'case', to_entity_type: 'order', to_entity_id: 'o-1', match_status: 'confirmed' });
  });

  it('ambiguous order reference leaves the case unanchored and records candidates', async () => {
    const { client, inserts } = makeClient([{ id: 'o-1' }, { id: 'o-2' }]);
    const res = await createManualCase(client, 'm-1', { orderReference: 'ORDER-1', issueType: 'other' });
    expect(res.matchStatus).toBe('ambiguous');
    expect(res.candidateOrderIds?.sort()).toEqual(['o-1', 'o-2']);
    expect(inserts['support_payout_cases'][0].source_order_id).toBeNull();
    expect(inserts['record_match_candidates'][0]).toHaveLength(2);
  });
});
