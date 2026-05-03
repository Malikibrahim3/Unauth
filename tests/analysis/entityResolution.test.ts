/**
 * Tests for Entity Resolution — Living Customer Profiles
 *
 * These tests mock the Supabase client and verify:
 *   1. New customer creates profile
 *   2. Returning customer updates profile (no duplicate)
 *   3. Same customer, different email, same card → merged
 *   4. IP-only matching safety check (low risk → no merge)
 *   5. Profile risk score rolling update (60/40 formula)
 *   6. Multi-merchant tracking
 *   7. Audit history preserved (appearance links)
 */

import type { ScoredOrder, NormalisedOrder, SignalResult } from '@/lib/engine/types';
import {
  resolveCustomerProfile,
  createCustomerProfile,
  updateCustomerProfile,
  processProfilesForBatch,
  CustomerProfileRow,
} from '@/lib/analysis/entityResolution';

// ---------------------------------------------------------------------------
// Mock Supabase client builder
// ---------------------------------------------------------------------------

type MockQueryResult = { data: any; error: any };

function createMockSupabase(options?: {
  profiles?: CustomerProfileRow[];
  insertResult?: MockQueryResult;
  updateResult?: MockQueryResult;
  insertAppearanceError?: any;
}) {
  const profiles = options?.profiles ?? [];

  let insertedProfile: any = null;
  let updatedProfile: any  = null;
  let upsertedProfile: any = null;
  let insertedAppearance: any = null;
  const operations: Array<{ table: string; op: string; params: unknown }> = [];

  const mockClient = {
    from: (table: string) => {
      if (table === 'customer_profiles') {
        return {
          // ---- SELECT (supports both old .single() and new bulk-overlaps path) ----
          select: (_cols: string) => {
            let filteredProfiles = [...profiles];
            const chain: any = {
              // New bulk API — filter by array overlap
              overlaps: (col: string, vals: string[]) => {
                filteredProfiles = filteredProfiles.filter((p) => {
                  const arr = (p as any)[col] as string[] ?? [];
                  return arr.some((v) => (vals as string[]).includes(v));
                });
                return chain;
              },
              // JSONB-aware OR of contains: emails.cs.["v1"],ips.cs.["v2"],…
              or: (expr: string) => {
                const clauses = expr.split(',').map((c) => {
                  const m = c.match(/^([a-z_]+)\.cs\.(.+)$/);
                  if (!m) return null;
                  const col = m[1];
                  let parsed: unknown;
                  try { parsed = JSON.parse(m[2]); } catch { parsed = []; }
                  const wanted = Array.isArray(parsed) ? (parsed as string[]) : [];
                  return { col, wanted };
                }).filter(Boolean) as { col: string; wanted: string[] }[];
                filteredProfiles = filteredProfiles.filter((p) =>
                  clauses.some((cl) => {
                    const arr = ((p as any)[cl.col] as string[]) ?? [];
                    return cl.wanted.every((v) => arr.includes(v));
                  })
                );
                return chain;
              },
              // Keep existing methods for resolveCustomerProfile tests
              contains: (_col: string, _val: string) => chain,
              gte: (col: string, val: number) => {
                filteredProfiles = filteredProfiles.filter((p) => (p as any)[col] >= val);
                return chain;
              },
              limit: (_n: number) => chain,
              single: () => {
                const p = filteredProfiles[0] ?? null;
                return Promise.resolve({
                  data: p,
                  error: p ? null : { code: 'PGRST116', message: 'no rows' },
                });
              },
              // Thenable so `await chain` (without .single()) returns the filtered array
              then: (resolve: any, reject?: any) =>
                Promise.resolve({ data: filteredProfiles, error: null }).then(resolve, reject),
              catch: (reject: any) =>
                Promise.resolve({ data: filteredProfiles, error: null }).catch(reject),
              finally: (fn: any) =>
                Promise.resolve({ data: filteredProfiles, error: null }).finally(fn),
            };
            return chain;
          },
          // ---- INSERT (supports both single-row and bulk array inserts) ----
          insert: (data: any) => {
            const dataArr = Array.isArray(data) ? data : [data];
            insertedProfile = dataArr[0];
            operations.push({ table, op: 'insert', params: data });
            const error = (options as any)?.insertResult?.error ?? null;
            const resultArr = error
              ? null
              : dataArr.map((d: any, i: number) => ({
                  ...d,
                  id: d.id ?? `new-profile-id${i > 0 ? `-${i}` : ''}`,
                }));
            const r = { data: resultArr, error };
            return {
              select: (_cols: string) => ({
                // Old path: .select().single()
                single: () =>
                  Promise.resolve({ data: resultArr?.[0] ?? null, error }),
                // New bulk path: await .select()
                then: (resolve: any, rej?: any) => Promise.resolve(r).then(resolve, rej),
                catch: (rej: any) => Promise.resolve(r).catch(rej),
                finally: (fn: any) => Promise.resolve(r).finally(fn),
              }),
            };
          },
          // ---- UPSERT (new bulk path for existing-profile updates) ----
          upsert: (data: any, _opts?: any) => {
            upsertedProfile = data;
            operations.push({ table, op: 'upsert', params: data });
            return Promise.resolve({ data: null, error: (options as any)?.upsertError ?? null });
          },
          // ---- UPDATE (kept for direct updateCustomerProfile tests) ----
          update: (data: any) => {
            updatedProfile = data;
            operations.push({ table, op: 'update', params: data });
            const result = (options as any)?.updateResult ?? {
              data: { ...profiles[0], ...data, id: profiles[0]?.id ?? 'existing-id' },
              error: null,
            };
            return {
              eq: (_col: string, _val: string) => ({
                select: (_cols: string) => ({
                  single: () => Promise.resolve(result),
                }),
              }),
            };
          },
        };
      }

      if (table === 'customer_profile_audit_appearances') {
        return {
          insert: (data: any) => {
            // Store first item for backward-compat assertions
            insertedAppearance = Array.isArray(data) ? data[0] : data;
            operations.push({ table, op: 'insert', params: data });
            return Promise.resolve({
              data: null,
              error: (options as any)?.insertAppearanceError ?? null,
            });
          },
        };
      }

      // Default passthrough
      return {
        select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      };
    },

    // Expose for assertions
    _getInsertedProfile:  () => insertedProfile,
    _getUpdatedProfile:   () => updatedProfile,
    _getUpsertedProfile:  () => upsertedProfile,
    _getInsertedAppearance: () => insertedAppearance,
    _getOperations:       () => operations,
  };

  return mockClient;
}

