/**
 * Tests the fixture tool's own safety logic (scripts/dev/integrationHealthFixture.ts)
 * — validation, mutation-plan construction, and restore-plan construction —
 * without connecting to a real database. Nothing here reimplements the
 * tool's logic; every assertion calls the tool's real exported functions.
 */
import {
  ALLOWED_MERCHANT_IDS,
  SUPPORTED_PROVIDERS,
  SUPPORTED_STATES,
  assertAllowedMerchant,
  assertSupportedProvider,
  assertSupportedState,
  buildApplyPlan,
  buildRestorePlan,
  forComparison,
  isProductionEnvironment,
  legacyRowFieldsForState,
  parseArgs,
  redact,
  rowsMatchForRestore,
  type Provider,
  type Snapshot,
} from '@/scripts/dev/integrationHealthFixture';

const MERCHANT = [...ALLOWED_MERCHANT_IDS][0];
const NOW = new Date('2026-07-17T00:00:00.000Z');

describe('isProductionEnvironment — refuses production', () => {
  it.each([
    { NODE_ENV: 'production' },
    { VERCEL_ENV: 'production' },
    { NODE_ENV: 'production', VERCEL_ENV: 'preview' },
  ])('is true for %p', (env) => {
    expect(isProductionEnvironment(env)).toBe(true);
  });

  it.each([{}, { NODE_ENV: 'development' }, { NODE_ENV: 'test' }, { VERCEL_ENV: 'preview' }])(
    'is false for %p',
    (env) => {
      expect(isProductionEnvironment(env)).toBe(false);
    },
  );
});

describe('assertAllowedMerchant — refuses unapproved merchant ids', () => {
  it('throws when merchant is undefined (explicit input required)', () => {
    expect(() => assertAllowedMerchant(undefined)).toThrow('--merchant is required');
  });

  it('throws for a merchant id not in the allowlist', () => {
    expect(() => assertAllowedMerchant('11111111-1111-1111-1111-111111111111')).toThrow('not in ALLOWED_MERCHANT_IDS');
  });

  it('does not accept a display name in place of an id', () => {
    expect(() => assertAllowedMerchant('Elara and Co')).toThrow('not in ALLOWED_MERCHANT_IDS');
    expect(() => assertAllowedMerchant('demo@unauth.app')).toThrow('not in ALLOWED_MERCHANT_IDS');
  });

  it('passes for the one allowlisted merchant id', () => {
    expect(() => assertAllowedMerchant(MERCHANT)).not.toThrow();
  });
});

describe('assertSupportedProvider / assertSupportedState — fail closed', () => {
  it('throws when provider is undefined', () => {
    expect(() => assertSupportedProvider(undefined)).toThrow('--provider must be one of');
  });

  it('throws for an unsupported provider', () => {
    expect(() => assertSupportedProvider('zendesk' as Provider)).toThrow('--provider must be one of');
  });

  it.each(SUPPORTED_PROVIDERS)('accepts %s', (provider) => {
    expect(() => assertSupportedProvider(provider)).not.toThrow();
  });

  it('throws when state is undefined', () => {
    expect(() => assertSupportedState(undefined)).toThrow('--state must be one of');
  });

  it('throws for an unsupported state', () => {
    expect(() => assertSupportedState('made_up_state' as never)).toThrow('--state must be one of');
  });

  it.each(SUPPORTED_STATES)('accepts %s', (state) => {
    expect(() => assertSupportedState(state)).not.toThrow();
  });
});

describe('parseArgs — requires every flag explicitly, no defaults', () => {
  it('returns undefined for any flag not passed', () => {
    expect(parseArgs(['apply'])).toEqual({ command: 'apply', merchant: undefined, provider: undefined, state: undefined });
  });

  it('reads exactly the flags provided, regardless of order', () => {
    expect(parseArgs(['apply', '--state', 'stale', '--merchant', 'm1', '--provider', 'gorgias'])).toEqual({
      command: 'apply',
      merchant: 'm1',
      provider: 'gorgias',
      state: 'stale',
    });
  });
});

