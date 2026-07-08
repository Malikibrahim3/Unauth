import { TABLES } from '@/lib/supabase/tables';
import { ingestSupportCase } from '@/lib/support/intake/ingestSupportCase';
import { reconcilePayoutCasesFromTickets } from '@/lib/support/intake/reconcilePayoutCasesFromTickets';
import {
  markTicketSourceDeleted,
  reconcileDeletedGorgiasTickets,
  SOURCE_DELETED_TICKET_STATUS,
} from '@/lib/support/gorgias/reconcileDeletedTickets';
import { GorgiasSidebarRegistrationError } from '@/lib/support/gorgias/registerSidebarWidget';
import { verifyGorgiasConnectionOrMarkReconnectRequired } from '@/lib/support/gorgias/verifyStoredCredentials';
import { createMemoryClient, rowsOf } from '@/tests/lib/supabaseMemoryClient';

jest.mock('@/lib/support/gorgias/fetchTicket', () => ({
  fetchGorgiasTicketById: jest.fn(),
}));

jest.mock('@/lib/support/gorgias/credentialCrypto', () => ({
  decryptGorgiasApiCredentials: () => ({ email: 'a@b.com', api_key: 'key' }),
}));

jest.mock('@/lib/support/gorgias/registerSidebarWidget', () => {
  const actual = jest.requireActual('@/lib/support/gorgias/registerSidebarWidget');
  return {
    ...actual,
    gorgiasApiRequest: jest.fn(),
  };
});

const MERCHANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const { fetchGorgiasTicketById } = jest.requireMock('@/lib/support/gorgias/fetchTicket') as {
  fetchGorgiasTicketById: jest.Mock;
};
const { gorgiasApiRequest } = jest.requireMock('@/lib/support/gorgias/registerSidebarWidget') as {
  gorgiasApiRequest: jest.Mock;
};

function gorgiasTicket(over: Record<string, unknown> = {}) {
  return {
    id: over.id ?? '64706015',
    subject: over.subject ?? 'Where is my order',
    status: over.status ?? 'open',
    tags: over.tags ?? [],
    created_datetime: '2026-05-10T12:00:00Z',
    updated_datetime: '2026-05-10T12:00:00Z',
    customer: over.customer ?? { email: 'shopper@example.com', firstname: 'Simon', lastname: 'Murphy' },
    messages: [{ body: over.body ?? 'help', from_agent: false }],
    ...over,
  };
}

describe('Gorgias subject persistence', () => {
  it('stores ticket subject on source_tickets', async () => {
    const client = createMemoryClient();
    await ingestSupportCase(client, {
      merchant_id: MERCHANT,
      provider: 'gorgias',
      event_type: 'ticket_backfill',
      raw: gorgiasTicket({ id: '64706015', subject: 'Refund for order #1013' }),
    });

    expect(rowsOf(client, TABLES.SUPPORT_CASE_INTAKE)[0]).toMatchObject({
      external_id: '64706015',
      subject: 'Refund for order #1013',
    });
  });
});

describe('orphan Gorgias ticket handling', () => {
  it('marks 404 tickets source_deleted and stale linked payout cases', async () => {
    const client = createMemoryClient();
    const tickets = rowsOf(client, TABLES.SUPPORT_CASE_INTAKE);
    tickets.push({
      id: 'ticket-orphan',
      merchant_id: MERCHANT,
      provider: 'gorgias',
      external_id: '67446971',
      status: 'open',
    });
    client.__store.set(TABLES.SUPPORT_CASE_INTAKE, tickets);

    const claims = rowsOf(client, TABLES.MERCHANT_CLAIMS);
    claims.push({
      id: 'claim-1',
      merchant_id: MERCHANT,
      source_ticket_id: 'ticket-orphan',
      status: 'open',
    });
    client.__store.set(TABLES.MERCHANT_CLAIMS, claims);

    fetchGorgiasTicketById.mockRejectedValue(
      new GorgiasSidebarRegistrationError('gorgias_sidebar_registration_failed', 404, 'not_found'),
    );

    const result = await reconcileDeletedGorgiasTickets({
      supabase: client as never,
      merchantId: MERCHANT,
      access: {
        providerBaseUrl: 'https://unauth.gorgias.com',
        credentials: { email: 'a@b.com', api_key: 'key' },
      },
      externalTicketIds: ['67446971'],
    });

    expect(result.marked_deleted).toBe(1);
    expect(rowsOf(client, TABLES.SUPPORT_CASE_INTAKE)[0].status).toBe(SOURCE_DELETED_TICKET_STATUS);
    expect(rowsOf(client, TABLES.MERCHANT_CLAIMS)[0].status).toBe('stale');
  });
});