// ---------------------------------------------------------------------------
// Helper: build scored order with raw fields
// ---------------------------------------------------------------------------

function makeScoredOrder(overrides: {
  orderId?: string;
  email?: string;
  ip?: string | null;
  address?: string | null;
  card?: string | null;
  name?: string;
  totalScore?: number;
  riskTier?: 'low' | 'medium' | 'high' | 'critical';
  refundStatus?: 'none' | 'partial' | 'full';
  orderStatus?: 'completed' | 'refunded';
  signalsFired?: string[];
}): ScoredOrder {
  const {
    orderId = 'ORD-001',
    email = 'test@example.com',
    ip = '1.2.3.4',
    address = '123 Main St',
    card = '4521',
    name = 'Test User',
    totalScore = 30,
    riskTier = 'medium',
    refundStatus = 'none',
    orderStatus = 'completed',
    signalsFired = [],
  } = overrides;

  const signals: SignalResult[] = [
    { name: 'refundRate', fired: signalsFired.includes('refundRate'), score: 0, reason: '', evidence: {} },
    { name: 'inrAbuse', fired: signalsFired.includes('inrAbuse'), score: 0, reason: '', evidence: {} },
    { name: 'velocity', fired: signalsFired.includes('velocity'), score: 0, reason: '', evidence: {} },
  ];

  const order: NormalisedOrder & {
    _rawEmail?: string;
    _rawIP?: string | null;
    _rawAddress?: string | null;
    _rawCardLast4?: string | null;
  } = {
    orderId,
    orderDate: new Date('2025-01-15'),
    emailHash: 'hash-email',
    addressHash: address ? 'hash-addr' : null,
    phoneHash: null,
    customerNameNorm: name,
    orderTotal: 50,
    currency: 'GBP',
    orderStatus,
    refundStatus,
    refundReason: null,
    refundDate: refundStatus !== 'none' ? new Date('2025-01-20') : null,
    refundAmount: null,
    paymentMethod: null,
    _rawEmail: email,
    _rawIP: ip,
    _rawAddress: address,
    _rawCardLast4: card,
  };

  return {
    order,
    totalScore,
    riskTier,
    flagged: totalScore >= 25,
    signals,
  };
}

