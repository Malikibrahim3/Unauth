import type { SupabaseClient } from '@supabase/supabase-js';
import { buildReconciliationInput } from '@/lib/reconciliation/caseStore';
import { buildItemParcelMatrix } from '@/lib/reconciliation/recommendations';
import { TABLES } from '@/lib/supabase/tables';
import { createMemoryClient } from '@/tests/lib/supabaseMemoryClient';

describe('reconciliation case store', () => {
  it('carries evidence links from a shipment line to its parent parcel', async () => {
    const client = createMemoryClient(new Map([
      [TABLES.MERCHANT_CLAIMS, [{
        id: 'case-1',
        merchant_id: 'merchant-1',
        claim_type: 'missing_item',
        source_order_id: 'order-1',
        source_ticket_id: 'ticket-1',
        identity_id: null,
      }]],
      [TABLES.CASE_CLAIMED_ITEMS, [{
        id: 'item-1',
        merchant_id: 'merchant-1',
        support_payout_case_id: 'case-1',
        source_order_line_id: 'order-line-1',
        claimed_sku: 'SKU-1',
        claimed_quantity: 1,
        match_status: 'confirmed',
      }]],
      [TABLES.SOURCE_SHIPMENTS, [{
        id: 'parcel-1',
        merchant_id: 'merchant-1',
        source_order_id: 'order-1',
        status: 'delivered',
      }]],
      [TABLES.SOURCE_SHIPMENT_LINES, [{
        id: 'line-1',
        merchant_id: 'merchant-1',
        source_shipment_id: 'parcel-1',
        source_order_line_id: 'order-line-1',
        sku: 'SKU-1',
        quantity_recorded: 1,
        record_kind: 'system_record',
        evidence_basis: 'system_record',
      }]],
      [TABLES.EVIDENCE_ITEMS, [{
        id: 'fact-1',
        merchant_id: 'merchant-1',
        claim_id: 'case-1',
        evidence_type: 'pack_scan',
        fact_kind: 'source_fact',
        source_system: 'shipbob',
        structured_value: {},
      }]],
      [TABLES.EVIDENCE_LINKS, [{
        merchant_id: 'merchant-1',
        evidence_item_id: 'fact-1',
        support_payout_case_id: 'case-1',
        source_shipment_line_id: 'line-1',
      }]],
    ]));

    const input = await buildReconciliationInput(
      client as unknown as SupabaseClient,
      'merchant-1',
      'case-1',
      '2026-07-25T12:00:00.000Z',
    );

    expect(input?.facts[0]).toMatchObject({
      sourceShipmentId: 'parcel-1',
      sourceShipmentLineId: 'line-1',
    });
    expect(buildItemParcelMatrix(input!).find((row) => row.parcelId === 'parcel-1')).toMatchObject({
      physicalProof: true,
      state: 'delivered',
    });
  });
});
