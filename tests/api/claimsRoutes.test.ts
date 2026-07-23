import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { SUBMIT_FRAUD_FEEDBACK: 'submit_fraud_feedback', SUBMIT_PAYOUT_DECISIONS: 'submit_payout_decisions' },
  requirePermission: jest.fn(),
}));

jest.mock('@/lib/claims/store', () => {
  const actual = jest.requireActual('@/lib/claims/store');
  return {
    ...actual,
    upsertMerchantClaim: jest.fn(),
    recordMerchantCaseDecision: jest.fn(),
    upsertClaimEvidenceItem: jest.fn(),
  };
});

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { POST as claimsPost } from '@/app/api/claims/route';
import { POST as outcomePost } from '@/app/api/claims/[claimId]/outcome/route';
import { POST as evidencePost } from '@/app/api/claims/[claimId]/evidence/route';
import { POST as reopenPost } from '@/app/api/claims/[claimId]/reopen/route';
import { POST as reversePost } from '@/app/api/claims/[claimId]/reverse/route';
import { POST as statusPost } from '@/app/api/claims/[claimId]/status/route';
import { POST as viewPost } from '@/app/api/claims/[claimId]/view/route';
import { POST as assignmentPost } from '@/app/api/claims/[claimId]/assignment/route';
import { POST as snoozePost } from '@/app/api/claims/[claimId]/snooze/route';
import { POST as responseCopiedPost } from '@/app/api/claims/[claimId]/customer-response-copied/route';
import { upsertMerchantClaim, recordMerchantCaseDecision, upsertClaimEvidenceItem } from '@/lib/claims/store';
import { TABLES } from '@/lib/supabase/tables';

const TEST_USER_ID = '11111111-1111-4111-8111-111111111111';
const TEST_MERCHANT_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_MERCHANT_ID = '33333333-3333-4333-8333-333333333333';
const TEST_SOURCE_ORDER_ID = '44444444-4444-4444-8444-444444444444';

function mkReq(url: string, body: any) {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'idempotency-key': 'route-test-request-1' },
  } as any);
}

function setupAuth(ok: boolean) {
  (createClient as jest.Mock).mockReturnValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: ok ? { id: TEST_USER_ID } : null } }) } });
}

function setupPermission() {
  (requirePermission as jest.Mock).mockResolvedValue({ denied: null, ctx: { merchantId: TEST_MERCHANT_ID, userId: TEST_USER_ID } });
}