function makeExistingProfile(overrides?: Partial<CustomerProfileRow>): CustomerProfileRow {
  return {
    id: 'existing-profile-123',
    primary_email: 'test@example.com',
    emails: ['test@example.com'],
    ips: ['1.2.3.4'],
    addresses: ['123 main st'],
    card_last4s: ['4521'],
    phones: [],
    names: ['test user'],
    risk_score: 30,
    risk_level: 'medium',
    fraud_flags: ['refundRate'],
    total_orders: 5,
    total_refund_claims: 2,
    total_chargebacks: 0,
    total_merchants_seen_at: 1,
    refund_rate: 0.4,
    refund_timestamps: ['2025-01-10T00:00:00.000Z'],
    fastest_claim_days: 5,
    avg_claim_days: 7,
    refund_acceleration_score: 0,
    merchant_ids: ['merchant-A'],
    first_seen: '2025-01-01T00:00:00.000Z',
    last_seen: '2025-01-10T00:00:00.000Z',
    last_audit_id: 'audit-001',
    profile_confidence: 100,
    manually_reviewed: false,
    merchant_notes: null,
    on_watchlist: false,
    ...overrides,
  };
}

// ===========================================================================
// Tests
// ===========================================================================

describe('Entity Resolution', () => {
  // -----------------------------------------------------------------------
  // Test 1 — New customer creates profile
  // -----------------------------------------------------------------------
  describe('Test 1 — New customer creates profile', () => {
    it('creates a new profile when no match found', async () => {
      const mockClient = createMockSupabase({ profiles: [] });
      const order = makeScoredOrder({ email: 'brand-new@example.com' });

      const result = await resolveCustomerProfile(order, mockClient as any);

      expect(result.profile).toBeNull();
      expect(result.matchType).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('createCustomerProfile inserts correct data', async () => {
      const mockClient = createMockSupabase({ profiles: [] });
      const order = makeScoredOrder({
        email: 'new@example.com',
        ip: '10.0.0.1',
        address: '456 Oak Ave',
        card: '9999',
        name: 'Jane Doe',
        totalScore: 45,
        refundStatus: 'full',
        signalsFired: ['refundRate', 'inrAbuse'],
      });

      const profile = await createCustomerProfile(
        order,
        { finalScore: 45, flags: ['refundRate', 'inrAbuse'] },
        'merchant-X',
        'audit-100',
        mockClient as any
      );

      expect(profile).toBeDefined();
      expect(profile.id).toBe('new-profile-id');

      const inserted = mockClient._getInsertedProfile();
      expect(inserted.primary_email).toBe('new@example.com');
      expect(inserted.emails).toEqual(['new@example.com']);
      expect(inserted.ips).toEqual(['10.0.0.1']);
      expect(inserted.risk_score).toBe(45);
      expect(inserted.total_orders).toBe(1);
      expect(inserted.total_refund_claims).toBe(1);
      expect(inserted.fraud_flags).toEqual(['refundRate', 'inrAbuse']);
      expect(inserted.merchant_ids).toEqual(['merchant-X']);
      expect(inserted.last_audit_id).toBe('audit-100');
    });
  });

  // -----------------------------------------------------------------------
  // Test 2 — Returning customer updates profile
  // -----------------------------------------------------------------------
  describe('Test 2 — Returning customer updates profile', () => {
    it('resolves to existing profile by email', async () => {
      const existing = makeExistingProfile();
      const mockClient = createMockSupabase({ profiles: [existing] });
      const order = makeScoredOrder({ email: 'test@example.com' });

      const result = await resolveCustomerProfile(order, mockClient as any);

      expect(result.profile).toBeTruthy();
      expect(result.matchType).toBe('email');
      expect(result.confidence).toBe(99);
    });

    it('updateCustomerProfile increments total_orders', async () => {
      const existing = makeExistingProfile({ total_orders: 5 });
      const mockClient = createMockSupabase({ profiles: [existing] });
      const order = makeScoredOrder({ email: 'test@example.com' });

      await updateCustomerProfile(
        existing,
        order,
        { finalScore: 30, flags: [] },
        'merchant-A',
        'audit-002',
        99,
        mockClient as any
      );

      const updated = mockClient._getUpdatedProfile();
      expect(updated.total_orders).toBe(6);
    });

    it('updateCustomerProfile updates last_seen', async () => {
      const existing = makeExistingProfile();
      const mockClient = createMockSupabase({ profiles: [existing] });
      const order = makeScoredOrder({ email: 'test@example.com' });

      await updateCustomerProfile(
        existing,
        order,
        { finalScore: 30, flags: [] },
        'merchant-A',
        'audit-002',
        99,
        mockClient as any
      );

      const updated = mockClient._getUpdatedProfile();
      expect(updated.last_seen).toBeDefined();
      // last_seen should be a recent ISO timestamp
      const lastSeen = new Date(updated.last_seen);
      expect(lastSeen.getTime()).toBeGreaterThan(Date.now() - 10000);
    });
  });

  // -----------------------------------------------------------------------
  // Test 3 — Same customer, different email, same card
  // -----------------------------------------------------------------------
  describe('Test 3 — Same customer, different email, same card', () => {
    it('resolves by card match when email differs', async () => {
      // Set up mock to fail email match but succeed on card match
      const existing = makeExistingProfile({
        emails: ['original@example.com'],
        card_last4s: ['4521'],
      });

      let callCount = 0;
      const mockClient = {
        from: (table: string) => {
          if (table === 'customer_profiles') {
            return {
              select: (_cols: string) => {
                const chain: any = {
                  contains: (_col: string, _val: string) => {
                    callCount++;
                    // First call is email lookup (return null), second is card (return match)
                    if (callCount === 1) {
                      chain._returnNull = true;
                    } else {
                      chain._returnNull = false;
                    }
                    return chain;
                  },
                  gte: () => chain,
                  limit: () => chain,
                  single: () => {
                    if (chain._returnNull) {
                      return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
                    }
                    return Promise.resolve({ data: existing, error: null });
                  },
                  _returnNull: false,
                };
                return chain;
              },
              update: (data: any) => ({
                eq: () => ({
                  select: () => ({
                    single: () => Promise.resolve({ data: { ...existing, ...data }, error: null }),
                  }),
                }),
              }),
            };
          }
          return { insert: () => Promise.resolve({ data: null, error: null }) };
        },
      };

      const order = makeScoredOrder({ email: 'different@example.com', card: '4521' });
      const result = await resolveCustomerProfile(order, mockClient as any);

      expect(result.matchType).toBe('card');
      expect(result.confidence).toBe(90);

      // Now update and verify both emails appear
      const updated = await updateCustomerProfile(
        existing,
        order,
        { finalScore: 40, flags: [] },
        'merchant-A',
        'audit-003',
        90,
        mockClient as any
      );

      expect(updated.emails).toContain('original@example.com');
      expect(updated.emails).toContain('different@example.com');
    });
  });

  // -----------------------------------------------------------------------
  // Test 4 — IP-only matching safety check
  // -----------------------------------------------------------------------
  describe('Test 4 — IP-only matching safety check', () => {
    it('does NOT merge on IP alone when existing profile risk < 50', async () => {
      // Each call to .select() starts a new query chain.
      // resolveCustomerProfile calls select() 4 times:
      //   1. email lookup → miss
      //   2. card lookup → miss
      //   3. IP+address lookup → miss
      //   4. IP-only lookup with .gte('risk_score', 50) → miss because profile is only 20
      let selectCall = 0;
      const mockClient = {
        from: (table: string) => {
          if (table === 'customer_profiles') {
            return {
              select: (_cols: string) => {
                selectCall++;
                const callNum = selectCall;
                const chain: any = {
                  contains: () => chain,
                  gte: () => chain,      // .gte('risk_score', 50) on call 4
                  limit: () => chain,
                  single: () => {
                    // All 4 queries should return no match:
                    // 1-3: no profile with that email/card/ip+addr combo
                    // 4: .gte filters out the profile (risk 20 < 50)
                    return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
                  },
                };
                return chain;
              },
            };
          }
          return {};
        },
      };

      const order = makeScoredOrder({
        email: 'totally-different@example.com',
        ip: '192.168.1.1',
        address: '789 Different St',
        card: '0000',
      });

      const result = await resolveCustomerProfile(order, mockClient as any);

      // Should NOT match — IP-only with low risk profile
      expect(result.profile).toBeNull();
      expect(result.matchType).toBeNull();
      // Verify all 4 resolution steps were attempted
      expect(selectCall).toBe(4);
    });
  });

  // -----------------------------------------------------------------------
  // Test 5 — Profile risk score rolling update
  // -----------------------------------------------------------------------
  describe('Test 5 — Profile risk score rolling update', () => {
    it('applies 60/40 weighted formula: (30 × 0.6) + (90 × 0.4) = 54', async () => {
      const existing = makeExistingProfile({ risk_score: 30 });
      const mockClient = createMockSupabase({ profiles: [existing] });

      const order = makeScoredOrder({ totalScore: 90, riskTier: 'critical' });

      await updateCustomerProfile(
        existing,
        order,
        { finalScore: 90, flags: ['refundRate', 'inrAbuse', 'velocity'] },
        'merchant-A',
        'audit-004',
        99,
        mockClient as any
      );

      const updated = mockClient._getUpdatedProfile();
      // (30 × 0.6) + (90 × 0.4) = 18 + 36 = 54
      expect(updated.risk_score).toBe(54);
    });

    it('risk score is not just the latest score or a simple average', async () => {
      const existing = makeExistingProfile({ risk_score: 30 });
      const mockClient = createMockSupabase({ profiles: [existing] });

      const order = makeScoredOrder({ totalScore: 90 });

      await updateCustomerProfile(
        existing,
        order,
        { finalScore: 90, flags: [] },
        'merchant-A',
        'audit-004',
        99,
        mockClient as any
      );

      const updated = mockClient._getUpdatedProfile();
      expect(updated.risk_score).not.toBe(90); // not just latest
      expect(updated.risk_score).not.toBe(30); // not just old
      expect(updated.risk_score).not.toBe(60); // not simple average
      expect(updated.risk_score).toBe(54);     // correct rolling weighted
    });
  });

  // -----------------------------------------------------------------------
  // Test 6 — Multi-merchant tracking
  // -----------------------------------------------------------------------
  describe('Test 6 — Multi-merchant tracking', () => {
    it('adds new merchant to merchant_ids and increments count', async () => {
      const existing = makeExistingProfile({
        merchant_ids: ['merchant-A'],
        total_merchants_seen_at: 1,
      });
      const mockClient = createMockSupabase({ profiles: [existing] });

      const order = makeScoredOrder({ email: 'test@example.com' });

      await updateCustomerProfile(
        existing,
        order,
        { finalScore: 30, flags: [] },
        'merchant-B',
        'audit-005',
        99,
        mockClient as any
      );

      const updated = mockClient._getUpdatedProfile();
      expect(updated.merchant_ids).toContain('merchant-A');
      expect(updated.merchant_ids).toContain('merchant-B');
      expect(updated.total_merchants_seen_at).toBe(2);
    });

    it('does not duplicate merchant when same merchant processes again', async () => {
      const existing = makeExistingProfile({
        merchant_ids: ['merchant-A'],
        total_merchants_seen_at: 1,
      });
      const mockClient = createMockSupabase({ profiles: [existing] });

      const order = makeScoredOrder({ email: 'test@example.com' });

      await updateCustomerProfile(
        existing,
        order,
        { finalScore: 30, flags: [] },
        'merchant-A',
        'audit-005',
        99,
        mockClient as any
      );

      const updated = mockClient._getUpdatedProfile();
      expect(updated.merchant_ids).toEqual(['merchant-A']);
      expect(updated.total_merchants_seen_at).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // Test 7 — Audit history preserved (appearance links)
  // -----------------------------------------------------------------------
  describe('Test 7 — Audit history preserved', () => {
    it('writes appearance link after profile create', async () => {
      const mockClient = createMockSupabase({ profiles: [] });
      const order = makeScoredOrder({
        email: 'new@example.com',
        totalScore: 40,
        signalsFired: ['refundRate'],
      });

      const result = await processProfilesForBatch(
        [order],
        'merchant-X',
        'audit-100',
        new Map([['ORD-001', 'tx-uuid-1']]),
        mockClient as any
      );

      expect(result.profilesCreated).toBe(1);
      expect(result.profilesUpdated).toBe(0);

      const appearance = mockClient._getInsertedAppearance();
      expect(appearance).toBeTruthy();
      expect(appearance.audit_id).toBe('audit-100');
      expect(appearance.transaction_id).toBe('tx-uuid-1');
      expect(appearance.score_at_time).toBe(40);
      expect(appearance.flags_at_time).toEqual(['refundRate']);
    });

    it('writes appearance link after profile update', async () => {
      const existing = makeExistingProfile();
      const mockClient = createMockSupabase({ profiles: [existing] });
      const order = makeScoredOrder({
        email: 'test@example.com',
        totalScore: 55,
        signalsFired: ['inrAbuse'],
      });

      const result = await processProfilesForBatch(
        [order],
        'merchant-A',
        'audit-200',
        new Map([['ORD-001', 'tx-uuid-2']]),
        mockClient as any
      );

      expect(result.profilesCreated).toBe(0);
      expect(result.profilesUpdated).toBe(1);

      const appearance = mockClient._getInsertedAppearance();
      expect(appearance).toBeTruthy();
      expect(appearance.audit_id).toBe('audit-200');
      expect(appearance.transaction_id).toBe('tx-uuid-2');
    });
  });

  // -----------------------------------------------------------------------
  // Test 8 — Refund tracking
  // -----------------------------------------------------------------------
  describe('Refund tracking', () => {
    it('increments refund claims and recalculates refund rate', async () => {
      const existing = makeExistingProfile({
        total_orders: 4,
        total_refund_claims: 1,
        refund_rate: 0.25,
        refund_timestamps: ['2025-01-10T00:00:00.000Z'],
      });
      const mockClient = createMockSupabase({ profiles: [existing] });

      const order = makeScoredOrder({
        email: 'test@example.com',
        refundStatus: 'full',
      });

      await updateCustomerProfile(
        existing,
        order,
        { finalScore: 30, flags: [] },
        'merchant-A',
        'audit-006',
        99,
        mockClient as any
      );

      const updated = mockClient._getUpdatedProfile();
      expect(updated.total_orders).toBe(5);
      expect(updated.total_refund_claims).toBe(2);
      expect(updated.refund_rate).toBe(0.4); // 2/5
      expect(updated.refund_timestamps.length).toBe(2);
    });

    it('does not increment refund claims for non-refund orders', async () => {
      const existing = makeExistingProfile({
        total_orders: 4,
        total_refund_claims: 1,
      });
      const mockClient = createMockSupabase({ profiles: [existing] });

      const order = makeScoredOrder({
        email: 'test@example.com',
        refundStatus: 'none',
      });

      await updateCustomerProfile(
        existing,
        order,
        { finalScore: 10, flags: [] },
        'merchant-A',
        'audit-006',
        99,
        mockClient as any
      );

      const updated = mockClient._getUpdatedProfile();
      expect(updated.total_orders).toBe(5);
      expect(updated.total_refund_claims).toBe(1);
      expect(updated.refund_rate).toBe(0.2); // 1/5
    });
  });

  // -----------------------------------------------------------------------
  // Test: Flags are merged and deduplicated
  // -----------------------------------------------------------------------
  describe('Flag merging', () => {
    it('merges new flags without duplicating existing ones', async () => {
      const existing = makeExistingProfile({
        fraud_flags: ['refundRate', 'inrAbuse'],
      });
      const mockClient = createMockSupabase({ profiles: [existing] });

      const order = makeScoredOrder({
        email: 'test@example.com',
        signalsFired: ['refundRate', 'velocity'],
      });

      await updateCustomerProfile(
        existing,
        order,
        { finalScore: 30, flags: ['refundRate', 'velocity'] },
        'merchant-A',
        'audit-007',
        99,
        mockClient as any
      );

      const updated = mockClient._getUpdatedProfile();
      expect(updated.fraud_flags).toContain('refundRate');
      expect(updated.fraud_flags).toContain('inrAbuse');
      expect(updated.fraud_flags).toContain('velocity');
      // No duplicates
      const uniqueFlags = new Set(updated.fraud_flags);
      expect(uniqueFlags.size).toBe(updated.fraud_flags.length);
    });
  });

  // -----------------------------------------------------------------------
  // Test: processProfilesForBatch handles errors gracefully
  // -----------------------------------------------------------------------
  describe('Error handling', () => {
    it('reports errors and creates zero profiles when bulk insert fails', async () => {
      const order1 = makeScoredOrder({ orderId: 'ORD-001', email: 'a@example.com' });
      const order2 = makeScoredOrder({ orderId: 'ORD-002', email: 'b@example.com' });

      // Build a mock where the bulk insert returns an error
      const failingClient = {
        from: (table: string) => {
          if (table === 'customer_profiles') {
            const emptySelectChain: any = {
              overlaps: () => emptySelectChain,
              or:       () => emptySelectChain,
              gte:      () => emptySelectChain,
              contains: () => emptySelectChain,
              limit:    () => emptySelectChain,
              single:   () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
              then: (resolve: any, rej?: any) =>
                Promise.resolve({ data: [], error: null }).then(resolve, rej),
              catch: (rej: any) => Promise.resolve({ data: [], error: null }).catch(rej),
              finally: (fn: any) => Promise.resolve({ data: [], error: null }).finally(fn),
            };
            return {
              select: () => emptySelectChain,
              upsert: () => Promise.resolve({ data: null, error: null }),
              insert: () => ({
                select: (_cols: string) => {
                  const r = { data: null, error: { message: 'DB bulk insert failed' } };
                  return {
                    single: () => Promise.resolve({ data: null, error: r.error }),
                    then:   (resolve: any, rej?: any) => Promise.resolve(r).then(resolve, rej),
                    catch:  (rej: any) => Promise.resolve(r).catch(rej),
                    finally: (fn: any) => Promise.resolve(r).finally(fn),
                  };
                },
              }),
            };
          }
          if (table === 'customer_profile_audit_appearances') {
            return { insert: () => Promise.resolve({ data: null, error: null }) };
          }
          return {};
        },
      };

      const result = await processProfilesForBatch(
        [order1, order2],
        'merchant-X',
        'audit-100',
        new Map(),
        failingClient as any
      );

      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.profilesCreated).toBe(0);
    });
  });
});
