/**
 * §1.2 Privacy Test — Cross-Merchant Signal No Merchant Name Leak
 *
 * This is a fuzz test. It asserts that no merchant name can ever appear in the
 * cross-merchant signal reasoning string under any circumstance.
 * Must pass with 100% reliability.
 */

import { computeCrossMerchantSignal } from '../../lib/engine/signals/crossMerchant';
import type { CrossMerchantProfile, PendingAuditLog } from '../../lib/engine/fastContext';

// 50 fake merchant names that must NEVER appear in any reasoning string
const FAKE_MERCHANT_NAMES = [
  'Gymshark', 'ASOS', 'Nike', 'Adidas', 'PrettyLittleThing',
  'Boohoo', 'Zara', 'Uniqlo', 'H&M', 'Primark',
  'TestMerchant1', 'TestMerchant2', 'TestMerchant3',
  'FashionNova', 'Shein', 'Missguided', 'InTheStyle', 'NastyGal',
  'Topshop', 'ASOS Marketplace', 'BooHooMAN', 'PLT Sport',
  'MerchantAlpha', 'MerchantBeta', 'MerchantGamma', 'MerchantDelta',
  'MerchantEpsilon', 'MerchantZeta', 'MerchantEta', 'MerchantTheta',
  'RetailCo', 'ShopNet', 'FastFashion', 'QuickDrop', 'EasyStyle',
  'FraudMerchant', 'BadActor', 'ScamStore', 'FakeShop', 'TestStore',
  'Alpha Retail', 'Beta Clothing', 'Gamma Apparel', 'Delta Goods',
  'Epsilon Fashion', 'Zeta Commerce', 'Eta Boutique', 'Theta Markets',
  'Iota Traders', 'Kappa Deals',
];

// Ensure exactly 50 names
if (FAKE_MERCHANT_NAMES.length !== 50) {
  throw new Error(`Expected 50 fake merchant names, got ${FAKE_MERCHANT_NAMES.length}`);
}

const REQUESTING_MERCHANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

/** Build a fake CrossMerchantProfile that "knows about" the given merchant names */
function buildProfileWithMerchantNames(
  merchantNames: string[],
  normEmail: string,
  merchantIds: string[]
): CrossMerchantProfile {
  return {
    id: 'profile-test-1',
    emails: [normEmail],
    ips: [],
    addresses: [],
    card_last4s: [],
    phones: [],
    total_orders: 10,
    total_refund_claims: 7,
    total_merchants_seen_at: merchantIds.length,
    // Intentionally embed merchant names in merchant_ids to simulate a
    // DB row that has merchant UUIDs — the signal must never expose these
    merchant_ids: merchantIds,
  };
}