function setupServiceClient(opts: {
  ownsShop?: boolean;
  claimShopDomain?: string | null;
  claimMerchantId?: string | null;
  claimStatus?: string;
  firstViewedAt?: string | null;
  assignedTo?: string | null;
  duplicateClaims?: any[];
  latestOutcome?: any;
  transitionError?: { message: string; code?: string };
} = {}) {
  const ownsShop = opts.ownsShop ?? true;
  const claimShopDomain = Object.prototype.hasOwnProperty.call(opts, 'claimShopDomain') ? opts.claimShopDomain : 'unit-test.myshopify.com';
  const claimMerchantId = Object.prototype.hasOwnProperty.call(opts, 'claimMerchantId') ? opts.claimMerchantId : TEST_MERCHANT_ID;
  const claimStatus = opts.claimStatus ?? 'open';
  let firstViewedAt = opts.firstViewedAt ?? null;
  const assignedTo = opts.assignedTo ?? null;
  const claimEvents: any[] = [];
  const claimUpdates: any[] = [];
  const claimTables = new Set([TABLES.MERCHANT_CLAIMS, 'merchant_claims']);
  const storeConnectionTables = new Set([TABLES.MERCHANT_SHOPIFY_CONNECTIONS, 'merchant_shopify_connections']);

  function makeSelectChain(table: string) {
    const filters: Array<{ op: string; column: string; value: any }> = [];
    const filterValue = (column: string) => filters.find((f) => f.column === column)?.value;
    const chain: any = {
      eq: (column: string, value: any) => { filters.push({ op: 'eq', column, value }); return chain; },
      neq: (column: string, value: any) => { filters.push({ op: 'neq', column, value }); return chain; },
      in: (column: string, value: any) => { filters.push({ op: 'in', column, value }); return chain; },
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => {
        if (storeConnectionTables.has(table)) {
          return { data: ownsShop ? { merchant_id: TEST_MERCHANT_ID } : null, error: null };
        }
        if (claimTables.has(table)) {
          return {
            data: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              merchant_id: claimMerchantId,
              shop_domain: claimShopDomain,
              status: claimStatus,
              state_version: 1,
              claim_type: 'missing_parcel',
              customer_id: 'p1',
              submitted_at: new Date(Date.now() - 86400000).toISOString(),
              updated_at: new Date().toISOString(),
              first_viewed_at: firstViewedAt,
              first_viewed_by: firstViewedAt ? TEST_USER_ID : null,
              assigned_to: assignedTo,
              assigned_at: assignedTo ? new Date().toISOString() : null,
              snoozed_until: null,
              snooze_reason: null,
            },
            error: null,
          };
        }
        if (table === 'merchant_case_outcomes' || table === 'claim_outcomes') {
          return { data: opts.latestOutcome ?? { id: 'old-o1', decision: 'denied', outcome: 'suspected_fraud', updated_at: new Date().toISOString() }, error: null };
        }
        if (table === 'source_orders') {
          const merchantMatches = filterValue('merchant_id') === TEST_MERCHANT_ID;
          const ref = filterValue('external_id') ?? filterValue('order_number');
          return {
            data: ownsShop && merchantMatches && ref
              ? { id: TEST_SOURCE_ORDER_ID, external_id: String(ref), order_number: String(ref) }
              : null,
            error: null,
          };
        }
        return { data: null, error: null };
      },
      then: async (resolve: any) => {
        if (storeConnectionTables.has(table)) {
          return resolve({ data: ownsShop ? [{ merchant_id: TEST_MERCHANT_ID, shop_domain: 'unit-test.myshopify.com', active: true }] : [], error: null });
        }
        if (claimTables.has(table)) {
          const isDuplicateProbe = filters.some((f) => f.column === 'source_order_id' || f.column === 'shopify_order_id' || f.column === 'order_ref');
          return resolve({ data: isDuplicateProbe ? (opts.duplicateClaims ?? []) : [], error: null });
        }
        if (table === 'source_orders') {
          return resolve({ data: ownsShop ? [{ id: TEST_SOURCE_ORDER_ID, external_id: '1001', order_number: '1001' }] : [], error: null });
        }
        return resolve({ data: [], error: null });
      },
    };
    return chain;
  }

  const service = {
    rpc: async (fn: string, args: Record<string, any>) => {
      if (fn === 'record_domain_event') return { data: 'event-1', error: null };
      if (fn === 'transition_payout_case') {
        if (opts.transitionError) return { data: null, error: opts.transitionError };
        const patch = args.p_patch ?? {};
        claimUpdates.push(patch);
        claimEvents.push({
          claim_id: args.p_case_id,
          merchant_id: args.p_merchant_id,
          event_type: args.p_claim_event_type,
          from_status: claimStatus,
          to_status: patch.status ?? claimStatus,
          note: args.p_reason,
          metadata: args.p_claim_event_metadata ?? {},
        });
        return {
          data: {
            case_id: args.p_case_id,
            new_version: Number(args.p_expected_version) + 1,
            status: patch.status ?? claimStatus,
            payout_decision_state: patch.payout_decision_state ?? 'undecided',
            recovery_state: patch.recovery_state ?? 'no_recovery_needed',
            domain_event_id: 'event-1',
          },
          error: null,
        };
      }
      return { data: null, error: null };
    },
    from: (table: string) => {
      if (storeConnectionTables.has(table)) {
        return {
          select: () => makeSelectChain(table),
        };
      }
      if (table === 'source_orders') {
        return {
          select: () => makeSelectChain(table),
        };
      }
      if (claimTables.has(table)) {
        const updateChain: any = {
          eq: () => updateChain,
          is: () => updateChain,
          select: () => {
            const row = async () => ({
              data: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                status: updateChain.status ?? claimStatus,
                state_version: updateChain.payload?.state_version ?? 1,
                first_viewed_at: updateChain.payload?.first_viewed_at ?? firstViewedAt,
                first_viewed_by: updateChain.payload?.first_viewed_by ?? (firstViewedAt ? TEST_USER_ID : null),
                assigned_to: Object.prototype.hasOwnProperty.call(updateChain.payload ?? {}, 'assigned_to') ? updateChain.payload.assigned_to : assignedTo,
                assigned_at: updateChain.payload?.assigned_at ?? null,
                snoozed_until: updateChain.payload?.snoozed_until ?? null,
                snooze_reason: updateChain.payload?.snooze_reason ?? null,
              },
              error: null,
            });
            return { single: row, maybeSingle: row };
          },
        };
        const upsertSingle = jest.fn().mockResolvedValue({
          data: {
            id: 'legacy-c1',
            shop_domain: 'unit-test.myshopify.com',
            shopify_order_id: 'ORD-2025-00501',
            claim_type: 'missing_parcel',
            status: 'open',
          },
          error: null,
        });
        return {
          select: () => makeSelectChain(table),
          update: (payload: any) => {
            updateChain.status = payload.status;
            updateChain.payload = payload;
            if (Object.prototype.hasOwnProperty.call(payload, 'first_viewed_at') && payload.first_viewed_at) {
              firstViewedAt = payload.first_viewed_at;
            }
            claimUpdates.push(payload);
            return updateChain;
          },
          upsert: () => ({
            select: () => ({
              single: upsertSingle,
            }),
          }),
        };
      }
      if (table === 'merchant_case_outcomes' || table === 'claim_outcomes') {
        return {
          select: () => makeSelectChain(table),
        };
      }
      if (table === 'claim_events') {
        return {
          insert: (payload: any) => {
            claimEvents.push(payload);
            return {
              select: () => ({
                single: async () => ({ data: { id: `ev-${claimEvents.length}`, ...payload }, error: null }),
              }),
            };
          },
        };
      }
      return {};
    },
  };
  (createServiceClient as jest.Mock).mockReturnValue(service);
  return { service, claimEvents, claimUpdates };
}

