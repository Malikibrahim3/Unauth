import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { SUBMIT_FRAUD_FEEDBACK: 'submit_fraud_feedback' },
  requirePermission: jest.fn(),
}));

jest.mock('@/lib/claims/store', () => {
  const actual = jest.requireActual('@/lib/claims/store');
  return {
    ...actual,
    upsertMerchantClaim: jest.fn(),
    upsertMerchantCaseOutcome: jest.fn(),
    upsertClaimEvidenceItem: jest.fn(),
  };
});

jest.mock('@/lib/supabase/merchantHelpers', () => ({
  fetchMerchantScopedCustomerProfile: jest.fn(),
}));

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
import { upsertMerchantClaim, upsertMerchantCaseOutcome, upsertClaimEvidenceItem } from '@/lib/claims/store';
import { fetchMerchantScopedCustomerProfile } from '@/lib/supabase/merchantHelpers';

function mkReq(url: string, body: any) {
  return new NextRequest(url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } as any);
}

function setupAuth(ok: boolean) {
  (createClient as jest.Mock).mockReturnValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: ok ? { id: 'user-1' } : null } }) } });
}

function setupPermission() {
  (requirePermission as jest.Mock).mockResolvedValue({ denied: null, ctx: { merchantId: 'm-1', userId: 'user-1' } });
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
} = {}) {
  const ownsShop = opts.ownsShop ?? true;
  const claimShopDomain = Object.prototype.hasOwnProperty.call(opts, 'claimShopDomain') ? opts.claimShopDomain : 'unit-test.myshopify.com';
  const claimMerchantId = Object.prototype.hasOwnProperty.call(opts, 'claimMerchantId') ? opts.claimMerchantId : 'm-1';
  const claimStatus = opts.claimStatus ?? 'open';
  const firstViewedAt = opts.firstViewedAt ?? null;
  const assignedTo = opts.assignedTo ?? null;
  const claimEvents: any[] = [];
  const claimUpdates: any[] = [];

  function makeSelectChain(table: string) {
    const filters: Array<{ op: string; column: string; value: any }> = [];
    const chain: any = {
      eq: (column: string, value: any) => { filters.push({ op: 'eq', column, value }); return chain; },
      neq: (column: string, value: any) => { filters.push({ op: 'neq', column, value }); return chain; },
      in: (column: string, value: any) => { filters.push({ op: 'in', column, value }); return chain; },
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => {
        if (table === 'merchant_shopify_connections') {
          return { data: ownsShop ? { merchant_id: 'm-1' } : null, error: null };
        }
        if (table === 'merchant_claims') {
          return {
            data: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              merchant_id: claimMerchantId,
              shop_domain: claimShopDomain,
              status: claimStatus,
              claim_type: 'missing_parcel',
              customer_id: 'p1',
              submitted_at: new Date(Date.now() - 86400000).toISOString(),
              updated_at: new Date().toISOString(),
              first_viewed_at: firstViewedAt,
              first_viewed_by: firstViewedAt ? 'user-1' : null,
              assigned_to: assignedTo,
              assigned_at: assignedTo ? new Date().toISOString() : null,
              snoozed_until: null,
              snooze_reason: null,
            },
            error: null,
          };
        }
        if (table === 'merchant_case_outcomes') {
          return { data: opts.latestOutcome ?? { id: 'old-o1', decision: 'denied', outcome: 'suspected_fraud', updated_at: new Date().toISOString() }, error: null };
        }
        return { data: null, error: null };
      },
      then: async (resolve: any) => {
        if (table === 'merchant_shopify_connections') {
          return resolve({ data: ownsShop ? [{ merchant_id: 'm-1', shop_domain: 'unit-test.myshopify.com', active: true }] : [], error: null });
        }
        if (table === 'merchant_claims') {
          const isDuplicateProbe = filters.some((f) => f.column === 'claim_type');
          return resolve({ data: isDuplicateProbe ? (opts.duplicateClaims ?? []) : [], error: null });
        }
        return resolve({ data: [], error: null });
      },
    };
    return chain;
  }

  const service = {
    from: (table: string) => {
      if (table === 'merchant_shopify_connections') {
        return {
          select: () => makeSelectChain(table),
        };
      }
      if (table === 'merchant_claims') {
        const updateChain: any = {
          eq: () => updateChain,
          is: () => updateChain,
          select: () => {
            const row = async () => ({
              data: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                status: updateChain.status ?? 'resolved',
                first_viewed_at: updateChain.payload?.first_viewed_at ?? firstViewedAt,
                first_viewed_by: updateChain.payload?.first_viewed_by ?? (firstViewedAt ? 'user-1' : null),
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
            status: 'under_review',
          },
          error: null,
        });
        return {
          select: () => makeSelectChain(table),
          update: (payload: any) => {
            updateChain.status = payload.status;
            updateChain.payload = payload;
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
      if (table === 'merchant_case_outcomes') {
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

  it('user from wrong merchant rejected', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient({ ownsShop: false });
    const res = await claimsPost(mkReq('http://localhost/api/claims', {
      shop_domain: 'unit-test.myshopify.com',
      shopify_order_id: '1001',
      claim_type: 'other',
    }));
    expect(res.status).toBe(403);
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
    expect(claimEvents).toEqual(expect.arrayContaining([expect.objectContaining({ event_type: 'claim_created', claim_id: 'c1', merchant_id: 'm-1' })]));
  });

  it('duplicate active claim is rejected by API', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient({
      duplicateClaims: [{ id: 'dupe-c1', status: 'under_review', shopify_order_id: '1001', customer_id: 'p1' }],
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
      duplicateClaims: [{ id: 'resolved-c1', status: 'resolved', shopify_order_id: '1001', customer_id: 'p1' }],
    });
    const res = await claimsPost(mkReq('http://localhost/api/claims', { shop_domain: 'unit-test.myshopify.com', shopify_order_id: '1001', claim_type: 'missing_parcel', status: 'open' }));
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.code).toBe('duplicate_resolved_claim');
  });

  it('valid CSV/manual profile claim uses merchant-scoped profile ownership', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient();
    (fetchMerchantScopedCustomerProfile as jest.Mock).mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440001' });
    (upsertMerchantClaim as jest.Mock).mockResolvedValue({
      id: 'c1',
      shop_domain: null,
      shopify_order_id: null,
      order_ref: 'ORD-2025-00501',
      order_source: 'csv',
      claim_type: 'missing_parcel',
      status: 'under_review',
    });

    const res = await claimsPost(mkReq('http://localhost/api/claims', {
      customer_id: '550e8400-e29b-41d4-a716-446655440001',
      order_ref: 'ORD-2025-00501',
      order_source: 'csv',
      claim_type: 'missing_parcel',
      status: 'under_review',
    }));

    expect(res.status).toBe(200);
    expect(fetchMerchantScopedCustomerProfile).toHaveBeenCalledWith(
      expect.anything(),
      'm-1',
      '550e8400-e29b-41d4-a716-446655440001',
      'user-1'
    );
    expect(upsertMerchantClaim).toHaveBeenCalled();
  });

  it('falls back to legacy shopify_order_id storage when claim order_ref columns are absent', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient();
    (fetchMerchantScopedCustomerProfile as jest.Mock).mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440001' });
    (upsertMerchantClaim as jest.Mock).mockRejectedValue(new Error('upsert merchant_claims failed: column order_ref does not exist'));

    const res = await claimsPost(mkReq('http://localhost/api/claims', {
      customer_id: '550e8400-e29b-41d4-a716-446655440001',
      order_ref: 'ORD-2025-00501',
      order_source: 'csv',
      claim_type: 'missing_parcel',
      status: 'under_review',
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.claim.shopify_order_id).toBe('ORD-2025-00501');
  });

  it('valid outcome add succeeds', async () => {
    setupAuth(true);
    setupPermission();
    const { claimEvents } = setupServiceClient();
    (upsertMerchantCaseOutcome as jest.Mock).mockResolvedValue({ id: 'o1', claim_id: 'c1', decision: 'approved', outcome: 'recovered', amount_refunded: null, amount_recovered: null });
    const res = await outcomePost(
      mkReq('http://localhost/api/claims/c1/outcome', { decision: 'approved', outcome: 'recovered' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(res.status).toBe(200);
    expect(upsertMerchantCaseOutcome).toHaveBeenCalled();
    expect(claimEvents.map((event) => event.event_type)).toEqual(expect.arrayContaining(['outcome_added', 'claim_resolved']));
  });

  it('valid outcome resolves a merchant-owned CSV/manual claim without shop domain', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient({ claimShopDomain: null as any });
    (upsertMerchantCaseOutcome as jest.Mock).mockResolvedValue({ id: 'o1', claim_id: 'c1', decision: 'denied', outcome: 'suspected_fraud', amount_refunded: null, amount_recovered: null });

    const res = await outcomePost(
      mkReq('http://localhost/api/claims/c1/outcome', { decision: 'denied', outcome: 'suspected_fraud' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );

    expect(res.status).toBe(200);
    expect(upsertMerchantCaseOutcome).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      shop_domain: null,
      decision: 'denied',
      outcome: 'suspected_fraud',
    }));
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
    const { claimEvents } = setupServiceClient({ claimStatus: 'resolved' });
    const res = await reopenPost(
      mkReq('http://localhost/api/claims/c1/reopen', { note: 'Carrier correction received' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(res.status).toBe(200);
    expect(claimEvents).toEqual(expect.arrayContaining([expect.objectContaining({ event_type: 'claim_reopened', previous_status: 'resolved', new_status: 'under_review' })]));
  });

  it('decision reversal preserves previous outcome in event', async () => {
    setupAuth(true);
    setupPermission();
    const { claimEvents } = setupServiceClient({ claimStatus: 'resolved', latestOutcome: { id: 'old-o1', decision: 'denied', outcome: 'suspected_fraud', updated_at: new Date().toISOString() } });
    (upsertMerchantCaseOutcome as jest.Mock).mockResolvedValue({ id: 'new-o1', claim_id: 'c1', decision: 'approved', outcome: 'legitimate' });
    const res = await reversePost(
      mkReq('http://localhost/api/claims/c1/reverse', { decision: 'approved', outcome: 'legitimate', note: 'Carrier confirmed misdelivery' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(res.status).toBe(200);
    expect(claimEvents).toEqual(expect.arrayContaining([expect.objectContaining({
      event_type: 'decision_reversed',
      previous_decision: 'denied',
      new_decision: 'approved',
      previous_outcome: 'suspected_fraud',
      new_outcome: 'legitimate',
    })]));
  });

  it('claim can be set to pending external evidence', async () => {
    setupAuth(true);
    setupPermission();
    const { claimEvents } = setupServiceClient();
    const res = await statusPost(
      mkReq('http://localhost/api/claims/c1/status', { status: 'pending', note: 'Awaiting carrier photo proof' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(res.status).toBe(200);
    expect(claimEvents).toEqual(expect.arrayContaining([expect.objectContaining({ event_type: 'status_changed', new_status: 'pending' })]));
  });

  it('wrong merchant cannot mutate claim', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient({ claimMerchantId: 'm-2', claimShopDomain: null });
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
    expect(claimUpdates).toEqual(expect.arrayContaining([expect.objectContaining({ first_viewed_by: 'user-1' })]));
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

  it('wrong merchant cannot mark another merchant claim viewed', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient({ claimMerchantId: 'm-2', claimShopDomain: null });
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
      expect.objectContaining({ assigned_to: 'user-1' }),
      expect.objectContaining({ assigned_to: null }),
    ]));
    expect(claimEvents.map((event) => event.event_type)).toEqual(expect.arrayContaining(['claim_assigned', 'claim_unassigned']));
  });

  it('wrong merchant cannot assign claim', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient({ claimMerchantId: 'm-2', claimShopDomain: null });
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
    expect(claimUpdates[0].last_customer_response_text).toContain('no further action');
    expect(claimEvents.map((event) => event.event_type)).toEqual(expect.arrayContaining(['customer_response_saved', 'customer_response_copied']));
  });

  it('wrong merchant cannot write customer response record', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient({ claimMerchantId: 'm-2', claimShopDomain: null });
    const res = await responseCopiedPost(
      mkReq('http://localhost/api/claims/c1/customer-response-copied', { decision: 'no_action', outcome: 'legitimate' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(res.status).toBe(403);
  });
});
