import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { hashIdentifier } from '@/lib/identity/hash';
import { normaliseAddress, normaliseEmail } from '@/lib/identity/normalise';
import { TABLES } from '@/lib/supabase/tables';
import { assessCE3Eligibility, type Ce3SignalHashes } from './ce3';
import type { EvidencePackage } from './types';

const ENGINE_VERSION = '2.1-store-scoped';

type MerchantRow = { id: string; name?: string | null; business_name?: string | null };
type CustomerRow = {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  account_created_at: string | null;
  created_at: string;
};
type OrderRow = {
  id: string;
  external_id: string;
  order_number: string | null;
  source_customer_id: string | null;
  email: string | null;
  phone: string | null;
  financial_status: string | null;
  fulfillment_state: string | null;
  total_price: number | string | null;
  currency: string | null;
  card_last4: string | null;
  browser_ip: string | null;
  shipping_address_id: string | null;
  placed_at: string | null;
  ingested_at: string | null;
};
type AddressRow = {
  id: string;
  line1: string | null;
  line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  normalized_full: string | null;
};

export function maskEmail(email: string): string {
  const atIdx = email.indexOf('@');
  if (atIdx === -1) return '****';
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1);
  if (local.length <= 2) return `${local[0] ?? '*'}****@${domain}`;
  return `${local[0]}****${local[local.length - 1]}@${domain}`;
}

export function maskAddress(address: string): string {
  const postcodeMatch = address.match(/[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}/i);
  if (postcodeMatch) return `****, ${postcodeMatch[0]}`;
  const zipMatch = address.match(/\b\d{5}(-\d{4})?\b/);
  if (zipMatch) return `****, ${zipMatch[0]}`;
  return '****';
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return '****';
  return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
}

function addressText(address: AddressRow | null): string | null {
  if (!address) return null;
  const value = [
    address.line1,
    address.line2,
    address.city,
    address.region,
    address.postal_code,
    address.country,
  ].filter(Boolean).join(', ');
  return value || null;
}