describe('claims routes', () => {
  beforeEach(() => jest.resetAllMocks());

  it('unauthenticated request rejected', async () => {
    setupAuth(false);
    setupServiceClient();
    const res = await claimsPost(mkReq('http://localhost/api/claims', { shop_domain: 'unit-test.myshopify.com', shopify_order_id: '1001', claim_type: 'other' }));
    expect(res.status).toBe(401);
  });

  it('unknown merchant order is rejected', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient({ ownsShop: false });
    const res = await claimsPost(mkReq('http://localhost/api/claims', {
      shop_domain: 'unit-test.myshopify.com',
      shopify_order_id: '1001',
      claim_type: 'other',
    }));
    expect(res.status).toBe(422);
  });

  it('invalid enum rejected', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient();
    const res = await claimsPost(mkReq('http://localhost/api/claims', { shop_domain: 'unit-test.myshopify.com', claim_type: 'bad_enum' }));
    expect(res.status).toBe(400);
  });

  it('valid claim create/update succeeds', async () => {
    setupAuth(true);
    setupPermission();
    const { claimEvents } = setupServiceClient();
    (upsertMerchantClaim as jest.Mock).mockResolvedValue({ id: 'c1', shop_domain: 'unit-test.myshopify.com', shopify_order_id: '1001', claim_type: 'missing_parcel', status: 'open' });
    const res = await claimsPost(mkReq('http://localhost/api/claims', { shop_domain: 'unit-test.myshopify.com', shopify_order_id: '1001', claim_type: 'missing_parcel', status: 'open' }));
    expect(res.status).toBe(200);
    expect(upsertMerchantClaim).toHaveBeenCalled();
    expect(claimEvents).toEqual(expect.arrayContaining([expect.objectContaining({ event_type: 'claim_created', claim_id: 'c1', merchant_id: TEST_MERCHANT_ID })]));
  });

  it('duplicate active claim is rejected by API', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient({
      duplicateClaims: [{ id: 'dupe-c1', status: 'open', shopify_order_id: '1001', customer_id: 'p1' }],
    });
    (upsertMerchantClaim as jest.Mock).mockResolvedValue({ id: 'c1' });
    const res = await claimsPost(mkReq('http://localhost/api/claims', { shop_domain: 'unit-test.myshopify.com', shopify_order_id: '1001', claim_type: 'missing_parcel', status: 'open' }));
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.code).toBe('duplicate_active_claim');
    expect(upsertMerchantClaim).not.toHaveBeenCalled();
  });

  it('duplicate resolved claim returns reopen guidance', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient({
      duplicateClaims: [{ id: 'resolved-c1', status: 'resolved_refunded', shopify_order_id: '1001', customer_id: 'p1' }],
    });
    const res = await claimsPost(mkReq('http://localhost/api/claims', { shop_domain: 'unit-test.myshopify.com', shopify_order_id: '1001', claim_type: 'missing_parcel', status: 'open' }));
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.code).toBe('duplicate_resolved_claim');
  });

  it('valid CSV/manual order claim uses merchant-scoped source order ownership', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient();
    (upsertMerchantClaim as jest.Mock).mockResolvedValue({
      id: 'c1',
      shop_domain: null,
      source_order_id: TEST_SOURCE_ORDER_ID,
      claim_type: 'missing_parcel',
      status: 'open',
    });

    const res = await claimsPost(mkReq('http://localhost/api/claims', {
      customer_id: '550e8400-e29b-41d4-a716-446655440001',
      order_ref: 'ORD-2025-00501',
      order_source: 'csv',
      claim_type: 'missing_parcel',
      status: 'open',
    }));

    expect(res.status).toBe(200);
    expect(upsertMerchantClaim).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      merchant_id: TEST_MERCHANT_ID,
      source_order_id: TEST_SOURCE_ORDER_ID,
    }));
  });

  it('returns a server error when claim upsert fails', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient();
    (upsertMerchantClaim as jest.Mock).mockRejectedValue(new Error('upsert merchant_claims failed: column order_ref does not exist'));

    const res = await claimsPost(mkReq('http://localhost/api/claims', {
      customer_id: '550e8400-e29b-41d4-a716-446655440001',
      order_ref: 'ORD-2025-00501',
      order_source: 'csv',
      claim_type: 'missing_parcel',
      status: 'open',
    }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to upsert claim');
  });

  it('records merchant authorization without claiming a source payout', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient();
    (recordMerchantCaseDecision as jest.Mock).mockResolvedValue({
      id: 'o1', decision_id: 'd1', claim_id: '550e8400-e29b-41d4-a716-446655440000',
      decision: 'approved', outcome: 'pending', amount_minor: 2500, currency: 'GBP',
      domain_event_id: 'event-1', replayed: false,
    });
    const res = await outcomePost(
      mkReq('http://localhost/api/claims/c1/outcome', {
        decision: 'approved', outcome: 'pending', amount_minor: 2500, currency: 'GBP',
      }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(recordMerchantCaseDecision).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      decision: 'approved', outcome: 'pending', amount_minor: 2500, currency: 'GBP',
    }));
    expect(body.outcome.outcome).toBe('pending');
    expect(body.projection.note).toContain('No refund');
  });

  it('records a decision on a merchant-owned CSV/manual claim without shop domain', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient({ claimShopDomain: null as any });
    (recordMerchantCaseDecision as jest.Mock).mockResolvedValue({
      id: 'o1', decision_id: 'd1', claim_id: '550e8400-e29b-41d4-a716-446655440000',
      decision: 'denied', outcome: 'pending', amount_minor: 2500, currency: 'GBP',
      domain_event_id: 'event-1', replayed: false,
    });

    const res = await outcomePost(
      mkReq('http://localhost/api/claims/c1/outcome', {
        decision: 'denied', outcome: 'pending', amount_minor: 2500, currency: 'GBP',
        notes: 'Request does not meet the documented payout policy.',
      }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );

    expect(res.status).toBe(200);
    expect(recordMerchantCaseDecision).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      decision: 'denied',
      outcome: 'pending',
    }));
  });

  it('rejects prohibited accusation vocabulary on the live outcome path (CR-4)', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient();

    const blacklisted = await outcomePost(
      mkReq('http://localhost/api/claims/c1/outcome', { decision: 'blacklist', outcome: 'loss' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(blacklisted.status).toBe(400);

    const suspectedFraud = await outcomePost(
      mkReq('http://localhost/api/claims/c1/outcome', { decision: 'denied', outcome: 'suspected_fraud' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(suspectedFraud.status).toBe(400);

    expect(recordMerchantCaseDecision).not.toHaveBeenCalled();
  });

  it('valid evidence add succeeds', async () => {
    setupAuth(true);
    setupPermission();
    const { claimEvents } = setupServiceClient();
    (upsertClaimEvidenceItem as jest.Mock).mockResolvedValue({ id: 'e1', claim_id: 'c1', evidence_type: 'tracking', source: 'shopify' });
    const res = await evidencePost(
      mkReq('http://localhost/api/claims/c1/evidence', { evidence_type: 'tracking', source: 'shopify' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(res.status).toBe(200);
    expect(upsertClaimEvidenceItem).toHaveBeenCalled();
    expect(claimEvents).toEqual(expect.arrayContaining([expect.objectContaining({ event_type: 'evidence_added' })]));
  });

  it('resolved claim can be reopened and writes event', async () => {
    setupAuth(true);
    setupPermission();
    const { claimEvents } = setupServiceClient({ claimStatus: 'resolved_refunded' });
    const res = await reopenPost(
      mkReq('http://localhost/api/claims/c1/reopen', { note: 'Carrier correction received' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(res.status).toBe(200);
    expect(claimEvents).toEqual(expect.arrayContaining([expect.objectContaining({ event_type: 'claim_reopened', from_status: 'resolved_refunded', to_status: 'open' })]));
  });

  it('decision reversal records an immutable linked replacement authorization', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient({ claimStatus: 'resolved_refunded', latestOutcome: { id: 'old-o1', decision: 'denied', outcome: 'pending', updated_at: new Date().toISOString() } });
    (recordMerchantCaseDecision as jest.Mock).mockResolvedValue({
      id: 'new-o1', decision_id: 'new-d1', claim_id: '550e8400-e29b-41d4-a716-446655440000',
      decision: 'approved', outcome: 'pending', amount_minor: 2500, currency: 'GBP',
      domain_event_id: 'event-2', replayed: false,
    });
    const res = await reversePost(
      mkReq('http://localhost/api/claims/c1/reverse', {
        decision: 'approved', outcome: 'pending', amount_minor: 2500, currency: 'GBP',
        note: 'Carrier confirmed misdelivery',
      }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(res.status).toBe(200);
    expect(recordMerchantCaseDecision).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      decision: 'approved', outcome: 'pending', amount_minor: 2500, currency: 'GBP', reversal: true,
    }));
  });

  it('claim cannot be moved backward from open to pending', async () => {
    setupAuth(true);
    setupPermission();
    const { claimEvents } = setupServiceClient();
    const res = await statusPost(
      mkReq('http://localhost/api/claims/c1/status', { status: 'pending', note: 'Awaiting carrier photo proof' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(res.status).toBe(409);
    expect(claimEvents).toHaveLength(0);
  });

  it('returns actionable blockers when unresolved financial work prevents closure', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient({
      transitionError: { message: 'case_closure_blocked:source_outcome,recovery_work', code: '22023' },
    });
    const res = await statusPost(
      mkReq('http://localhost/api/claims/c1/status', {
        status: 'closed', note: 'Close after all work is resolved',
      }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) },
    );
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.blockers).toEqual(['source_outcome', 'recovery_work']);
    expect(body.error).toContain('Resolve the payout outcome');
  });

  it('wrong merchant cannot mutate claim', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient({ claimMerchantId: OTHER_MERCHANT_ID, claimShopDomain: null });
    const res = await reopenPost(
      mkReq('http://localhost/api/claims/c1/reopen', { note: 'Trying wrong merchant' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(res.status).toBe(403);
  });

  it('new claim appears unread until first view is persisted', async () => {
    setupAuth(true);
    setupPermission();
    const { claimEvents, claimUpdates } = setupServiceClient({ firstViewedAt: null });
    const res = await viewPost(
      mkReq('http://localhost/api/claims/c1/view', {}),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.claim.first_viewed_at).toBeTruthy();
    expect(claimUpdates).toEqual(expect.arrayContaining([expect.objectContaining({ first_viewed_at: expect.any(String) })]));
    expect(claimEvents).toEqual(expect.arrayContaining([expect.objectContaining({ event_type: 'claim_viewed' })]));
  });

  it('viewed claim survives refresh without duplicate first-view event', async () => {
    setupAuth(true);
    setupPermission();
    const viewedAt = new Date().toISOString();
    const { claimEvents, claimUpdates } = setupServiceClient({ firstViewedAt: viewedAt });
    const res = await viewPost(
      mkReq('http://localhost/api/claims/c1/view', {}),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.claim.first_viewed_at).toBe(viewedAt);
    expect(claimUpdates).toHaveLength(0);
    expect(claimEvents).toHaveLength(0);
  });

  it('mark viewed is idempotent across repeated calls', async () => {
    setupAuth(true);
    setupPermission();
    const { claimEvents, claimUpdates } = setupServiceClient({ firstViewedAt: null });
    const first = await viewPost(
      mkReq('http://localhost/api/claims/c1/view', {}),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    const second = await viewPost(
      mkReq('http://localhost/api/claims/c1/view', {}),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    const firstBody = await first.json();
    const secondBody = await second.json();
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(firstBody.claim.first_viewed_at).toBeTruthy();
    expect(secondBody.claim.first_viewed_at).toBeTruthy();
    expect(claimUpdates.filter((payload) => payload.first_viewed_at)).toHaveLength(1);
    expect(claimEvents.filter((event) => event.event_type === 'claim_viewed')).toHaveLength(1);
  });

  it('wrong merchant cannot mark another merchant claim viewed', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient({ claimMerchantId: OTHER_MERCHANT_ID, claimShopDomain: null });
    const res = await viewPost(
      mkReq('http://localhost/api/claims/c1/view', {}),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(res.status).toBe(403);
  });

  it('assign to self and unassign write operational events', async () => {
    setupAuth(true);
    setupPermission();
    const { claimEvents, claimUpdates } = setupServiceClient();
    const assignRes = await assignmentPost(
      mkReq('http://localhost/api/claims/c1/assignment', { action: 'assign_to_me' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    const unassignRes = await assignmentPost(
      mkReq('http://localhost/api/claims/c1/assignment', { action: 'unassign' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(assignRes.status).toBe(200);
    expect(unassignRes.status).toBe(200);
    expect(claimUpdates).toEqual(expect.arrayContaining([
      expect.objectContaining({ assigned_to: TEST_USER_ID }),
      expect.objectContaining({ assigned_to: null }),
    ]));
    expect(claimEvents.map((event) => event.event_type)).toEqual(expect.arrayContaining(['claim_assigned', 'claim_unassigned']));
  });

  it('wrong merchant cannot assign claim', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient({ claimMerchantId: OTHER_MERCHANT_ID, claimShopDomain: null });
    const res = await assignmentPost(
      mkReq('http://localhost/api/claims/c1/assignment', { action: 'assign_to_me' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(res.status).toBe(403);
  });

  it('snooze persists follow-up state and timeline event', async () => {
    setupAuth(true);
    setupPermission();
    const { claimEvents, claimUpdates } = setupServiceClient();
    const due = new Date(Date.now() + 86400000).toISOString();
    const res = await snoozePost(
      mkReq('http://localhost/api/claims/c1/snooze', { snoozed_until: due, reason: 'Awaiting carrier photo' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(res.status).toBe(200);
    expect(claimUpdates).toEqual(expect.arrayContaining([expect.objectContaining({ snoozed_until: due, status: 'pending' })]));
    expect(claimEvents).toEqual(expect.arrayContaining([expect.objectContaining({ event_type: 'claim_snoozed', note: 'Awaiting carrier photo' })]));
  });

  it('customer response copy persists safe text on claim and event', async () => {
    setupAuth(true);
    setupPermission();
    const { claimEvents, claimUpdates } = setupServiceClient();
    const res = await responseCopiedPost(
      mkReq('http://localhost/api/claims/c1/customer-response-copied', { decision: 'no_action', outcome: 'legitimate' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(res.status).toBe(200);
    expect(claimEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        event_type: 'customer_response_saved',
        metadata: expect.objectContaining({ response_text: expect.stringContaining('no further action') }),
      }),
      expect.objectContaining({ event_type: 'customer_response_copied' }),
    ]));
  });

  it('wrong merchant cannot write customer response record', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient({ claimMerchantId: OTHER_MERCHANT_ID, claimShopDomain: null });
    const res = await responseCopiedPost(
      mkReq('http://localhost/api/claims/c1/customer-response-copied', { decision: 'no_action', outcome: 'legitimate' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(res.status).toBe(403);
  });
});
