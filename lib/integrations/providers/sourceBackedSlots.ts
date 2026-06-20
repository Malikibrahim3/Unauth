import type { EvidenceCapability, IntegrationCategory, IntegrationProvider } from '@/lib/integrations/types';

function slot(
  id: string,
  name: string,
  category: IntegrationCategory,
  evidenceCapabilities: EvidenceCapability[],
  capabilities: IntegrationProvider['capabilities'],
  authMode: IntegrationProvider['authMode'] = 'oauth',
): IntegrationProvider {
  return {
    id,
    name,
    category,
    authMode,
    buildStatus: 'slot_only',
    evidenceCapabilities,
    capabilities,
    description: 'Connector slot only. Unauth will show this provider as not connected until a real credentialed integration is configured.',
  };
}

export const emailSlotProviders: IntegrationProvider[] = [
  slot('gmail', 'Gmail', 'email', ['read_correspondence', 'send_correspondence', 'read_attachments', 'customer_correspondence', 'supplier_correspondence'], {
    readCorrespondence: true,
    sendCorrespondence: true,
    readAttachments: true,
  }),
  slot('outlook', 'Outlook', 'email', ['read_correspondence', 'send_correspondence', 'read_attachments', 'customer_correspondence', 'supplier_correspondence'], {
    readCorrespondence: true,
    sendCorrespondence: true,
    readAttachments: true,
  }),
];

export const helpdeskSlotProviders: IntegrationProvider[] = [
  slot('zendesk', 'Zendesk', 'helpdesk', ['read_correspondence', 'send_correspondence', 'ticket_messages', 'ticket_attachments', 'customer_correspondence'], {
    readCorrespondence: true,
    sendCorrespondence: true,
    readAttachments: true,
  }, 'api_key'),
  slot('intercom', 'Intercom', 'helpdesk', ['read_correspondence', 'send_correspondence', 'ticket_messages', 'ticket_attachments', 'customer_correspondence'], {
    readCorrespondence: true,
    sendCorrespondence: true,
    readAttachments: true,
  }),
];

export const paymentSlotProviders: IntegrationProvider[] = [
  slot('shopify_payments', 'Shopify Payments', 'payments', ['payment_record', 'payment_transaction', 'dispute_status', 'dispute_reason', 'processor_case_update', 'processor_settlement_status', 'bank_trace_reference'], {
    readDisputes: true,
    readSettlements: true,
    readClaimStatus: true,
  }),
  slot('braintree', 'Braintree', 'chargebacks', ['payment_record', 'payment_transaction', 'dispute_status', 'chargeback_evidence', 'processor_case_update'], {
    readDisputes: true,
    readSettlements: true,
    readClaimStatus: true,
  }),
  slot('klarna', 'Klarna', 'payments', ['payment_record', 'payment_transaction', 'dispute_status', 'processor_case_update'], {
    readDisputes: true,
    readSettlements: true,
    readClaimStatus: true,
  }),
  slot('afterpay_clearpay', 'Afterpay / Clearpay', 'payments', ['payment_record', 'payment_transaction', 'dispute_status', 'processor_case_update'], {
    readDisputes: true,
    readSettlements: true,
    readClaimStatus: true,
  }),
];