function orderDate(order: OrderRow): Date {
  const value = order.placed_at ?? order.ingested_at ?? new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function friendlyOrderId(order: OrderRow): string {
  return order.order_number ?? order.external_id ?? order.id;
}

function signalHashes(order: OrderRow, address: AddressRow | null): Ce3SignalHashes {
  const normalizedAddress = address?.normalized_full ?? normaliseAddress(addressText(address) ?? '');
  const normalizedEmail = normaliseEmail(order.email ?? '');
  return {
    accountLink: order.source_customer_id ? hashIdentifier(order.source_customer_id) : undefined,
    ipCluster: order.browser_ip ? hashIdentifier(order.browser_ip) : undefined,
    addressCluster: normalizedAddress ? hashIdentifier(normalizedAddress) : undefined,
    deviceMatch: undefined,
    emailVariant: normalizedEmail ? hashIdentifier(normalizedEmail) : undefined,
    phoneMatch: order.phone ? hashIdentifier(order.phone) : undefined,
  };
}

async function loadDisputedOrder(
  service: SupabaseClient,
  merchantId: string,
  customerProfileId: string,
  disputedOrderId: string,
): Promise<OrderRow | null> {
  const select = 'id, external_id, order_number, source_customer_id, email, phone, financial_status, fulfillment_state, total_price, currency, card_last4, browser_ip, shipping_address_id, placed_at, ingested_at';
  const base = () => service
    .from(TABLES.SOURCE_ORDERS)
    .select(select)
    .eq('merchant_id', merchantId)
    .eq('source_customer_id', customerProfileId);

  const { data: byId } = await base().eq('id', disputedOrderId).maybeSingle();
  if (byId) return byId as OrderRow;

  const { data: byExternalId } = await base().eq('external_id', disputedOrderId).maybeSingle();
  if (byExternalId) return byExternalId as OrderRow;

  const { data: byOrderNumber } = await base().eq('order_number', disputedOrderId).maybeSingle();
  return (byOrderNumber as OrderRow | null) ?? null;
}

export async function buildEvidencePackage(
  merchantId: string,
  customerProfileId: string,
  disputedOrderId: string,
  service: SupabaseClient,
  _legacyOwnerUserId?: string | null,
  options?: { referenceNumber?: string },
): Promise<EvidencePackage> {
  const [{ data: merchantData }, { data: customerData }] = await Promise.all([
    service.from(TABLES.MERCHANTS).select('id, name').eq('id', merchantId).maybeSingle(),
    service
      .from(TABLES.SOURCE_CUSTOMERS)
      .select('id, email, phone, first_name, last_name, account_created_at, created_at')
      .eq('id', customerProfileId)
      .eq('merchant_id', merchantId)
      .maybeSingle(),
  ]);

  const merchant = merchantData as MerchantRow | null;
  const customer = customerData as CustomerRow | null;
  if (!merchant) throw new Error(`Merchant not found: ${merchantId}`);
  if (!customer) throw new Error(`Customer not found or not owned by merchant: ${customerProfileId}`);

  const disputedOrder = await loadDisputedOrder(service, merchantId, customerProfileId, disputedOrderId);
  if (!disputedOrder) {
    throw new Error(`Disputed order not found or not owned by merchant: ${disputedOrderId}`);
  }

  const { data: orderData, error: orderError } = await service
    .from(TABLES.SOURCE_ORDERS)
    .select('id, external_id, order_number, source_customer_id, email, phone, financial_status, fulfillment_state, total_price, currency, card_last4, browser_ip, shipping_address_id, placed_at, ingested_at')
    .eq('merchant_id', merchantId)
    .eq('source_customer_id', customerProfileId)
    .order('placed_at', { ascending: true })
    .limit(2000);
  if (orderError) throw new Error(`Customer order history failed: ${orderError.message}`);

  const orders = (orderData ?? []) as OrderRow[];
  const completeOrders = orders.some((order) => order.id === disputedOrder.id)
    ? orders
    : [...orders, disputedOrder].sort((a, b) => orderDate(a).getTime() - orderDate(b).getTime());

  const addressIds = [...new Set(completeOrders.flatMap((order) => order.shipping_address_id ? [order.shipping_address_id] : []))];
  const { data: addressData } = addressIds.length > 0
    ? await service
      .from(TABLES.SOURCE_ADDRESSES)
      .select('id, line1, line2, city, region, postal_code, country, normalized_full')
      .eq('merchant_id', merchantId)
      .in('id', addressIds)
    : { data: [] };
  const addresses = new Map(((addressData ?? []) as AddressRow[]).map((address) => [address.id, address]));

  const orderIds = completeOrders.map((order) => order.id);
  const { data: claimData } = orderIds.length > 0
    ? await service
      .from(TABLES.MERCHANT_CLAIMS)
      .select('source_order_id, claim_type, status')
      .eq('merchant_id', merchantId)
      .in('source_order_id', orderIds)
    : { data: [] };
  const claimedOrderIds = new Set(
    ((claimData ?? []) as Array<{ source_order_id: string | null }>).flatMap((claim) =>
      claim.source_order_id ? [claim.source_order_id] : [],
    ),
  );

  const firstSeen = completeOrders.length > 0 ? orderDate(completeOrders[0]) : new Date(customer.created_at);
  const primaryEmail = customer.email ?? disputedOrder.email;
  const primaryPhone = customer.phone ?? disputedOrder.phone;
  const disputedAddress = disputedOrder.shipping_address_id
    ? addresses.get(disputedOrder.shipping_address_id) ?? null
    : null;
  const disputedAddressText = addressText(disputedAddress);

  const identityEvidence: EvidencePackage['identityEvidence'] = [];
  if (primaryEmail) {
    const normalized = normaliseEmail(primaryEmail);
    identityEvidence.push({
      identifierType: 'Email address',
      maskedValue: maskEmail(primaryEmail),
      firstSeen,
      orderCount: completeOrders.filter((order) => normaliseEmail(order.email ?? '') === normalized).length,
      ce3Accepted: false,
    });
  }
  if (disputedAddressText) {
    const normalized = disputedAddress?.normalized_full ?? normaliseAddress(disputedAddressText);
    identityEvidence.push({
      identifierType: 'Shipping address',
      maskedValue: maskAddress(disputedAddressText),
      firstSeen,
      orderCount: completeOrders.filter((order) => {
        const address = order.shipping_address_id ? addresses.get(order.shipping_address_id) ?? null : null;
        return (address?.normalized_full ?? normaliseAddress(addressText(address) ?? '')) === normalized;
      }).length,
      ce3Accepted: true,
    });
  }
  if (primaryPhone) {
    identityEvidence.push({
      identifierType: 'Phone number',
      maskedValue: maskPhone(primaryPhone),
      firstSeen,
      orderCount: completeOrders.filter((order) => order.phone === primaryPhone).length,
      ce3Accepted: false,
    });
  }
  if (disputedOrder.browser_ip) {
    identityEvidence.push({
      identifierType: 'IP address',
      maskedValue: disputedOrder.browser_ip.includes('.')
        ? `${disputedOrder.browser_ip.split('.').slice(0, 2).join('.')}.*.*`
        : '****',
      firstSeen,
      orderCount: completeOrders.filter((order) => order.browser_ip === disputedOrder.browser_ip).length,
      ce3Accepted: true,
    });
  }
  if (disputedOrder.card_last4) {
    identityEvidence.push({
      identifierType: 'Payment card (last 4)',
      maskedValue: `**** ${disputedOrder.card_last4}`,
      firstSeen,
      orderCount: completeOrders.filter((order) => order.card_last4 === disputedOrder.card_last4).length,
      ce3Accepted: false,
    });
  }

  const ce3 = assessCE3Eligibility(
    friendlyOrderId(disputedOrder),
    orderDate(disputedOrder),
    signalHashes(disputedOrder, disputedAddress),
    completeOrders.map((order) => ({
      order_id: friendlyOrderId(order),
      order_date: orderDate(order),
      refund_status:
        order.financial_status === 'refunded' || claimedOrderIds.has(order.id) ? 'full' : 'none',
      signalHashes: signalHashes(
        order,
        order.shipping_address_id ? addresses.get(order.shipping_address_id) ?? null : null,
      ),
      paymentCredential: order.card_last4,
    })),
    { disputedPaymentCredential: disputedOrder.card_last4 },
  );

  const { data: refData } = options?.referenceNumber
    ? { data: options.referenceNumber }
    : await service.rpc('generate_evidence_reference');
  const referenceNumber = typeof refData === 'string'
    ? refData
    : `UNAUTH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 6).toUpperCase()}`;

  return {
    referenceNumber,
    generatedAt: new Date(),
    merchant: { id: merchantId, name: merchant.business_name ?? merchant.name ?? 'Merchant' },
    disputedOrder: {
      orderId: friendlyOrderId(disputedOrder),
      orderDate: orderDate(disputedOrder),
      orderValue: Number(disputedOrder.total_price ?? 0),
      currency: disputedOrder.currency ?? 'USD',
      outcome: disputedOrder.financial_status ?? disputedOrder.fulfillment_state ?? 'unknown',
    },
    customer: {
      maskedEmail: primaryEmail ? maskEmail(primaryEmail) : 'Not available',
      maskedAddress: disputedAddressText ? maskAddress(disputedAddressText) : undefined,
      maskedPhone: primaryPhone ? maskPhone(primaryPhone) : undefined,
      paymentLast4: disputedOrder.card_last4 ?? undefined,
      identifierTypesPresent: identityEvidence.map((item) => item.identifierType),
    },
    orderHistory: completeOrders.map((order) => ({
      orderId: friendlyOrderId(order),
      date: orderDate(order),
      value: Number(order.total_price ?? 0),
      outcome:
        order.financial_status === 'refunded' || claimedOrderIds.has(order.id)
          ? 'refunded'
          : order.financial_status ?? 'completed',
      isDisputedOrder: order.id === disputedOrder.id,
      isCE3QualifyingTransaction: ce3.priorTransactions.some((prior) => prior.orderId === friendlyOrderId(order)),
    })),
    identityEvidence,
    ce3,
    crossMerchant: { satisfied: false },
    confidenceGrade: 'weak',
    engineVersion: ENGINE_VERSION,
  };
}
