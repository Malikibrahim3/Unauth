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
    expect(items.find((item) => item.evidenceType === 'delivery_status')?.occurredAt)
      .toBe('2026-07-14T00:00:00.000Z');
  });

  it('maps UPS nested signature and delivery-photo proof', () => {
    const items = mapCarrierProofToEvidence('ups', {
      trackResponse: { shipment: [{ package: [{
        trackingNumber: '1ZPROOF',
        deliveryInformation: {
          signature: { image: 'base64-signature' },
          deliveryPhoto: { photo: 'base64-photo' },
        },
      }] }] },
    }, { merchantId: 'merchant-1', trackingNumber: '1ZPROOF' });

    expect(items.find((item) => item.evidenceType === 'signature')?.value).toBe('base64-signature');
    expect(items.find((item) => item.evidenceType === 'delivery_photo')?.value).toBe('base64-photo');
  });

  it('does not represent a FedEx availability flag as a retrieved proof document', () => {
    const items = mapCarrierProofToEvidence('fedex', {
      output: { completeTrackResults: [{ trackResults: [{
        availableImages: [
          { type: 'SIGNATURE_PROOF_OF_DELIVERY' },
          { type: 'PICTURE_PROOF_OF_DELIVERY' },
        ],
      }] }] },
    }, { merchantId: 'merchant-1', trackingNumber: '123456789012' });

    const signature = items.find((item) => item.evidenceType === 'signature');
    const photo = items.find((item) => item.evidenceType === 'delivery_photo');
    expect(signature?.value).toBeNull();
    expect(signature?.summary).toContain('reports signature proof is available');
    expect(photo?.value).toBeNull();
    expect(photo?.summary).toContain('reports a delivery photo is available');
  });

  it('maps a retrieved FedEx signature proof URL', () => {
    const items = mapCarrierProofToEvidence('fedex', {
      output: { completeTrackResults: [{ trackResults: [{
        deliveryDetails: { signatureProofOfDeliveryUrl: 'https://example.test/signature.pdf' },
      }] }] },
    }, { merchantId: 'merchant-1', trackingNumber: '123456789012' });

    expect(items.find((item) => item.evidenceType === 'signature')?.value)
      .toBe('https://example.test/signature.pdf');
  });

  it('maps a retrieved FedEx signature document', () => {
    const items = mapCarrierProofToEvidence('fedex', {
      _unauthProof: { signatureDocument: 'base64-spod-document' },
      output: { completeTrackResults: [{ trackResults: [{
        availableImages: [{ type: 'SIGNATURE_PROOF_OF_DELIVERY' }],
      }] }] },
    }, { merchantId: 'merchant-1', trackingNumber: '123456789012' });

    expect(items.find((item) => item.evidenceType === 'signature')?.value)
      .toBe('base64-spod-document');
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

  it('records GPS as supported when the connected carrier returned coordinates', () => {
    const found = parseCarrierEvidenceRows([
      { evidence_type: 'delivery_status', summary: 'Delivered', value: 'delivered', occurred_at: '2026-07-14T12:00:00.000Z', raw_reference: '1ZGPS', source_provider: 'ups' },
      { evidence_type: 'gps', summary: 'Coordinates returned', value: { latitude: 51.5074, longitude: -0.1278 }, occurred_at: '2026-07-14T12:00:00.000Z', raw_reference: '1ZGPS', source_provider: 'ups' },
    ], { provider: 'ups', providerConnected: true, trackingNumber: '1ZGPS' });
    expect(found.gpsSupported).toBe(true);
  });

  it('merges direct carrier scans into the delivery checklist', () => {
    const delivery = mergeDeliveryWithTrackingEvidence({
      status: 'success', shipment_status: 'in_transit', tracking_company: 'UPS', tracking_number: '1Z999', occurred_at: '2026-07-13T00:00:00.000Z',
    }, parseCarrierEvidenceRows([
      { evidence_type: 'delivery_status', summary: 'Delivered', value: 'Delivered', occurred_at: '2026-07-14T12:00:00.000Z', raw_reference: '1Z999', source_provider: 'ups' },
      { evidence_type: 'tracking_events', summary: '6 tracking event(s)', value: 6, occurred_at: '2026-07-14T12:00:00.000Z', raw_reference: '1Z999', source_provider: 'ups' },
    ], { provider: 'ups', providerConnected: true, trackingNumber: '1Z999' }));

    expect(delivery).toMatchObject({ status: 'delivered', scanCount: 6, carrierDirectConnected: true });
    expect(delivery?.hasProofOfDelivery).toBe(false);
    const payoutCase = buildSupportPayoutCase(makeContext({ delivery }));
    const checklist = buildEvidenceChecklist(makeContext({ delivery }), 'item_not_received');
    expect(payoutCase.deliveryEvidenceLine).toMatch(/carrier reported delivered/i);
    expect(checklist.items.find((item) => item.key === 'tracking')?.state).toBe('present');
  });

  it('sets POD only when a retrieved proof artefact accompanies the delivered scan', () => {
    const delivery = mergeDeliveryWithTrackingEvidence(
      {
        status: 'success',
        shipment_status: 'delivered',
        tracking_company: 'UPS',
        tracking_number: '1ZPROOF',
        occurred_at: '2026-07-14T12:00:00.000Z',
      },
      parseCarrierEvidenceRows(
        [
          {
            evidence_type: 'delivery_status',
            summary: 'Delivered',
            value: 'Delivered',
            occurred_at: '2026-07-14T12:00:00.000Z',
            raw_reference: '1ZPROOF',
            source_provider: 'ups',
          },
          {
            evidence_type: 'signature',
            summary: 'Signature retrieved',
            value: 'base64-signature',
            occurred_at: '2026-07-14T12:00:00.000Z',
            raw_reference: '1ZPROOF',
            source_provider: 'ups',
          },
        ],
        { provider: 'ups', providerConnected: true, trackingNumber: '1ZPROOF' },
      ),
    );

    expect(delivery).toMatchObject({
      status: 'delivered',
      signatureAvailable: true,
      hasProofOfDelivery: true,
    });
  });
});