describe('redact / forComparison — never leak secrets, only ignore server-managed columns', () => {
  it('redacts every known secret column', () => {
    const row = { id: '1', credentials_encrypted: 'super-secret', access_token_encrypted: 'also-secret', webhook_secret_hash: 'hash', status: 'connected' };
    expect(redact(row)).toEqual({ id: '1', credentials_encrypted: '[redacted]', access_token_encrypted: '[redacted]', webhook_secret_hash: '[redacted]', status: 'connected' });
  });

  it('passes null through unchanged', () => {
    expect(redact(null)).toBeNull();
    expect(forComparison(null)).toBeNull();
  });

  it('forComparison excludes only updated_at, keeping every other field (redacted where secret)', () => {
    const row = { id: '1', updated_at: '2026-07-16T00:00:00Z', status: 'connected', credentials_encrypted: 'secret' };
    expect(forComparison(row)).toEqual({ id: '1', status: 'connected', credentials_encrypted: '[redacted]' });
  });
});

describe('rowsMatchForRestore — only tolerates a differing updated_at', () => {
  it('matches when only updated_at differs', () => {
    const before = { id: '1', status: 'connected', updated_at: '2026-07-16T00:00:00Z' };
    const after = { id: '1', status: 'connected', updated_at: '2026-07-17T00:00:00Z' };
    expect(rowsMatchForRestore(before, after)).toBe(true);
  });

  it('fails if any meaningful field differs', () => {
    const before = { id: '1', status: 'connected', updated_at: '2026-07-16T00:00:00Z' };
    const after = { id: '1', status: 'error', updated_at: '2026-07-17T00:00:00Z' };
    expect(rowsMatchForRestore(before, after)).toBe(false);
  });

  it('fails if a field is missing after restore', () => {
    const before = { id: '1', status: 'connected', last_error: null };
    const after = { id: '1', status: 'connected' };
    expect(rowsMatchForRestore(before, after)).toBe(false);
  });
});

describe('buildApplyPlan — every mutation is scoped by merchant_id, never broad', () => {
  it('plans an UPDATE scoped by merchant_id + id when a merchant_integrations row already exists', () => {
    const plan = buildApplyPlan({
      merchant: MERCHANT,
      provider: 'gorgias',
      state: 'stale',
      now: NOW,
      existingMerchantIntegration: { id: 'row-1' },
      existingLegacyRow: null,
    });
    expect(plan.merchantIntegration.op).toBe('update');
    if (plan.merchantIntegration.op === 'update') {
      expect(plan.merchantIntegration.filter).toEqual({ merchant_id: MERCHANT, id: 'row-1' });
    }
  });

  it('plans an INSERT (scoped by merchant_id + provider_id in the row itself) when no row exists yet', () => {
    const plan = buildApplyPlan({
      merchant: MERCHANT,
      provider: 'shipbob',
      state: 'healthy',
      now: NOW,
      existingMerchantIntegration: null,
      existingLegacyRow: null,
    });
    expect(plan.merchantIntegration.op).toBe('insert');
    if (plan.merchantIntegration.op === 'insert') {
      expect(plan.merchantIntegration.fields.merchant_id).toBe(MERCHANT);
      expect(plan.merchantIntegration.fields.provider_id).toBe('shipbob');
    }
  });

  it('never uses a display name or account name as a lookup key for any provider/state combination', () => {
    for (const provider of SUPPORTED_PROVIDERS) {
      for (const state of SUPPORTED_STATES) {
        const plan = buildApplyPlan({ merchant: MERCHANT, provider, state, now: NOW, existingMerchantIntegration: { id: 'row-1' }, existingLegacyRow: { id: 'legacy-1' } });
        const filterKeys = plan.merchantIntegration.op !== 'insert' ? Object.keys(plan.merchantIntegration.filter) : [];
        expect(filterKeys.every((k) => k !== 'display_name' && k !== 'provider_account_name' && k !== 'name')).toBe(true);
        if (plan.legacy && plan.legacy.op !== 'insert') {
          expect(Object.keys(plan.legacy.filter).every((k) => k !== 'display_name' && k !== 'provider_account_name' && k !== 'name')).toBe(true);
        }
      }
    }
  });

  it('only the verification_unavailable state ever plans writing credential columns', () => {
    for (const provider of ['shopify', 'gorgias'] as const) {
      for (const state of SUPPORTED_STATES) {
        const fields = legacyRowFieldsForState(provider, state, NOW);
        const touchesCredentials = fields ? ('credentials_encrypted' in fields || 'access_token_encrypted' in fields) : false;
        expect(touchesCredentials).toBe(state === 'verification_unavailable');
      }
    }
  });

  it('gorgias plans a legacy last_sync_at write for every state (the field that actually drives its freshness)', () => {
    for (const state of SUPPORTED_STATES) {
      const plan = buildApplyPlan({ merchant: MERCHANT, provider: 'gorgias', state, now: NOW, existingMerchantIntegration: { id: 'row-1' }, existingLegacyRow: { id: 'legacy-1' } });
      expect(plan.legacy).not.toBeNull();
      if (plan.legacy && plan.legacy.op === 'update') {
        expect('last_sync_at' in plan.legacy.fields).toBe(true);
      }
    }
  });

  it('shipbob/ups/fedex never plan a legacy-table mutation (no legacy table exists for them)', () => {
    for (const provider of ['shipbob', 'ups', 'fedex'] as const) {
      for (const state of SUPPORTED_STATES) {
        const plan = buildApplyPlan({ merchant: MERCHANT, provider, state, now: NOW, existingMerchantIntegration: null, existingLegacyRow: null });
        expect(plan.legacy).toBeNull();
      }
    }
  });
});

