import { onboardingNextStep, type OnboardingNextInput } from '@/lib/onboarding/nextStep';

const base: OnboardingNextInput = { commerceConnected: true, importStatus: 'completed', importHref: '/sources/shopify', usableRecords: false, firstCaseId: null, hasLosses: false, observedRows: 0 };
test.each([
  [{ commerceConnected: false }, 'Connect Shopify'],
  [{ importStatus: 'failed' }, 'Fix import'],
  [{ importStatus: 'running' }, 'View import progress'],
  [{ importStatus: null }, 'Import order history'],
  [{ usableRecords: true, firstCaseId: 'case-1' }, 'Review your first case'],
  [{ usableRecords: true, hasLosses: true }, 'Review imported losses'],
  [{}, 'Check import coverage'],
  [{ importStatus: 'failed', usableRecords: true, firstCaseId: 'case-1' }, 'Review your first case'],
])('resolves recorded state %j', (patch, label) => {
  expect(onboardingNextStep({ ...base, ...patch }).label).toBe(label);
});