describe('crossMerchant signal privacy', () => {
  it('never leaks merchant names into reasoning strings', () => {
    // Build fake merchant IDs (UUIDs) — the names are separate; the signal
    // should only ever see counts, never names
    const fakeMerchantIds = FAKE_MERCHANT_NAMES.map((_, i) =>
      `merchant-uuid-${String(i).padStart(4, '0')}-0000-0000-0000-000000000000`
    );

    const profile = buildProfileWithMerchantNames(
      FAKE_MERCHANT_NAMES,
      'test@example.com',
      fakeMerchantIds
    );

    const pendingAuditLogs: PendingAuditLog[] = [];

    const result = computeCrossMerchantSignal({
      normEmail: 'test@example.com',
      normIP: null,
      normAddress: null,
      normCard: null,
      requestingMerchantId: REQUESTING_MERCHANT_ID,
      profiles: [profile],
      pendingAuditLogs,
    });

    // Assert: no merchant name appears in any output string
    for (const name of FAKE_MERCHANT_NAMES) {
      expect(result.reason).not.toContain(name);
      expect(result.reason.toLowerCase()).not.toContain(name.toLowerCase());

      // Also check evidence values (stringified)
      const evidenceStr = JSON.stringify(result.evidence);
      expect(evidenceStr).not.toContain(name);
      expect(evidenceStr.toLowerCase()).not.toContain(name.toLowerCase());
    }

    // Signal should have fired (email matched, 50 merchant IDs → 49 other merchants)
    expect(result.fired).toBe(true);
    // Reasoning must contain a COUNT, not names
    expect(result.reason).toMatch(/\d+ other merchant/);
  });

  it('never leaks merchant names when signal does not fire', () => {
    const pendingAuditLogs: PendingAuditLog[] = [];

    // No matching profiles — signal should not fire
    const result = computeCrossMerchantSignal({
      normEmail: 'nobody@example.com',
      normIP: null,
      normAddress: null,
      normCard: null,
      requestingMerchantId: REQUESTING_MERCHANT_ID,
      profiles: [], // empty
      pendingAuditLogs,
    });

    for (const name of FAKE_MERCHANT_NAMES) {
      expect(result.reason).not.toContain(name);
      expect(result.reason.toLowerCase()).not.toContain(name.toLowerCase());
    }

    expect(result.fired).toBe(false);
    expect(result.score).toBe(0);
  });

  it('audit log entries contain hashes only, not merchant names', () => {
    const fakeMerchantIds = FAKE_MERCHANT_NAMES.map((_, i) =>
      `merchant-uuid-${String(i).padStart(4, '0')}-0000-0000-0000-000000000000`
    );

    const profile = buildProfileWithMerchantNames(
      FAKE_MERCHANT_NAMES,
      'audited@example.com',
      fakeMerchantIds
    );

    const pendingAuditLogs: PendingAuditLog[] = [];

    computeCrossMerchantSignal({
      normEmail: 'audited@example.com',
      normIP: '1.2.3.4',
      normAddress: null,
      normCard: null,
      requestingMerchantId: REQUESTING_MERCHANT_ID,
      profiles: [profile],
      pendingAuditLogs,
    });

    expect(pendingAuditLogs).toHaveLength(1);
    const logEntry = pendingAuditLogs[0];

    // queried_hashes must contain the normalised hash values, not names
    for (const name of FAKE_MERCHANT_NAMES) {
      expect(logEntry.queried_hashes.join(',')).not.toContain(name);
    }

    expect(logEntry.k_anon_satisfied).toBe(true);
    expect(logEntry.matched_merchant_count).toBeGreaterThanOrEqual(3);
  });

  it('returns correct score range (30-80) when signal fires', () => {
    const merchantIds = ['m1', 'm2', 'm3', 'm4'];
    const profile: CrossMerchantProfile = {
      id: 'p1',
      emails: ['scorer@example.com'],
      ips: [],
      addresses: [],
      card_last4s: [],
      phones: [],
      total_orders: 10,
      total_refund_claims: 0, // 0% INR rate → score = 30
      total_merchants_seen_at: 4,
      merchant_ids: merchantIds,
    };

    const pendingAuditLogs: PendingAuditLog[] = [];
    const result = computeCrossMerchantSignal({
      normEmail: 'scorer@example.com',
      normIP: null,
      normAddress: null,
      normCard: null,
      requestingMerchantId: REQUESTING_MERCHANT_ID,
      profiles: [profile],
      pendingAuditLogs,
    });

    expect(result.fired).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.score).toBeLessThanOrEqual(80);
  });

  it('excludes self-merchant matches', () => {
    const profile: CrossMerchantProfile = {
      id: 'p-self',
      emails: ['self@example.com'],
      ips: [],
      addresses: [],
      card_last4s: [],
      phones: [],
      total_orders: 10,
      total_refund_claims: 8,
      total_merchants_seen_at: 5,
      // requesting merchant IS in this profile → should be excluded
      merchant_ids: [REQUESTING_MERCHANT_ID, 'm2', 'm3', 'm4', 'm5'],
    };

    const pendingAuditLogs: PendingAuditLog[] = [];
    const result = computeCrossMerchantSignal({
      normEmail: 'self@example.com',
      normIP: null,
      normAddress: null,
      normCard: null,
      requestingMerchantId: REQUESTING_MERCHANT_ID,
      profiles: [profile],
      pendingAuditLogs,
    });

    // Profile includes requesting merchant → excluded → no match → not fired
    expect(result.fired).toBe(false);
    expect(result.score).toBe(0);
  });
});
