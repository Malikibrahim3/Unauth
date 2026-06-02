import type { NextRequest } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import {
  normaliseEmail,
  normaliseIP,
  normaliseAddress,
  normaliseCard,
} from '@/lib/identity/normalise';
import { hashIdentifier } from '@/lib/identity/hash';

const DAILY_LOOKUP_LIMIT = 200;

const ipMinuteCounts = new Map<string, number>();

function checkIpThrottle(ip: string): boolean {
  const key = `${ip}:${Math.floor(Date.now() / 60000)}`;
  const count = (ipMinuteCounts.get(key) ?? 0) + 1;
  ipMinuteCounts.set(key, count);
  if (ipMinuteCounts.size > 10000) {
    const cutoff = Math.floor(Date.now() / 60000) - 2;
    for (const k of ipMinuteCounts.keys()) {
      const minute = parseInt(k.split(':').pop() ?? '0', 10);
      if (minute < cutoff) ipMinuteCounts.delete(k);
    }
  }
  return count > 10;
}

export type MerchantLookupBody = {
  email?: string;
  name?: string;
  address?: string;
  card?: string;
  ip?: string;
};

export async function performMerchantLookup(
  request: NextRequest,
  body: MerchantLookupBody,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (checkIpThrottle(ip)) {
    return { status: 429, json: { error: 'Too many requests.' } };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 401, json: { error: 'Unauthorized' } };

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.LOOKUP_CUSTOMER);
  if (denied) {
    const deniedJson = await denied.json().catch(() => ({ error: 'Forbidden' }));
    return { status: denied.status, json: deniedJson as Record<string, unknown> };
  }

  const rawEmail = body.email?.trim() ?? '';
  const rawName = body.name?.trim() ?? '';
  const rawAddress = body.address?.trim() ?? '';
  const rawCard = body.card?.trim() ?? '';
  const rawIp = body.ip?.trim() ?? '';

  if (!rawEmail && !rawName && !rawAddress && !rawCard && !rawIp) {
    return { status: 400, json: { error: 'At least one search term is required' } };
  }

  const merchantId = ctx.merchantId;
  const today = new Date().toISOString().slice(0, 10) as unknown as Date;

  const { data: newCount, error: countError } = await service.rpc(
    'increment_lookup_count' as never,
    { p_merchant_id: merchantId, p_date: today },
  );

  if (countError) {
    console.error('[lookup] rate-limit RPC error:', countError.message);
    return { status: 500, json: { error: 'Rate limit check failed' } };
  }

  if ((newCount as number) > DAILY_LOOKUP_LIMIT) {
    return {
      status: 429,
      json: { error: 'Daily lookup limit reached. Limit resets at 00:00 UTC.' },
    };
  }

  const normEmail = rawEmail ? normaliseEmail(rawEmail) : null;
  const normCard = rawCard ? normaliseCard(rawCard) : null;
  const normIp = rawIp ? normaliseIP(rawIp) : null;
  const normAddress = rawAddress ? normaliseAddress(rawAddress) : null;
  const normName = rawName ? rawName.toLowerCase() : null;

  const queriedHashes = [
    normEmail ? hashIdentifier(normEmail) : null,
    normAddress ? hashIdentifier(normAddress) : null,
    normIp ? hashIdentifier(normIp) : null,
    normCard ? hashIdentifier(normCard) : null,
  ].filter(Boolean) as string[];

  const { data: rows, error } = await service.rpc('search_customer_profiles', {
    p_email: null,
    p_name: normName || null,
    p_address: null,
    p_card: null,
    p_ip: null,
    p_email_hash: normEmail ? hashIdentifier(normEmail) : null,
    p_address_hash: normAddress ? hashIdentifier(normAddress) : null,
    p_card_hash: normCard && normCard.length === 4 ? hashIdentifier(normCard) : null,
    p_ip_hash: normIp ? hashIdentifier(normIp) : null,
  });

  if (error) {
    console.error('[lookup] RPC error:', error.message);
    void service.from('access_audit_log').insert({
      merchant_id: merchantId,
      query_type: 'merchant_lookup',
      k_anonymity_satisfied: false,
      result_returned: false,
      queried_hashes: queriedHashes,
      matched_merchant_count: 0,
      lookup_type: 'merchant_lookup',
      request_ip: ip,
    });
    return { status: 500, json: { error: 'Search failed' } };
  }

  const results = (rows ?? []).map((p: Record<string, unknown>) => {
    const merchantIds: string[] = Array.isArray(p.merchant_ids) ? (p.merchant_ids as string[]) : [];
    const merchantContributed = merchantIds.includes(merchantId);

    return {
      id: p.id,
      risk_score: p.risk_score,
      risk_level: p.risk_level,
      fraud_flags: Array.isArray(p.fraud_flags) ? (p.fraud_flags as string[]) : [],
      total_orders: p.total_orders,
      total_refund_claims: p.total_refund_claims,
      total_merchants_seen_at: p.total_merchants_seen_at,
      refund_rate: p.refund_rate,
      fastest_claim_days: p.fastest_claim_days,
      first_seen: p.first_seen,
      last_seen: p.last_seen,
      merchant_contributed: merchantContributed,
      primary_email: merchantContributed ? p.primary_email : null,
      names: merchantContributed ? (Array.isArray(p.names) ? (p.names as string[]) : []) : [],
      addresses: merchantContributed
        ? (Array.isArray(p.addresses) ? (p.addresses as string[]) : [])
        : [],
    };
  });

  const kAnonSatisfied = results.length > 0;
  await new Promise((r) => setTimeout(r, 10 + Math.random() * 40));

  void service.from('access_audit_log').insert({
    merchant_id: merchantId,
    query_type: 'merchant_lookup',
    k_anonymity_satisfied: kAnonSatisfied,
    result_returned: kAnonSatisfied,
    queried_hashes: queriedHashes,
    matched_merchant_count: results.length,
    lookup_type: 'merchant_lookup',
    request_ip: ip,
  }).then((res: { error?: { message: string } | null }) => {
    const auditErr = res?.error;
    if (auditErr) console.error('[lookup] audit_log insert failed (non-fatal):', auditErr.message);
  });

  return { status: 200, json: { results, total: results.length } };
}
