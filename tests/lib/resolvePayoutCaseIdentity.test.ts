import {
  attachIdentityToPayoutCase,
  pickConservativeLinkEmail,
  resolvePayoutCaseIdentity,
} from '@/lib/support/intake/resolvePayoutCaseIdentity';
import { TABLES } from '@/lib/supabase/tables';
import { createMemoryClient, rowsOf } from '@/tests/lib/supabaseMemoryClient';

jest.mock('@/lib/identity/observations', () => ({
  emitIdentityObservations: jest.fn(async () => ({
    signals: 1,
    edges: 0,
    signalKeys: [{ type: 'email', hash: 'email-hash-1' }],
  })),
  STRONG_IDENTIFIER_TYPES: new Set(['email', 'email_root', 'phone']),
}));

jest.mock('@/lib/identity/resolver', () => ({
  resolveIdentitiesForKeys: jest.fn(async () => ({
    created: 1,
    updated: 0,
    merged: 0,
    identityIds: ['identity-1'],
  })),
  linkClaimToIdentity: jest.fn(async () => null),
}));

jest.mock('@/lib/customers/identityNetwork', () => ({
  resolveIdentityIdForCustomer: jest.fn(async () => null),
  buildCustomerIdentifierHashes: jest.requireActual('@/lib/customers/identityNetwork').buildCustomerIdentifierHashes,
}));

jest.mock('@/lib/support/intake/v2Bridge', () => ({
  captureTicketIdentitySignalsV2: jest.fn(async () => []),
}));

const MERCHANT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MERCHANT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('pickConservativeLinkEmail', () => {
  it('accepts exact normalized email across ticket and order', () => {
    const result = pickConservativeLinkEmail({
      ticketEmail: 'Shopper@Example.com',
      orderEmail: 'shopper@example.com',
    });
    expect(result.email).toBe('shopper@example.com');
    expect(result.insufficientReason).toBeNull();
    expect(result.matchReason).toBe('gorgias_ticket_email_matches_order_email');
  });

  it('rejects mismatched emails', () => {
    const result = pickConservativeLinkEmail({
      ticketEmail: 'a@example.com',
      orderEmail: 'b@example.com',
    });
    expect(result.email).toBeNull();
    expect(result.insufficientReason).toBe('email_mismatch_across_ticket_order_customer');
  });

  it('rejects name-only input with no email', () => {
    const result = pickConservativeLinkEmail({});
    expect(result.email).toBeNull();
    expect(result.insufficientReason).toBe('no_normalised_email');
  });
});

describe('resolvePayoutCaseIdentity', () => {
  const { resolveIdentityIdForCustomer } = jest.requireMock('@/lib/customers/identityNetwork') as {
    resolveIdentityIdForCustomer: jest.Mock;
  };
  const { resolveIdentitiesForKeys } = jest.requireMock('@/lib/identity/resolver') as {
    resolveIdentitiesForKeys: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resolveIdentityIdForCustomer.mockResolvedValue(null);
    resolveIdentitiesForKeys.mockResolvedValue({
      created: 1,
      updated: 0,
      merged: 0,
      identityIds: ['identity-created'],
    });
  });

  it('creates identity from Shopify customer email', async () => {
    const client = createMemoryClient();
    rowsOf(client, 'source_customers').push({
      id: 'cust-1',
      merchant_id: MERCHANT_A,
      email: 'shopper@example.com',
      external_id: 'shopify-1',
    });

    const result = await resolvePayoutCaseIdentity(client as never, {
      merchantId: MERCHANT_A,
      customerEmail: 'shopper@example.com',
      sourceCustomerId: 'cust-1',
      ticketId: 'ticket-1',
      sourceOrderId: 'order-1',
    });

    expect(result.identityId).toBe('identity-created');
    expect(result.outcome).toBe('created');
    expect(resolveIdentitiesForKeys).toHaveBeenCalled();
  });

  it('reuses existing identity by normalized email', async () => {
    resolveIdentityIdForCustomer.mockResolvedValueOnce('identity-existing');
    const client = createMemoryClient();
    client.__store.set('identities', [
      {
        id: 'identity-existing',
        confidence_grade: 'definite',
        confidence_score: 90,
        superseded_by: null,
      },
    ]);

    const result = await resolvePayoutCaseIdentity(client as never, {
      merchantId: MERCHANT_A,
      customerEmail: 'shopper@example.com',
      ticketId: 'ticket-1',
      sourceOrderId: 'order-1',
    });

    expect(result.identityId).toBe('identity-existing');
    expect(result.outcome).toBe('reused');
    expect(resolveIdentitiesForKeys).not.toHaveBeenCalled();
  });

  it('does not link on name-only mismatching emails', async () => {
    const result = await resolvePayoutCaseIdentity(createMemoryClient() as never, {
      merchantId: MERCHANT_A,
      ticketEmail: 'a@example.com',
      orderEmail: 'b@example.com',
    });
    expect(result.identityId).toBeNull();
    expect(result.outcome).toBe('insufficient');
  });
});

describe('attachIdentityToPayoutCase', () => {
  it('sets identity_id on null-identity cases', async () => {
    const client = createMemoryClient();
    client.__store.set(TABLES.MERCHANT_CLAIMS, [
      {
        id: 'claim-1',
        merchant_id: MERCHANT_A,
        identity_id: null,
      },
    ]);

    const attach = await attachIdentityToPayoutCase(client as never, {
      merchantId: MERCHANT_A,
      claimId: 'claim-1',
      identityId: 'identity-1',
    });

    expect(attach.updated).toBe(true);
    expect(rowsOf(client, TABLES.MERCHANT_CLAIMS)[0].identity_id).toBe('identity-1');
  });

  it('is idempotent when identity already set', async () => {
    const client = createMemoryClient();
    client.__store.set(TABLES.MERCHANT_CLAIMS, [
      {
        id: 'claim-1',
        merchant_id: MERCHANT_A,
        identity_id: 'identity-1',
      },
    ]);

    const attach = await attachIdentityToPayoutCase(client as never, {
      merchantId: MERCHANT_A,
      claimId: 'claim-1',
      identityId: 'identity-1',
    });

    expect(attach.updated).toBe(false);
  });

  it('prevents cross-merchant mutation via merchant filter', async () => {
    const client = createMemoryClient();
    client.__store.set(TABLES.MERCHANT_CLAIMS, [
      {
        id: 'claim-1',
        merchant_id: MERCHANT_B,
        identity_id: null,
      },
    ]);

    const attach = await attachIdentityToPayoutCase(client as never, {
      merchantId: MERCHANT_A,
      claimId: 'claim-1',
      identityId: 'identity-1',
    });

    expect(attach.updated).toBe(false);
    expect(rowsOf(client, TABLES.MERCHANT_CLAIMS)[0].identity_id).toBeNull();
  });
});