describe('buildRestorePlan — restores or cleans up, always scoped, never broad', () => {
  function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
    return {
      merchantId: MERCHANT,
      provider: 'gorgias',
      merchantIntegration: { existed: true, row: { id: 'row-1', status: 'connected' } },
      legacyConnection: { table: null, existed: false, row: null },
      ...overrides,
    };
  }

  it('plans an UPDATE with the exact snapshotted fields, scoped by merchant_id + id, when the row existed', () => {
    const plan = buildRestorePlan(snapshot());
    expect(plan.merchantIntegration).toEqual({
      op: 'update',
      table: 'merchant_integrations',
      filter: { merchant_id: MERCHANT, id: 'row-1' },
      fields: { id: 'row-1', status: 'connected' },
    });
  });

  it('plans a scoped DELETE (merchant_id + provider_id) — never a bare table-wide delete — when the row never existed', () => {
    const plan = buildRestorePlan(snapshot({ merchantIntegration: { existed: false, row: null } }));
    expect(plan.merchantIntegration).toEqual({
      op: 'delete',
      table: 'merchant_integrations',
      filter: { merchant_id: MERCHANT, provider_id: 'gorgias' },
    });
    // Never a delete with fewer than 2 scoping predicates.
    if (plan.merchantIntegration.op === 'delete') {
      expect(Object.keys(plan.merchantIntegration.filter).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('restores the legacy table the same way when present in the snapshot', () => {
    const plan = buildRestorePlan(snapshot({
      legacyConnection: { table: 'helpdesk_connections', existed: true, row: { id: 'legacy-1', last_sync_at: null } },
    }));
    expect(plan.legacy).toEqual({
      op: 'update',
      table: 'helpdesk_connections',
      filter: { merchant_id: MERCHANT, id: 'legacy-1' },
      fields: { id: 'legacy-1', last_sync_at: null },
    });
  });

  it('cleans up the legacy table with a scoped delete (never table-wide) when it never existed', () => {
    const plan = buildRestorePlan(snapshot({
      legacyConnection: { table: 'helpdesk_connections', existed: false, row: null },
    }));
    expect(plan.legacy).toEqual({
      op: 'delete',
      table: 'helpdesk_connections',
      filter: { merchant_id: MERCHANT, provider: 'gorgias' },
    });
  });
});
