import type { CsvRow } from './schema';
import type { NormalisedOrder } from '../engine/types';
import { hashIdentifier, normaliseEmail, normaliseAddress, normalisePhone } from '../identity/hash';
import { cleanOrderStatus, cleanRefundStatus, cleanRefundReason, cleanCurrency, cleanGroundTruth, cleanBoolean } from './clean';

export interface NormalisedOrderWithRawEmail extends NormalisedOrder {
  _rawEmail: string;
  _rawIP?: string | null;
  _rawAddress?: string | null;
  _rawPhone?: string | null;
  _rawPostcode?: string | null;
  _rawCardLast4?: string | null;
  _rawCardBin?: string | null;
  _rawDeviceId?: string | null;
  _rawAccountId?: string | null;
}

export function normaliseRow(row: CsvRow): NormalisedOrderWithRawEmail {
  const normEmail = normaliseEmail(row.customer_email ?? '');
  const emailHash = hashIdentifier(normEmail);

  const normAddress = row.shipping_address ? normaliseAddress(row.shipping_address) : null;
  const addressHash = normAddress ? hashIdentifier(normAddress) : null;

  const normPhone = row.customer_phone ? normalisePhone(row.customer_phone) : null;
  const phoneHash = normPhone ? hashIdentifier(normPhone) : null;

  const normName = (row.customer_name ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
  const nameHash = normName ? hashIdentifier(normName) : null;

  const normBilling = row.billing_address ? normaliseAddress(row.billing_address) : null;
  const billingAddressHash = normBilling ? hashIdentifier(normBilling) : null;

  const normIp = row.ip_address ? row.ip_address.trim().toLowerCase() : null;
  const ipHash = normIp ? hashIdentifier(normIp) : null;

  const normDevice = row.device_id ? row.device_id.trim() : null;
  const deviceIdHash = normDevice ? hashIdentifier(normDevice) : null;

  // PSP fingerprints are already pseudonymous; we re-hash with our salt so the
  // raw PSP token is never stored and the hash is consistent across merchants.
  const normCard = row.card_fingerprint ? row.card_fingerprint.trim() : null;
  const cardFingerprint = normCard ? hashIdentifier(normCard) : null;

  // Card BIN: strip non-digits, take first 6–8 chars
  const normBin = row.card_bin ? row.card_bin.replace(/\D/g, '').slice(0, 8) : null;
  const cardBin = normBin && normBin.length >= 6 ? hashIdentifier(normBin) : null;

  // Card last4: strip non-digits, take last 4 chars
  const normLast4 = row.card_last4 ? row.card_last4.replace(/\D/g, '').slice(-4) : null;
  const cardLast4 = normLast4 && normLast4.length === 4 ? hashIdentifier(normLast4) : null;

  // BIN + last4 composite — only computed when both are present; near-unique card identifier
  const cardBinLast4 = normBin && normBin.length >= 6 && normLast4 && normLast4.length === 4
    ? hashIdentifier(`${normBin}:${normLast4}`)
    : null;

  // Browser fingerprint: client-side hash (canvas/WebGL/audio); store as-is after re-hashing
  const normBrowserFp = row.browser_fingerprint ? row.browser_fingerprint.trim() : null;
  const browserFingerprint = normBrowserFp ? hashIdentifier(normBrowserFp) : null;

  // Cookie ID: persistent first-party cookie set by merchant checkout JS
  const normCookieId = row.cookie_id ? row.cookie_id.trim() : null;
  const cookieIdHash = normCookieId ? hashIdentifier(normCookieId) : null;

  // User agent: lowercase and trim before hashing
  const normUserAgent = row.user_agent ? row.user_agent.trim().toLowerCase() : null;
  const userAgentHash = normUserAgent ? hashIdentifier(normUserAgent) : null;

  // ASN: normalise to bare numeric string (strip "AS" prefix, whitespace)
  const normAsn = row.asn ? row.asn.trim().toUpperCase().replace(/^AS/, '') : null;
  const asnHash = normAsn && /^\d+$/.test(normAsn) ? hashIdentifier(normAsn) : null;

  // Account ID: merchant platform account for logged-in customers
  const normAccountId = row.account_id ? row.account_id.trim() : null;
  const accountIdHash = normAccountId ? hashIdentifier(normAccountId) : null;

  const orderDate = new Date(row.order_date);
  const refundDate = row.refund_date ? new Date(row.refund_date) : null;

  const cleanedStatus = cleanOrderStatus(row.order_status) ?? 'completed';
  const cleanedRefundStatus = cleanRefundStatus(row.refund_status) ?? 'none';
  const cleanedRefundReason = cleanRefundReason(row.refund_reason) ?? null;
  const cleanedCurrency = (cleanCurrency(row.currency) || 'GBP').toUpperCase();
  const cleanedGroundTruth = cleanGroundTruth(row.ground_truth_label) ?? null;

  return {
    orderId: row.order_id,
    orderDate,
    emailHash,
    addressHash,
    phoneHash,
    nameHash,
    billingAddressHash,
    ipHash,
    deviceIdHash,
    cardFingerprint,
    cardBin,
    cardLast4,
    cardBinLast4,
    browserFingerprint,
    cookieIdHash,
    userAgentHash,
    asnHash,
    accountIdHash,
    customerNameNorm: normName,
    orderTotal: parseFloat(row.order_total),
    currency: cleanedCurrency,
    orderStatus: cleanedStatus,
    refundStatus: cleanedRefundStatus,
    refundReason: cleanedRefundReason,
    refundDate,
    refundAmount: row.refund_amount ? parseFloat(row.refund_amount) : null,
    paymentMethod: row.payment_method ?? null,
    groundTruthLabel: cleanedGroundTruth,
    // Dispute-history intelligence (§1 consortium signal).
    // Coerced with cleanBoolean which returns null for missing/unrecognised
    // cells so "absent" doesn't silently collapse into false.
    chargebackDispute: cleanBoolean(row.chargeback_dispute),
    refundRequested: cleanBoolean(row.refund_requested),
    returnRequested: cleanBoolean(row.return_requested),
    _rawEmail: row.customer_email,
    _rawIP: normIp,
    _rawAddress: normAddress,
    _rawPhone: normPhone,
    _rawPostcode: row.shipping_postcode?.trim() || row.postcode?.trim() || null,
    _rawCardLast4: normLast4,
    _rawCardBin: normBin,
    _rawDeviceId: normDevice,
    _rawAccountId: normAccountId,
  };
}

export function normaliseRows(rows: CsvRow[]): NormalisedOrderWithRawEmail[] {
  return rows.map(normaliseRow);
}
