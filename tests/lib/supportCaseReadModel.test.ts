import { listSupportCasesForCustomerProfile } from '@/lib/support/intake/supportCaseReadModel';

function makeListClient(
  rows: Array<Record<string, unknown>>,
  connections: Array<Record<string, unknown>> = [],
) {
  return {
    from: (table: string) => ({
      select: () => ({
        // Connection base-url lookup: from(connections).select().eq() resolves directly.
        eq:
          table === 'support_provider_connections'
            ? async () => ({ data: connections, error: null })
            : () => ({
                eq: () => ({
                  order: async () => ({ data: rows, error: null }),
                }),
              }),
      }),
    }),
  };
}

describe('support case read model', () => {
  it('repairs stored Zendesk API URLs into agent ticket URLs', async () => {
    const rows = [
      {
        id: 'case-1',
        provider: 'zendesk',
        external_case_id: '99102',
        external_url: 'https://acme.zendesk.com/api/v2/tickets/99102.json',
        tags: [],
        link_status: 'linked',
      },
    ];

    const [supportCase] = await listSupportCasesForCustomerProfile(
      makeListClient(rows),
      'merchant-1',
      'profile-1',
    );

    expect(supportCase.external_url).toBe('https://acme.zendesk.com/agent/tickets/99102');
  });

  it('repairs stored Gorgias API URLs into app ticket URLs', async () => {
    const rows = [
      {
        id: 'case-2',
        provider: 'gorgias',
        external_case_id: '63091193',
        external_url: 'https://acme.gorgias.com/api/tickets/63091193',
        tags: [],
        link_status: 'linked',
      },
    ];

    const [supportCase] = await listSupportCasesForCustomerProfile(
      makeListClient(rows),
      'merchant-1',
      'profile-1',
    );

    expect(supportCase.external_url).toBe('https://acme.gorgias.com/app/ticket/63091193');
  });

  it('rebuilds a relative Gorgias API path using the connection base URL', async () => {
    const rows = [
      {
        id: 'case-3',
        provider: 'gorgias',
        external_case_id: '63308351',
        external_url: '/api/tickets/63308351/',
        provider_connection_id: 'conn-1',
        tags: [],
        link_status: 'linked',
      },
    ];
    const connections = [{ id: 'conn-1', provider_base_url: 'https://unauth.gorgias.com' }];

    const [supportCase] = await listSupportCasesForCustomerProfile(
      makeListClient(rows, connections),
      'merchant-1',
      'profile-1',
    );

    expect(supportCase.external_url).toBe('https://unauth.gorgias.com/app/ticket/63308351');
  });

  it('returns null when a relative path has no resolvable connection base', async () => {
    const rows = [
      {
        id: 'case-4',
        provider: 'gorgias',
        external_case_id: 'g-500',
        external_url: '/api/tickets/g-500/',
        provider_connection_id: null,
        tags: [],
        link_status: 'linked',
      },
    ];

    const [supportCase] = await listSupportCasesForCustomerProfile(
      makeListClient(rows),
      'merchant-1',
      'profile-1',
    );

    expect(supportCase.external_url).toBeNull();
  });
});
