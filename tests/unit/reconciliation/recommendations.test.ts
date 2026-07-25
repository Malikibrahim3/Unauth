import {
  buildItemParcelMatrix,
  evaluateReconciliation,
  recommendRecovery,
  recommendResponsibility,
} from '@/lib/reconciliation/recommendations';
import type { ReconciliationInput } from '@/lib/reconciliation/types';

const baseInput = (overrides: Partial<ReconciliationInput> = {}): ReconciliationInput => ({
  claimType: 'missing_item',
  requestedAction: 'replacement',
  identityConfirmed: true,
  orderConfirmed: true,
  claimedItems: [{ id: 'item-1', sku: 'BLACK-BODY-XS', quantity: 1, matchStatus: 'confirmed' }],
  parcels: [],
  facts: [],
  now: '2026-07-25T12:00:00.000Z',
  ...overrides,
});

describe('evidence reconciliation recommendations', () => {
  it('waits when the claimed item is in an active parcel inside its delivery window', () => {
    const input = baseInput({
      parcels: [{
        id: 'parcel-2',
        status: 'in_transit',
        estimatedDeliveryAt: '2026-07-26T12:00:00.000Z',
        shipmentLines: [{
          id: 'line-1',
          shipmentId: 'parcel-2',
          sku: 'BLACK-BODY-XS',
          quantityRecorded: 1,
          recordKind: 'shopify_allocation',
          evidenceBasis: 'system_record',
        }],
      }],
    });

    const result = evaluateReconciliation(input);
    expect(result.recommendations.customerAction.resultCode).toBe('wait_and_explain');
    expect(result.recommendations.responsibility.resultCode).toBe('no_loss_established');
    expect(result.recommendations.recovery.resultCode).toBe('none');
  });

  it('allocates one claimed quantity across split parcels without promoting system records to proof', () => {
    const input = baseInput({
      claimedItems: [{ id: 'item-1', sku: 'BLACK-BODY-XS', quantity: 2, matchStatus: 'confirmed' }],
      parcels: [
        {
          id: 'parcel-a',
          status: 'delivered',
          shipmentLines: [{ id: 'line-a', shipmentId: 'parcel-a', sku: 'BLACK-BODY-XS', quantityRecorded: 1, recordKind: 'system_record', evidenceBasis: 'system_record' }],
        },
        {
          id: 'parcel-b',
          status: 'in_transit',
          estimatedDeliveryAt: '2026-07-26T12:00:00.000Z',
          shipmentLines: [{ id: 'line-b', shipmentId: 'parcel-b', sku: 'BLACK-BODY-XS', quantityRecorded: 1, recordKind: 'system_record', evidenceBasis: 'system_record' }],
        },
      ],
    });

    const matrix = buildItemParcelMatrix(input);
    expect(matrix).toHaveLength(2);
    expect(matrix.map((row) => row.recordedQuantity)).toEqual([1, 1]);
    expect(matrix.every((row) => row.remainingQuantity === 0)).toBe(true);
    expect(matrix.every((row) => row.physicalProof === false)).toBe(true);
  });

  it('leaves a delivered missing-item case unresolved without physical pack proof', () => {
    const input = baseInput({
      parcels: [{
        id: 'parcel-1',
        trackingNumber: '1Z123',
        status: 'delivered',
        deliveredAt: '2026-07-24T12:00:00.000Z',
        sourceProvider: 'shipbob',
        shipmentLines: [{
          id: 'line-1',
          shipmentId: 'parcel-1',
          sku: 'BLACK-BODY-XS',
          quantityRecorded: 1,
          recordKind: 'shipbob_shipment_product',
          evidenceBasis: 'system_record',
        }],
      }],
      facts: [{
        id: 'fact-claim',
        factKind: 'source_fact',
        evidenceType: 'customer_statement',
        sourceProvider: 'gorgias',
        sourceShipmentId: 'parcel-1',
      }],
    });

    const matrix = buildItemParcelMatrix(input);
    const responsibility = recommendResponsibility(input, matrix);
    const recovery = recommendRecovery(input, matrix, responsibility);
    expect(responsibility.resultCode).toBe('unresolved');
    expect(responsibility.assessmentState).toBe('unresolved');
    expect(responsibility.missingEvidence).toEqual(expect.arrayContaining(['pick/pack scan', 'actual parcel weight']));
    expect(recovery.resultCode).toBe('request_three_pl_evidence');
    expect(recovery.assessmentState).toBe('unresolved');
  });

  it('does not assign responsibility when only a delivered scan exists', () => {
    const input = baseInput({
      claimType: 'item_not_received',
      parcels: [{
        id: 'parcel-1',
        status: 'delivered',
        deliveredAt: '2026-07-24T12:00:00.000Z',
        shipmentLines: [{
          id: 'line-1',
          shipmentId: 'parcel-1',
          sku: 'BLACK-BODY-XS',
          quantityRecorded: 1,
          recordKind: 'shopify_allocation',
          evidenceBasis: 'system_record',
        }],
      }],
    });
    expect(recommendResponsibility(input).resultCode).toBe('unresolved');
  });

  it('requires an approved, in-date recovery contract before preparing a claim', () => {
    const input = baseInput({
      parcels: [{
        id: 'parcel-1',
        status: 'lost',
        exception: 'lost',
        shipmentLines: [{
          id: 'line-1',
          shipmentId: 'parcel-1',
          sku: 'BLACK-BODY-XS',
          quantityRecorded: 1,
          recordKind: 'shipbob_shipment_product',
          evidenceBasis: 'system_record',
        }],
      }],
      facts: [{
        id: 'fact-carrier',
        factKind: 'source_fact',
        evidenceType: 'carrier_exception',
        sourceProvider: 'ups',
        sourceShipmentId: 'parcel-1',
      }],
    });
    const noContract = evaluateReconciliation(input).recommendations.recovery;
    expect(noContract.resultCode).toBe('gather_evidence');

    const withContract = evaluateReconciliation({
      ...input,
      recoveryContract: {
        providerType: 'carrier',
        eligible: true,
        deadlineAt: '2026-08-01T00:00:00.000Z',
        ruleVersionId: 'contract-v1',
        requiredEvidence: ['tracking history'],
      },
    }).recommendations.recovery;
    expect(withContract.resultCode).toBe('prepare_carrier_claim');
    expect(withContract.contractVersionId).toBe('contract-v1');
  });

  it('blocks customer action and responsibility when the order/item match is ambiguous', () => {
    const result = evaluateReconciliation(baseInput({ orderConfirmed: false }));
    expect(result.recommendations.customerAction.assessmentState).toBe('blocked');
    expect(result.recommendations.responsibility.assessmentState).toBe('blocked');
    expect(result.recommendations.customerAction.missingEvidence).toContain('confirmed order and claimed item match');
  });
});
