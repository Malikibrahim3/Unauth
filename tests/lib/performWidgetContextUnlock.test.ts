import { performWidgetContextUnlock } from '@/lib/api/gorgias/performWidgetContextUnlock';

jest.mock('@/lib/billing/contextUnlockFlow', () => ({
  precheckContextCredits: jest.fn(),
  spendContextCreditsAfterSuccess: jest.fn(),
  creditFailureResponse: jest.requireActual('@/lib/billing/contextUnlockFlow').creditFailureResponse,
}));

jest.mock('@/lib/api/lookup/contextLookupCore', () => ({
  runWidgetContextProfileSearch: jest.fn(),
  formatContextLookupResults: jest.fn(() => []),
  CONTEXT_REVIEW_DISCLAIMER: 'disclaimer',
}));

jest.mock('@/lib/billing/getMerchantTier', () => ({
  getSubscribedMerchantTier: jest.fn().mockResolvedValue('pro'),
}));

import { precheckContextCredits, spendContextCreditsAfterSuccess } from '@/lib/billing/contextUnlockFlow';
import {
  formatContextLookupResults,
  runWidgetContextProfileSearch,
} from '@/lib/api/lookup/contextLookupCore';

describe('performWidgetContextUnlock', () => {
  let service: { from: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    const auditInsert = jest.fn().mockResolvedValue({ error: null });
    service = {
      from: jest.fn(() => ({ insert: auditInsert })),
    };
    (precheckContextCredits as jest.Mock).mockResolvedValue({
      ok: true,
      snapshot: { remaining: 10, tier: 'pro' },
      mode: { kind: 'standard' },
    });
    (spendContextCreditsAfterSuccess as jest.Mock).mockResolvedValue({
      ok: true,
      snapshot: { remaining: 8 },
      creditsSpent: 1,
    });
    (runWidgetContextProfileSearch as jest.Mock).mockResolvedValue({
      ok: true,
      queriedHashes: [],
      rawRows: [],
    });
  });

  it('requires a case-scoped reference', async () => {
    const result = await performWidgetContextUnlock(service as never, {
      merchantId: 'm1',
      apiKeyId: 'k1',
      requestIp: '1.2.3.4',
      contextType: 'basic_context',
      rawEmail: 'a@b.com',
    });
    expect(result.status).toBe(400);
  });

  it('does not run search when precheck fails', async () => {
    (precheckContextCredits as jest.Mock).mockResolvedValue({
      ok: false,
      status: 402,
      snapshot: { remaining: 0 },
      creditsRequired: 2,
      error: 'Not enough context credits remaining for this review.',
    });

    const result = await performWidgetContextUnlock(service as never, {
      merchantId: 'm1',
      apiKeyId: 'k1',
      requestIp: '1.2.3.4',
      contextType: 'evidence_summary',
      rawEmail: 'a@b.com',
      ticketRef: 'T-100',
    });

    expect(result.status).toBe(402);
    expect(runWidgetContextProfileSearch).not.toHaveBeenCalled();
  });

  it('gates unproven network context before checking or spending credits', async () => {
    const result = await performWidgetContextUnlock(service as never, {
      merchantId: 'm1',
      apiKeyId: 'k1',
      requestIp: '1.2.3.4',
      contextType: 'full_context',
      rawEmail: 'a@b.com',
      ticketRef: 'T-100',
    });

    expect(result.status).toBe(503);
    expect(result.json).toMatchObject({ creditsSpent: 0 });
    expect(precheckContextCredits).not.toHaveBeenCalled();
    expect(runWidgetContextProfileSearch).not.toHaveBeenCalled();
    expect(spendContextCreditsAfterSuccess).not.toHaveBeenCalled();
  });

  it('does not spend credits when search returns no usable profiles', async () => {
    (runWidgetContextProfileSearch as jest.Mock).mockResolvedValue({
      ok: true,
      queriedHashes: [],
      rawRows: [],
    });

    const result = await performWidgetContextUnlock(service as never, {
      merchantId: 'm1',
      apiKeyId: 'k1',
      requestIp: '1.2.3.4',
      contextType: 'basic_context',
      rawEmail: 'a@b.com',
      ticketRef: 'T-100',
    });

    expect(result.status).toBe(404);
    expect(spendContextCreditsAfterSuccess).not.toHaveBeenCalled();
    expect((result.json as { creditsSpent: number }).creditsSpent).toBe(0);
  });

  it('spends credits after successful search with results', async () => {
    (runWidgetContextProfileSearch as jest.Mock).mockResolvedValue({
      ok: true,
      queriedHashes: ['h1'],
      rawRows: [{ id: 'p1' }],
    });
    (formatContextLookupResults as jest.Mock).mockReturnValueOnce([
      {
        id: 'p1',
        context_scope: 'store_only',
        context_points: ['No previous store claims found'],
        store_context: {
          orders: 1,
          claims: 0,
          refundRate: 0,
          firstSeen: null,
          lastSeen: null,
          primaryEmail: 'a@b.com',
        },
        network_context: null,
        identity_consistency: [],
      },
    ]);
    const result = await performWidgetContextUnlock(service as never, {
      merchantId: 'm1',
      apiKeyId: 'k1',
      requestIp: '1.2.3.4',
      contextType: 'basic_context',
      rawEmail: 'a@b.com',
      ticketRef: 'T-100',
    });

    expect(runWidgetContextProfileSearch).toHaveBeenCalledWith(
      service,
      'm1',
      expect.objectContaining({ rawEmail: 'a@b.com' }),
    );
    expect(spendContextCreditsAfterSuccess).toHaveBeenCalledWith(
      service,
      expect.objectContaining({
        contextType: 'basic_context',
        ticketRef: 'T-100',
        metadata: expect.objectContaining({ request_source: 'widget' }),
      }),
    );
    expect(result.status).toBe(200);
  });
});