export const carrierSlotProviders: IntegrationProvider[] = [
  slot('dhl', 'DHL', 'carrier', ['tracking_timeline', 'delivery_status', 'proof_of_delivery_photo', 'signature', 'carrier_exception_reason', 'carrier_lost_confirmation'], {
    readTracking: true,
    readAttachments: true,
    readClaimStatus: true,
    readCorrespondence: true,
  }),
  slot('royal_mail', 'Royal Mail', 'carrier', ['tracking_timeline', 'delivery_status', 'proof_of_delivery_photo', 'signature', 'carrier_exception_reason', 'carrier_lost_confirmation'], {
    readTracking: true,
    readAttachments: true,
    readClaimStatus: true,
    readCorrespondence: true,
  }),
  slot('usps', 'USPS', 'carrier', ['tracking_timeline', 'delivery_status', 'proof_of_delivery_photo', 'signature', 'carrier_exception_reason', 'carrier_lost_confirmation'], {
    readTracking: true,
    readAttachments: true,
    readClaimStatus: true,
    readCorrespondence: true,
  }),
  slot('dpd', 'DPD', 'carrier', ['tracking_timeline', 'delivery_status', 'proof_of_delivery_photo', 'signature', 'carrier_exception_reason', 'carrier_lost_confirmation'], {
    readTracking: true,
    readAttachments: true,
    readClaimStatus: true,
    readCorrespondence: true,
  }),
  slot('evri', 'Evri', 'carrier', ['tracking_timeline', 'delivery_status', 'proof_of_delivery_photo', 'signature', 'carrier_exception_reason', 'carrier_lost_confirmation'], {
    readTracking: true,
    readAttachments: true,
    readClaimStatus: true,
    readCorrespondence: true,
  }),
  slot('australia_post', 'Australia Post', 'carrier', ['tracking_timeline', 'delivery_status', 'proof_of_delivery_photo', 'signature', 'carrier_exception_reason', 'carrier_lost_confirmation'], {
    readTracking: true,
    readAttachments: true,
    readClaimStatus: true,
    readCorrespondence: true,
  }),
  slot('canada_post', 'Canada Post', 'carrier', ['tracking_timeline', 'delivery_status', 'proof_of_delivery_photo', 'signature', 'carrier_exception_reason', 'carrier_lost_confirmation'], {
    readTracking: true,
    readAttachments: true,
    readClaimStatus: true,
    readCorrespondence: true,
  }),
];

export const warehouseSlotProviders: IntegrationProvider[] = [
  slot('flexport', 'Flexport', '3pl', ['fulfilment_record', 'pick_pack_log', 'packed_sku', 'package_weight', 'warehouse_exception', 'three_pl_confirmation'], {
    readFulfilment: true,
    readWarehouseEvents: true,
    readClaimStatus: true,
  }),
  slot('ryder_whiplash', 'Ryder / Whiplash', '3pl', ['fulfilment_record', 'pick_pack_log', 'packed_sku', 'package_weight', 'warehouse_exception', 'three_pl_confirmation'], {
    readFulfilment: true,
    readWarehouseEvents: true,
    readClaimStatus: true,
  }),
  slot('linnworks', 'Linnworks', 'wms', ['fulfilment_record', 'pick_pack_log', 'packed_sku', 'package_weight', 'warehouse_receiving_scan', 'receiving_record'], {
    readFulfilment: true,
    readWarehouseEvents: true,
  }),
  slot('brightpearl', 'Brightpearl', 'wms', ['fulfilment_record', 'pick_pack_log', 'packed_sku', 'package_weight', 'warehouse_receiving_scan', 'receiving_record'], {
    readFulfilment: true,
    readWarehouseEvents: true,
  }),
  slot('netsuite_wms', 'NetSuite WMS', 'wms', ['fulfilment_record', 'pick_pack_log', 'packed_sku', 'package_weight', 'warehouse_receiving_scan', 'receiving_record'], {
    readFulfilment: true,
    readWarehouseEvents: true,
  }),
  slot('custom_wms', 'Custom WMS API', 'wms', ['fulfilment_record', 'pick_pack_log', 'packed_sku', 'package_weight', 'warehouse_receiving_scan', 'warehouse_confirmation'], {
    readFulfilment: true,
    readWarehouseEvents: true,
    readCorrespondence: true,
  }, 'api_key'),
];

export const returnsSlotProviders: IntegrationProvider[] = [
  slot('returnly', 'Returnly', 'returns', ['return_authorisation', 'return_status', 'return_tracking', 'return_request_status', 'return_inspection_outcome', 'returns_provider_case_update'], {
    readReturns: true,
    readClaimStatus: true,
    readCorrespondence: true,
  }),
  slot('aftership_returns', 'AfterShip Returns', 'returns', ['return_authorisation', 'return_status', 'return_tracking', 'return_request_status', 'return_inspection_outcome', 'returns_provider_case_update'], {
    readReturns: true,
    readClaimStatus: true,
    readCorrespondence: true,
  }, 'api_key'),
];

