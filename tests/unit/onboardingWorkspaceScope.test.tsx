import React from 'react';

const mockContext = jest.fn();
const mockMerchant = jest.fn();
const mockDefaultPath = jest.fn().mockResolvedValue('/overview');
const mockRedirect = jest.fn((path: string) => { throw new Error(`redirect:${path}`); });
const query: Record<string, jest.Mock> = {};
for (const method of ['select', 'eq', 'in', 'or', 'order', 'limit', 'range']) query[method] = jest.fn(() => query);
query.then = jest.fn((resolve) => Promise.resolve({ data: [] }).then(resolve));
const service = { from: jest.fn(() => query) };

jest.mock('@/lib/supabase/server', () => ({ createServiceClient: () => service }));
jest.mock('@/lib/auth/requestContext', () => ({
  getRequestUser: async () => ({ id: 'owner', user_metadata: { setup_complete: true } }),
  getRequestCallerContext: () => mockContext(),
}));
jest.mock('@/lib/account/merchantProfile', () => ({ getMerchantProfileById: (...args: unknown[]) => mockMerchant(...args) }));
jest.mock('@/lib/permissions', () => ({ resolveDefaultAppPath: (...args: unknown[]) => mockDefaultPath(...args) }));
jest.mock('@/lib/connections/getConnectionState', () => ({ getConnectionState: async () => ({ shopify: false, helpdesk: false }) }));
jest.mock('@/lib/connectors/catalogue', () => ({ loadConnectorCatalogue: async () => [] }));
jest.mock('@/lib/billing/subscriptionIntent', () => ({ loadLatestSubscriptionIntent: async () => ({ intent: null, availability: 'available' }) }));
jest.mock('@/lib/testing/acceptanceStateInjector', () => ({ acceptanceScenarioFromHeaders: async () => null, delayForAcceptanceScenario: async () => {}, throwForAcceptanceScenario: async () => {} }));
jest.mock('@/components/OnboardingClient', () => ({ __esModule: true, default: () => null }));
jest.mock('next/navigation', () => ({ redirect: (path: string) => mockRedirect(path) }));

import OnboardingPage from '@/app/onboarding/page';

beforeEach(() => {
  mockContext.mockResolvedValue({ merchantId: 'selected-workspace', userId: 'owner', role: 'owner' });
  mockMerchant.mockResolvedValue({ id: 'selected-workspace', name: 'Selected workspace', setup_complete: false, onboarding_profile_complete: false });
  mockRedirect.mockClear();
});

it('uses the selected workspace and does not inherit completion from another workspace', async () => {
  const result = await OnboardingPage({ searchParams: Promise.resolve({ step: 'store' }) });
  expect(mockMerchant).toHaveBeenCalledWith(service, 'selected-workspace');
  expect(React.isValidElement(result)).toBe(true);
  expect(mockRedirect).not.toHaveBeenCalled();
});

it('resolves the completed workspace destination within the same verified membership', async () => {
  mockMerchant.mockResolvedValue({ id: 'selected-workspace', name: 'Selected workspace', setup_complete: true });
  await expect(OnboardingPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('redirect:/overview');
  expect(mockDefaultPath).toHaveBeenCalledWith(service, 'owner', { selectedMerchantId: 'selected-workspace' });
});

it('keeps incomplete onboarding available after a recorded import attempt', async () => {
  query.then.mockImplementation((resolve) => Promise.resolve({ data: [{ id: 'job-1', job_kind: 'csv_import', status: 'failed' }] }).then(resolve));
  const result = await OnboardingPage({ searchParams: Promise.resolve({}) });
  expect(React.isValidElement(result)).toBe(true);
  expect(mockRedirect).not.toHaveBeenCalled();
  query.then.mockImplementation((resolve) => Promise.resolve({ data: [] }).then(resolve));
});