describe('idempotent payout case generation', () => {
  it('reconcile does not duplicate cases for the same ticket', async () => {
    const client = createMemoryClient();
    const tickets = rowsOf(client, TABLES.SUPPORT_CASE_INTAKE);
    tickets.push({
      id: 'ticket-1',
      merchant_id: MERCHANT,
      provider: 'gorgias',
      external_id: 'g-1',
      subject: 'Refund for order #1007',
      status: 'open',
      tags: ['refund'],
      linked_order_external_ids: [],
      source_customer_id: null,
      created_at_provider: '2026-05-10T12:00:00Z',
    });
    client.__store.set(TABLES.SUPPORT_CASE_INTAKE, tickets);

    const first = await reconcilePayoutCasesFromTickets({ supabase: client as never, merchantId: MERCHANT });
    const second = await reconcilePayoutCasesFromTickets({ supabase: client as never, merchantId: MERCHANT });

    expect(first.cases_created_or_updated).toBe(1);
    expect(second.cases_created_or_updated).toBe(1);
    expect(rowsOf(client, TABLES.MERCHANT_CLAIMS)).toHaveLength(1);
  });
});

describe('Gorgias reconnect-required credential verification', () => {
  it('marks connection error on 401', async () => {
    const updates: Record<string, unknown>[] = [];
    const client = {
      from: () => ({
        update: (payload: Record<string, unknown>) => ({
          eq: async () => {
            updates.push(payload);
            return { error: null };
          },
        }),
      }),
    };

    gorgiasApiRequest.mockRejectedValue(
      new GorgiasSidebarRegistrationError('gorgias_sidebar_registration_failed', 401, 'unauthorized'),
    );

    const ok = await verifyGorgiasConnectionOrMarkReconnectRequired({
      supabase: client as never,
      connectionId: 'conn-1',
      providerBaseUrl: 'https://unauth.gorgias.com',
      accessTokenEncrypted: 'gorgias-api-credentials:fake',
    });

    expect(ok).toBe(false);
    expect(updates[0]).toMatchObject({
      status: 'error',
      last_error: 'gorgias_api_auth_failed',
    });
  });
});

describe('markTicketSourceDeleted', () => {
  it('excludes deleted tickets from reconcile bridge', async () => {
    const client = createMemoryClient();
    const tickets = rowsOf(client, TABLES.SUPPORT_CASE_INTAKE);
    tickets.push({
      id: 'ticket-deleted',
      merchant_id: MERCHANT,
      provider: 'gorgias',
      external_id: '67446971',
      status: 'open',
      tags: [],
      linked_order_external_ids: [],
      source_customer_id: null,
      created_at_provider: '2026-05-10T12:00:00Z',
    });
    client.__store.set(TABLES.SUPPORT_CASE_INTAKE, tickets);

    await markTicketSourceDeleted(client as never, { merchantId: MERCHANT, ticketId: 'ticket-deleted' });

    const bridge = await reconcilePayoutCasesFromTickets({ supabase: client as never, merchantId: MERCHANT });
    expect(bridge.tickets_scanned).toBe(0);
    expect(rowsOf(client, TABLES.MERCHANT_CLAIMS)).toHaveLength(0);
  });
});
