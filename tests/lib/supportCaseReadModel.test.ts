import { listSupportCasesForCustomerProfile } from '@/lib/support/intake/supportCaseReadModel';

function makeListClient(rows: Array<Record<string, unknown>>) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
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
});
