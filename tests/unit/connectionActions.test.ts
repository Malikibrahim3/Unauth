import { isConnectedIntegrationStatus } from '@/components/integrations/ConnectionActions';

describe('integration connection actions', () => {
  it('keeps retry and management actions available when attention is required', () => {
    expect(isConnectedIntegrationStatus('attention_required')).toBe(true);
  });

  it('still treats a disconnected integration as disconnected', () => {
    expect(isConnectedIntegrationStatus('not_connected')).toBe(false);
  });
});
