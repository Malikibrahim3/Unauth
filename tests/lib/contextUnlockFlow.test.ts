import { precheckContextCredits } from '@/lib/billing/contextUnlockFlow';
import { getContextCreditSnapshot } from '@/lib/billing/contextCredits';

jest.mock('@/lib/billing/contextCredits', () => {
  const actual = jest.requireActual('@/lib/billing/contextCredits');
  return {
    ...actual,
    getContextCreditSnapshot: jest.fn(),
  };
});

const mockedSnapshot = getContextCreditSnapshot as jest.Mock;

describe('precheckContextCredits', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns 402 before expensive work when credits are insufficient', async () => {
    mockedSnapshot.mockResolvedValue({
      tier: 'free',
      allowance: 50,
      allowanceConfigured: true,
      used: 49,
      remaining: 1,
      periodStart: '2026-06-01T00:00:00.000Z',
      periodEnd: '2026-07-01T00:00:00.000Z',
      overageAllowed: false,
    });

    const supabase = {} as never;
    const result = await precheckContextCredits(supabase, 'merchant-1', 'full_context');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(402);
      expect(result.creditsRequired).toBe(2);
    }
  });

  it('returns 403 when scale allowance is not configured', async () => {
    mockedSnapshot.mockResolvedValue({
      tier: 'scale',
      allowance: null,
      allowanceConfigured: false,
      used: 0,
      remaining: null,
      periodStart: '2026-06-01T00:00:00.000Z',
      periodEnd: '2026-07-01T00:00:00.000Z',
      overageAllowed: false,
    });

    const result = await precheckContextCredits({} as never, 'merchant-1', 'basic_context');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});
