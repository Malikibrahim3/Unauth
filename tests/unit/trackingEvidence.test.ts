import { encryptIntegrationCredentials, decryptIntegrationCredentials } from '@/lib/integrations/secrets';
import { mapCarrierProofToEvidence } from '@/lib/integrations/evidenceMapper';
import { stableEvidenceId } from '@/lib/integrations/stableEvidenceId';
import {
  mergeDeliveryWithTrackingEvidence,
  parseCarrierEvidenceRows,
} from '@/lib/integrations/trackingEvidenceSlice';
import { buildEvidenceChecklist } from '@/lib/payouts/evidenceChecklist';
import { buildSupportPayoutCase } from '@/lib/payouts/supportPayoutCase';
import { makeContext } from '@/tests/unit/payouts/context';

describe('direct carrier tracking evidence', () => {
  it('stores OAuth credentials encrypted, not plaintext', () => {
    const blob = encryptIntegrationCredentials({ clientId: 'ups-id', clientSecret: 'ups-secret' });
    expect(blob).not.toContain('ups-secret');
    expect(decryptIntegrationCredentials(blob).clientSecret).toBe('ups-secret');
  });

  it('uses provider-scoped stable evidence ids', () => {
    const first = stableEvidenceId('merchant-1', 'ups', 'tracking_number', '1Z999');
    expect(first).toBe(stableEvidenceId('merchant-1', 'ups', 'tracking_number', '1Z999'));
    expect(first).not.toBe(stableEvidenceId('merchant-1', 'fedex', 'tracking_number', '1Z999'));
  });

  it('maps UPS status and scans without inventing unavailable proof', () => {
    const items = mapCarrierProofToEvidence('ups', {
      trackResponse: { shipment: [{ package: [{
        trackingNumber: '1Z999',
        currentStatus: { description: 'Delivered' },
        activity: [{ status: { description: 'Delivered' }, date: '20260714' }],
      }] }] },
    }, { merchantId: 'merchant-1', trackingNumber: '1Z999' });
    expect(items.find((item) => item.evidenceType === 'delivery_status')?.value).toBe('Delivered');
    expect(items.find((item) => item.evidenceType === 'tracking_events')?.value).toBe(1);
    expect(items.find((item) => item.evidenceType === 'delivery_photo')?.value).toBeNull();
    expect(items.find((item) => item.evidenceType === 'signature')?.value).toBeNull();
  });

  it('distinguishes disconnected, unsupported, missing, and found states', () => {
    expect(parseCarrierEvidenceRows([], { provider: 'ups', providerConnected: false, trackingNumber: '1Z999' }).gap)
      .toBe('provider_not_connected');
    expect(parseCarrierEvidenceRows([], { provider: null, providerConnected: false, trackingNumber: 'RM999' }).gap)
      .toBe('carrier_unsupported');
    expect(parseCarrierEvidenceRows([], { provider: 'fedex', providerConnected: true, trackingNumber: null }).gap)
      .toBe('no_tracking_number');

    const found = parseCarrierEvidenceRows([
      { evidence_type: 'delivery_status', summary: 'Delivered', value: 'Delivered', occurred_at: '2026-07-14T12:00:00.000Z', raw_reference: '1Z999', source_provider: 'ups' },
      { evidence_type: 'tracking_events', summary: '6 tracking event(s), 1 exception event(s)', value: 6, occurred_at: '2026-07-14T12:00:00.000Z', raw_reference: '1Z999', source_provider: 'ups' },
    ], { provider: 'ups', providerConnected: true, trackingNumber: '1Z999' });
    expect(found).toMatchObject({ trackingFound: true, scanCount: 6, exceptionCount: 1 });
  });

  it('merges direct carrier scans into the delivery checklist', () => {
    const delivery = mergeDeliveryWithTrackingEvidence({
      status: 'success', shipment_status: 'in_transit', tracking_company: 'UPS', tracking_number: '1Z999', occurred_at: '2026-07-13T00:00:00.000Z',
    }, parseCarrierEvidenceRows([
      { evidence_type: 'delivery_status', summary: 'Delivered', value: 'Delivered', occurred_at: '2026-07-14T12:00:00.000Z', raw_reference: '1Z999', source_provider: 'ups' },
      { evidence_type: 'tracking_events', summary: '6 tracking event(s)', value: 6, occurred_at: '2026-07-14T12:00:00.000Z', raw_reference: '1Z999', source_provider: 'ups' },
    ], { provider: 'ups', providerConnected: true, trackingNumber: '1Z999' }));

    expect(delivery).toMatchObject({ status: 'delivered', scanCount: 6, carrierDirectConnected: true });
    const payoutCase = buildSupportPayoutCase(makeContext({ delivery }));
    const checklist = buildEvidenceChecklist(makeContext({ delivery }), 'item_not_received');
    expect(payoutCase.deliveryEvidenceLine).toContain('Delivered');
    expect(checklist.items.find((item) => item.key === 'tracking')?.state).toBe('present');
  });
});
