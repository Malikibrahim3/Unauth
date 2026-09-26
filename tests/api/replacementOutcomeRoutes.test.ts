jest.mock('@/lib/investigations/routeAuth', () => ({ authorizeInvestigationRequest: jest.fn() }));
jest.mock('@/lib/claims/access', () => ({ loadClaimForMerchant: jest.fn() }));
jest.mock('@/lib/claims/replacement', () => ({ recordReplacementCost: jest.fn() }));
jest.mock('@/lib/reconciliation/outcomes', () => {
  const actual = jest.requireActual('@/lib/reconciliation/outcomes');
  return { ...actual, recordCaseOutcome: jest.fn() };
});

import { POST } from '@/app/api/claims/[claimId]/outcomes/route';
import { authorizeInvestigationRequest } from '@/lib/investigations/routeAuth';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { recordReplacementCost } from '@/lib/claims/replacement';
import { recordCaseOutcome } from '@/lib/reconciliation/outcomes';

const merchantId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const caseId = '33333333-3333-4333-8333-333333333333';

function request(body: Record<string, unknown>) {
  return new Request(`http://localhost/api/claims/${caseId}/outcomes`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'replacement-cost-test-1' },
    body: JSON.stringify(body),
  });
}

describe('replacement cost outcome route', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (authorizeInvestigationRequest as jest.Mock).mockResolvedValue({
      response: null,
      service: {}, mutationClient: {},
      ctx: { merchantId }, user: { id: userId },
    });
    (loadClaimForMerchant as jest.Mock).mockResolvedValue({ claim: { id: caseId }, denied: null });
  });

  it('routes a receipt-backed actual replacement cost to the atomic P05 boundary', async () => {
    (recordReplacementCost as jest.Mock).mockResolvedValue({ outcome: { id: 'outcome-1' }, financial_entry: { id: 'entry-1', state: 'confirmed_loss' }, replayed: false });
    const response = await POST(request({
      outcome_type: 'replacement', state: 'merchant_confirmed', source_system: 'merchant_manual',
      source_external_id: 'R-1001', correlation_method: 'receipt_backed_manual_record',
      amount_minor: 1875, currency: 'GBP', override_reason: 'Retained Shopify replacement receipt.',
      metadata: { external_action_id: 'action-1' },
    }), { params: Promise.resolve({ claimId: caseId }) });
    expect(response.status).toBe(201);
    expect(recordReplacementCost).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      merchantId, caseId, actionId: 'action-1', amountMinor: 1875, currency: 'GBP',
    }));
    expect(recordCaseOutcome).not.toHaveBeenCalled();
  });

  it('rejects an unbound replacement cost before writing', async () => {
    const response = await POST(request({
      outcome_type: 'replacement', state: 'merchant_confirmed', source_system: 'merchant_manual',
      source_external_id: 'R-1001', correlation_method: 'receipt_backed_manual_record',
      amount_minor: 1875, currency: 'GBP', override_reason: 'Retained receipt.', metadata: {},
    }), { params: Promise.resolve({ claimId: caseId }) });
    expect(response.status).toBe(422);
    expect(recordReplacementCost).not.toHaveBeenCalled();
    expect(recordCaseOutcome).not.toHaveBeenCalled();
  });
});
