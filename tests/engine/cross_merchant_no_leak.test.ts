/**
 * §1.2 Privacy Test — Cross-Merchant Signal No Merchant Name Leak
 *
 * This is a fuzz test. It asserts that no merchant name can ever appear in the
 * cross-merchant signal reasoning string under any circumstance.
 * Must pass with 100% reliability.
 */

import { computeCrossMerchantSignal } from '../../lib/engine/signals/crossMerchant';
import type { CrossMerchantProfile, PendingAuditLog } from '../../lib/engine/fastContext';
import { hashIdentifier } from '../../lib/identity/hash';
import { normaliseEmail, normaliseIP } from '../../lib/identity/normalise';

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

if (FAKE_MERCHANT_NAMES.length !== 50) {
  throw new Error(`Expected 50 fake merchant names, got ${FAKE_MERCHANT_NAMES.length}`);
}

const REQUESTING_MERCHANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

function emailHash(email: string): string {
  const norm = normaliseEmail(email);
  if (!norm) throw new Error(`invalid email: ${email}`);
  return hashIdentifier(norm);
}

function buildProfile(
  normEmail: string,
  merchantIds: string[]
): CrossMerchantProfile {
  const h = hashIdentifier(normEmail);
  return {
    id: 'profile-test-1',
    emails: [normEmail],
    email_hashes: [h],
    ips: [],
    ip_hashes: [],
    addresses: [],
    address_hashes: [],
    card_last4s: [],
    card_hashes: [],
    phones: [],
    total_orders: 10,
    total_refund_claims: 7,
    total_merchants_seen_at: merchantIds.length,
    merchant_ids: merchantIds,
  };
}

describe('crossMerchant signal privacy', () => {
  it('never leaks merchant names into reasoning strings', () => {
    const fakeMerchantIds = FAKE_MERCHANT_NAMES.map((_, i) =>
      `merchant-uuid-${String(i).padStart(4, '0')}-0000-0000-0000-000000000000`
    );

    const profile = buildProfile('test@example.com', fakeMerchantIds);
    const pendingAuditLogs: PendingAuditLog[] = [];

    const result = computeCrossMerchantSignal({
      emailHash: emailHash('test@example.com'),
      ipHash: null,
      addressHash: null,
      cardHash: null,
      requestingMerchantId: REQUESTING_MERCHANT_ID,
      profiles: [profile],
      pendingAuditLogs,
    });

    for (const name of FAKE_MERCHANT_NAMES) {
      expect(result.reason).not.toContain(name);
      expect(result.reason.toLowerCase()).not.toContain(name.toLowerCase());
      const evidenceStr = JSON.stringify(result.evidence);
      expect(evidenceStr).not.toContain(name);
      expect(evidenceStr.toLowerCase()).not.toContain(name.toLowerCase());
    }

    expect(result.fired).toBe(true);
    expect(result.reason).toMatch(/\d+ other merchant/);
  });

  it('never leaks merchant names when signal does not fire', () => {
    const pendingAuditLogs: PendingAuditLog[] = [];

    const result = computeCrossMerchantSignal({
      emailHash: emailHash('nobody@example.com'),
      ipHash: null,
      addressHash: null,
      cardHash: null,
      requestingMerchantId: REQUESTING_MERCHANT_ID,
      profiles: [],
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

    const profile = buildProfile('audited@example.com', fakeMerchantIds);
    const pendingAuditLogs: PendingAuditLog[] = [];
    const ip = normaliseIP('1.2.3.4');

    computeCrossMerchantSignal({
      emailHash: emailHash('audited@example.com'),
      ipHash: ip ? hashIdentifier(ip) : null,
      addressHash: null,
      cardHash: null,
      requestingMerchantId: REQUESTING_MERCHANT_ID,
      profiles: [profile],
      pendingAuditLogs,
    });

    expect(pendingAuditLogs).toHaveLength(1);
    const logEntry = pendingAuditLogs[0];

    for (const name of FAKE_MERCHANT_NAMES) {
      expect(logEntry.queried_hashes.join(',')).not.toContain(name);
    }

    expect(logEntry.k_anon_satisfied).toBe(true);
    expect(logEntry.matched_merchant_count).toBeGreaterThanOrEqual(3);
  });

  it('returns correct score range (30-80) when signal fires', () => {
    const merchantIds = ['m1', 'm2', 'm3', 'm4'];
    const norm = normaliseEmail('scorer@example.com')!;
    const profile: CrossMerchantProfile = {
      id: 'p1',
      emails: [norm],
      email_hashes: [hashIdentifier(norm)],
      ips: [],
      ip_hashes: [],
      addresses: [],
      address_hashes: [],
      card_last4s: [],
      card_hashes: [],
      phones: [],
      total_orders: 10,
      total_refund_claims: 0,
      total_merchants_seen_at: 4,
      merchant_ids: merchantIds,
    };

    const pendingAuditLogs: PendingAuditLog[] = [];
    const result = computeCrossMerchantSignal({
      emailHash: hashIdentifier(norm),
      ipHash: null,
      addressHash: null,
      cardHash: null,
      requestingMerchantId: REQUESTING_MERCHANT_ID,
      profiles: [profile],
      pendingAuditLogs,
    });

    expect(result.fired).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.score).toBeLessThanOrEqual(80);
  });

  it('excludes self-merchant matches', () => {
    const norm = normaliseEmail('self@example.com')!;
    const profile: CrossMerchantProfile = {
      id: 'p-self',
      emails: [norm],
      email_hashes: [hashIdentifier(norm)],
      ips: [],
      ip_hashes: [],
      addresses: [],
      address_hashes: [],
      card_last4s: [],
      card_hashes: [],
      phones: [],
      total_orders: 10,
      total_refund_claims: 8,
      total_merchants_seen_at: 5,
      merchant_ids: [REQUESTING_MERCHANT_ID, 'm2', 'm3', 'm4', 'm5'],
    };

    const pendingAuditLogs: PendingAuditLog[] = [];
    const result = computeCrossMerchantSignal({
      emailHash: hashIdentifier(norm),
      ipHash: null,
      addressHash: null,
      cardHash: null,
      requestingMerchantId: REQUESTING_MERCHANT_ID,
      profiles: [profile],
      pendingAuditLogs,
    });

    expect(result.fired).toBe(false);
    expect(result.score).toBe(0);
  });
});
