import { performV1EvidenceCreate } from '@/lib/api/v1/evidence';
import {
  precheckContextCredits,
  spendContextCreditsAfterSuccess,
} from '@/lib/billing/contextUnlockFlow';

jest.mock('@/lib/evidence/buildPackage', () => ({
  buildEvidencePackage: jest.fn(),
}));

jest.mock('@/lib/evidence/narrative', () => ({
  buildNarrative: jest.fn(),
}));

jest.mock('@/lib/evidence/pdf', () => ({
  renderEvidencePDF: jest.fn(),
}));

jest.mock('@/lib/ratelimit', () => ({
  enforceRateLimit: jest.fn(async () => null),
  limitFromEnv: jest.fn(() => ({ limit: 60, windowSeconds: 3600 })),
  rateLimitKey: jest.fn(() => 'evidence:test'),
}));

jest.mock('@/lib/billing/contextUnlockFlow', () => ({
  precheckContextCredits: jest.fn(),
  spendContextCreditsAfterSuccess: jest.fn(),
  creditFailureResponse: jest.requireActual(
    '@/lib/billing/contextUnlockFlow',
  ).creditFailureResponse,
}));

describe('v1 evidence access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the shared evidence plan and credit precheck before reading merchant records', async () => {
    (precheckContextCredits as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      snapshot: { remaining: 0 },
      creditsRequired: 3,
      error: 'This feature is available on paid plans. Upgrade to unlock.',
    });
    const service = { from: jest.fn() };

    const result = await performV1EvidenceCreate(
      service as never,
      {
        merchantId: 'merchant-1',
        apiKeyId: 'key-1',
        requestIp: '127.0.0.1',
      },
      { email: 'customer@example.com', orderId: 'ORDER-1' },
    );

    expect(result).toMatchObject({
      ok: false,
      status: 403,
      requiredCredits: 3,
      remainingCredits: 0,
    });
    expect(precheckContextCredits).toHaveBeenCalledWith(
      service,
      'merchant-1',
      'evidence_summary',
    );
    expect(service.from).not.toHaveBeenCalled();
    expect(spendContextCreditsAfterSuccess).not.toHaveBeenCalled();
  });
});
