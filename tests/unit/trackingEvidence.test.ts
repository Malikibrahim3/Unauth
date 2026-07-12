import { encryptIntegrationCredentials, decryptIntegrationCredentials } from '@/lib/integrations/secrets';
import {
  mapAfterShipTrackingToEvidence,
} from '@/lib/integrations/evidenceMapper';
import { stableEvidenceId } from '@/lib/integrations/stableEvidenceId';
import {
  formatDeliveryEvidenceLine,
  mergeDeliveryWithTrackingEvidence,
  parseAfterShipEvidenceRows,
} from '@/lib/integrations/trackingEvidenceSlice';
import { buildEvidenceChecklist } from '@/lib/payouts/evidenceChecklist';
import { formatEvidenceChecklist } from '@/lib/gorgias/widgetJson';
import { buildSupportPayoutCase } from '@/lib/payouts/supportPayoutCase';
import { makeContext } from '@/tests/unit/payouts/context';

describe('AfterShip tracking evidence', () => {
  it('stores integration credentials encrypted, not plaintext', () => {
    const blob = encryptIntegrationCredentials({ apiKey: 'as_live_secret_key_12345' });
    expect(blob).not.toContain('as_live_secret_key_12345');
    expect(decryptIntegrationCredentials(blob).apiKey).toBe('as_live_secret_key_12345');
  });

  it('uses stable evidence ids for idempotent sync', () => {
    const first = stableEvidenceId('merchant-1', 'aftership', 'tracking_number', '1Z999');
    const second = stableEvidenceId('merchant-1', 'aftership', 'tracking_number', '1Z999');
    expect(first).toBe(second);
    expect(first).not.toBe(stableEvidenceId('merchant-1', 'aftership', 'tracking_number', '1Z888'));
  });

  it('maps AfterShip tracking without fake photo, signature, or GPS', () => {
    const items = mapAfterShipTrackingToEvidence({
      id: 'trk_1',
      tracking_number: '1Z999',
      slug: 'ups',
      tag: 'Delivered',
      checkpoints: [{ tag: 'Delivered' }],
    }, { merchantId: 'merchant-1' });

    const photo = items.find((item) => item.evidenceType === 'delivery_photo');
    const signature = items.find((item) => item.evidenceType === 'signature');
    expect(photo?.value).toBeNull();
    expect(signature?.value).toBeNull();
    expect(items.some((item) => String(item.evidenceType).includes('gps'))).toBe(false);
  });

  it('distinguishes disconnected, missing tracking number, and tracking found states', () => {
    const disconnected = parseAfterShipEvidenceRows([], {
      afterShipConnected: false,
      shopifyTrackingNumber: '1Z999',
    });
    expect(disconnected.gap).toBe('provider_not_connected');

    const noNumber = parseAfterShipEvidenceRows([], {
      afterShipConnected: true,
      shopifyTrackingNumber: null,
    });
    expect(noNumber.gap).toBe('no_tracking_number');

    const notFound = parseAfterShipEvidenceRows([], {
      afterShipConnected: true,
      shopifyTrackingNumber: '1Z999',
    });
    expect(notFound.gap).toBe('tracking_not_found');

    const found = parseAfterShipEvidenceRows([
      {
        evidence_type: 'delivery_status',
        summary: 'Delivered',
        value: 'Delivered',
        occurred_at: '2026-06-18T00:00:00.000Z',
        raw_reference: '1Z999',
        source_provider: 'aftership',
      },
      {
        evidence_type: 'tracking_events',
        summary: '6 tracking event(s)',
        value: 6,
        occurred_at: '2026-06-18T00:00:00.000Z',
        raw_reference: '1Z999',
        source_provider: 'aftership',
      },
    ], {
      afterShipConnected: true,
      shopifyTrackingNumber: '1Z999',
    });
    expect(found.trackingFound).toBe(true);
    expect(found.scanCount).toBe(6);
  });

  it('merges Shopify fulfilment with AfterShip scans into delivery context', () => {
    const delivery = mergeDeliveryWithTrackingEvidence({
      status: 'success',
      shipment_status: 'in_transit',
      tracking_company: 'UPS',
      tracking_number: '1Z999',
      occurred_at: '2026-06-17T00:00:00.000Z',
    }, parseAfterShipEvidenceRows([
      {
        evidence_type: 'delivery_status',
        summary: 'Delivered',
        value: 'Delivered',
        occurred_at: '2026-06-18T00:00:00.000Z',
        raw_reference: '1Z999',
        source_provider: 'aftership',
      },
      {
        evidence_type: 'tracking_events',
        summary: '6 tracking event(s), 1 exception event(s)',
        value: 6,
        occurred_at: '2026-06-18T00:00:00.000Z',
        raw_reference: '1Z999',
        source_provider: 'aftership',
      },
    ], {
      afterShipConnected: true,
      shopifyTrackingNumber: '1Z999',
    }));

    expect(delivery?.status).toBe('delivered');
    expect(delivery?.scanCount).toBe(6);
    expect(delivery?.exceptionCount).toBe(1);
    expect(delivery?.afterShipConnected).toBe(true);
  });

  it('builds checklist states for disconnected, missing tracking, and delivered scans', () => {
    const disconnectedCase = buildSupportPayoutCase(makeContext({
      delivery: mergeDeliveryWithTrackingEvidence({
        status: null,
        shipment_status: null,
        tracking_company: null,
        tracking_number: null,
        occurred_at: null,
      }, parseAfterShipEvidenceRows([], {
        afterShipConnected: false,
        shopifyTrackingNumber: null,
      })),
    }));
    expect(disconnectedCase.deliveryEvidenceLine).toContain('No tracking number on Shopify order');

    const noTracking = buildEvidenceChecklist(makeContext({
      delivery: mergeDeliveryWithTrackingEvidence(null, parseAfterShipEvidenceRows([], {
        afterShipConnected: true,
        shopifyTrackingNumber: null,
      })),
    }), 'item_not_received');
    expect(noTracking.items.find((item) => item.key === 'tracking')?.reason).toContain('No tracking number');

    const delivered = buildEvidenceChecklist(makeContext({
      delivery: mergeDeliveryWithTrackingEvidence({
        status: 'success',
        shipment_status: 'delivered',
        tracking_company: 'UPS',
        tracking_number: '1Z999',
        occurred_at: '2026-06-18T00:00:00.000Z',
      }, parseAfterShipEvidenceRows([
        {
          evidence_type: 'delivery_status',
          summary: 'Delivered',
          value: 'Delivered',
          occurred_at: '2026-06-18T00:00:00.000Z',
          raw_reference: '1Z999',
          source_provider: 'aftership',
        },
        {
          evidence_type: 'tracking_events',
          summary: '6 tracking event(s)',
          value: 6,
          occurred_at: '2026-06-18T00:00:00.000Z',
          raw_reference: '1Z999',
          source_provider: 'aftership',
        },
      ], {
        afterShipConnected: true,
        shopifyTrackingNumber: '1Z999',
      })),
    }), 'item_not_received');
    const byKey = Object.fromEntries(delivered.items.map((item) => [item.key, item.state]));
    expect(byKey.tracking).toBe('present');
    expect(byKey.proof_of_delivery).toBe('present');
    expect(byKey.delivery_photo).toBe('unavailable');
    expect(byKey.signature).toBe('unavailable');
  });

  it('formats widget delivery evidence line for INR cases', () => {
    const payoutCase = buildSupportPayoutCase(makeContext({
      delivery: mergeDeliveryWithTrackingEvidence({
        status: 'success',
        shipment_status: 'delivered',
        tracking_company: 'UPS',
        tracking_number: '1Z999',
        occurred_at: '2026-06-18T00:00:00.000Z',
      }, parseAfterShipEvidenceRows([
        {
          evidence_type: 'delivery_status',
          summary: 'Delivered',
          value: 'Delivered',
          occurred_at: '2026-06-18T00:00:00.000Z',
          raw_reference: '1Z999',
          source_provider: 'aftership',
        },
        {
          evidence_type: 'tracking_events',
          summary: '6 tracking event(s)',
          value: 6,
          occurred_at: '2026-06-18T00:00:00.000Z',
          raw_reference: '1Z999',
          source_provider: 'aftership',
        },
      ], {
        afterShipConnected: true,
        shopifyTrackingNumber: '1Z999',
      })),
    }));
    const line = formatEvidenceChecklist(payoutCase.evidence, payoutCase.deliveryEvidenceLine);
    expect(line).toContain('Delivery evidence:');
    expect(line).toContain('6 scans');
    expect(payoutCase.deliveryEvidenceLine).toContain('Delivered');
  });
});
