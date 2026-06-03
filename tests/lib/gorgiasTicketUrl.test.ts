import { buildGorgiasTicketAppUrl } from '@/lib/gorgias/gorgiasTicketUrl';

describe('buildGorgiasTicketAppUrl', () => {
  it('builds a safe app ticket URL from provider base and numeric ticket id', () => {
    expect(buildGorgiasTicketAppUrl('https://unauth.gorgias.com', '64322311')).toBe(
      'https://unauth.gorgias.com/app/ticket/64322311',
    );
  });

  it('strips trailing /api from provider base', () => {
    expect(buildGorgiasTicketAppUrl('https://acme.gorgias.com/api/', '99')).toBe(
      'https://acme.gorgias.com/app/ticket/99',
    );
  });

  it('rejects non-gorgias hosts and non-numeric ticket ids', () => {
    expect(buildGorgiasTicketAppUrl('https://evil.example.com', '1')).toBeNull();
    expect(buildGorgiasTicketAppUrl('https://unauth.gorgias.com', 'T-1')).toBeNull();
    expect(buildGorgiasTicketAppUrl(null, '1')).toBeNull();
  });
});