export const protectionSlotProviders: IntegrationProvider[] = [
  slot('route', 'Route', 'shipping_protection', ['protection_claim_status', 'tracking_timeline', 'delivery_confirmation', 'carrier_exception_reason'], {
    readClaimStatus: true,
    createClaim: true,
    readCorrespondence: true,
  }),
  slot('navidium', 'Navidium', 'shipping_protection', ['protection_claim_status', 'tracking_timeline', 'delivery_confirmation', 'carrier_exception_reason'], {
    readClaimStatus: true,
    createClaim: true,
    readCorrespondence: true,
  }),
  slot('corso', 'Corso', 'shipping_protection', ['protection_claim_status', 'tracking_timeline', 'delivery_confirmation', 'carrier_exception_reason'], {
    readClaimStatus: true,
    createClaim: true,
    readCorrespondence: true,
  }),
  slot('extend', 'Extend', 'shipping_protection', ['protection_claim_status', 'tracking_timeline', 'delivery_confirmation', 'carrier_exception_reason'], {
    readClaimStatus: true,
    createClaim: true,
    readCorrespondence: true,
  }),
];

export const marketplaceSlotProviders: IntegrationProvider[] = [
  slot('amazon_marketplace', 'Amazon Marketplace', 'marketplace', ['marketplace_case_status', 'marketplace_correspondence', 'order_details', 'refund_record', 'tracking_timeline'], {
    readOrders: true,
    readRefunds: true,
    readClaimStatus: true,
    readCorrespondence: true,
  }),
  slot('ebay', 'eBay', 'marketplace', ['marketplace_case_status', 'marketplace_correspondence', 'order_details', 'refund_record', 'tracking_timeline'], {
    readOrders: true,
    readRefunds: true,
    readClaimStatus: true,
    readCorrespondence: true,
  }),
  slot('walmart_marketplace', 'Walmart Marketplace', 'marketplace', ['marketplace_case_status', 'marketplace_correspondence', 'order_details', 'refund_record', 'tracking_timeline'], {
    readOrders: true,
    readRefunds: true,
    readClaimStatus: true,
    readCorrespondence: true,
  }),
  slot('tiktok_shop', 'TikTok Shop', 'marketplace', ['marketplace_case_status', 'marketplace_correspondence', 'order_details', 'refund_record', 'tracking_timeline'], {
    readOrders: true,
    readRefunds: true,
    readClaimStatus: true,
    readCorrespondence: true,
  }),
  slot('etsy', 'Etsy', 'marketplace', ['marketplace_case_status', 'marketplace_correspondence', 'order_details', 'refund_record', 'tracking_timeline'], {
    readOrders: true,
    readRefunds: true,
    readClaimStatus: true,
    readCorrespondence: true,
  }),
];

export const erpSupplierSlotProviders: IntegrationProvider[] = [
  slot('netsuite', 'NetSuite', 'erp', ['purchase_order', 'supplier_invoice', 'receiving_record', 'vendor_credit_note', 'processor_settlement_status'], {
    readVendorCredits: true,
    readWarehouseEvents: true,
    readSettlements: true,
  }),
  slot('quickbooks', 'QuickBooks', 'erp', ['purchase_order', 'supplier_invoice', 'vendor_credit_note', 'processor_settlement_status'], {
    readVendorCredits: true,
    readSettlements: true,
  }),
  slot('xero', 'Xero', 'erp', ['purchase_order', 'supplier_invoice', 'vendor_credit_note', 'processor_settlement_status'], {
    readVendorCredits: true,
    readSettlements: true,
  }),
  slot('custom_supplier_email', 'Custom supplier email/domain', 'supplier', ['supplier_correspondence', 'vendor_credit_note', 'read_correspondence', 'send_correspondence'], {
    readCorrespondence: true,
    sendCorrespondence: true,
    readAttachments: true,
    readVendorCredits: true,
  }, 'custom'),
];

export const internalCommsSlotProviders: IntegrationProvider[] = [
  slot('slack', 'Slack', 'internal_comms', ['read_correspondence', 'send_correspondence', 'warehouse_confirmation', 'supplier_correspondence'], {
    readCorrespondence: true,
    sendCorrespondence: true,
    readAttachments: true,
  }),
];

export const sourceBackedSlotProviders: IntegrationProvider[] = [
  ...emailSlotProviders,
  ...helpdeskSlotProviders,
  ...paymentSlotProviders,
  ...carrierSlotProviders,
  ...warehouseSlotProviders,
  ...returnsSlotProviders,
  ...protectionSlotProviders,
  ...marketplaceSlotProviders,
  ...erpSupplierSlotProviders,
  ...internalCommsSlotProviders,
];
