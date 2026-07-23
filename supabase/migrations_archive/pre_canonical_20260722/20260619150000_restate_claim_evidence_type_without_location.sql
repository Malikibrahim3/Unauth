begin;

-- Re-state the claim evidence taxonomy used by recovery evidence.
alter table public.claim_evidence
  drop constraint if exists claim_evidence_evidence_type_check;

alter table public.claim_evidence
  add constraint claim_evidence_evidence_type_check
  check (evidence_type in (
    'tracking',
    'proof_of_delivery',
    'customer_message',
    'support_ticket',
    'return_label',
    'warehouse_scan',
    'payment_dispute',
    'note',
    'other',
    'damage_photo',
    'packaging_photo',
    'label_photo',
    'wrong_item_photo',
    'proof_of_value',
    'proof_of_dispatch',
    'delivery_photo',
    'customer_non_receipt_statement',
    'carrier_investigation',
    'warehouse_pick_pack_record',
    'packing_slip',
    'weight_scan',
    'refund_proof',
    'reship_proof',
    'supplier_batch_lot',
    'purchase_order',
    'return_inspection',
    'chargeback_notice',
    'carrier_claim_correspondence',
    'three_pl_dispute_correspondence',
    'supplier_credit_note'
  ));

notify pgrst, 'reload schema';

commit;
