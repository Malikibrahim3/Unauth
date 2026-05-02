import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  normaliseEmail,
  normaliseIP,
  normaliseAddress,
  normaliseCard,
} from '@/lib/identity/normalise';
import { hashIdentifier } from '@/lib/identity/hash';

const DAILY_LOOKUP_LIMIT = 200;

// Per-IP per-minute throttle — in-memory Map (per Vercel instance; good enough for MVP)
const ipMinuteCounts = new Map<string, number>();
function checkIpThrottle(ip: string): boolean {
  const key = `${ip}:${Math.floor(Date.now() / 60000)}`;
  const count = (ipMinuteCounts.get(key) ?? 0) + 1;
  ipMinuteCounts.set(key, count);
  // Cleanup old keys periodically to avoid unbounded growth
  if (ipMinuteCounts.size > 10000) {
    const cutoff = Math.floor(Date.now() / 60000) - 2;
    for (const k of ipMinuteCounts.keys()) {
      const minute = parseInt(k.split(':').pop() ?? '0', 10);
      if (minute < cutoff) ipMinuteCounts.delete(k);
    }
  }
  return count > 10;
}

export async function GET(request: NextRequest) {
  // -----------------------------------------------------------------------
  // Per-IP per-minute throttle (must be first — before any DB work)
  // -----------------------------------------------------------------------
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (checkIpThrottle(ip)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rawEmail   = searchParams.get('email')?.trim()   ?? '';
  const rawName    = searchParams.get('name')?.trim()    ?? '';
  const rawAddress = searchParams.get('address')?.trim() ?? '';
  const rawCard    = searchParams.get('card')?.trim()    ?? '';
  const rawIp      = searchParams.get('ip')?.trim()      ?? '';

  if (!rawEmail && !rawName && !rawAddress && !rawCard && !rawIp) {
    return NextResponse.json({ error: 'At least one search term is required' }, { status: 400 });
  }

  // -----------------------------------------------------------------------
  // Rate limiting: atomic per-merchant, per-day hard cap
  // Uses increment_lookup_count RPC which does INSERT ... ON CONFLICT DO UPDATE
  // atomically, so concurrent requests cannot both slip past the limit.
  // -----------------------------------------------------------------------
  const service = createServiceClient();
  const merchantId = user.id;
  const today = new Date().toISOString().slice(0, 10) as unknown as Date;

  const { data: newCount, error: countError } = await service.rpc(
    'increment_lookup_count' as any,
    { p_merchant_id: merchantId, p_date: today }
  );

  if (countError) {
    console.error('[lookup] rate-limit RPC error:', countError.message);
    return NextResponse.json({ error: 'Rate limit check failed' }, { status: 500 });
  }

  if ((newCount as number) > DAILY_LOOKUP_LIMIT) {
    return NextResponse.json(
      { error: 'Daily lookup limit reached. Limit resets at 00:00 UTC.' },
      { status: 429 }
    );
  }

  const normEmail   = rawEmail   ? normaliseEmail(rawEmail)     : null;
  const normCard    = rawCard    ? normaliseCard(rawCard)        : null;
  const normIp      = rawIp      ? normaliseIP(rawIp)            : null;
  const normAddress = rawAddress ? normaliseAddress(rawAddress)  : null;
  const normName    = rawName    ? rawName.toLowerCase()         : null;

  // Pre-hash queried identifiers for audit log (we never log plaintext)
  const queriedHashes = [
    normEmail   ? hashIdentifier(normEmail)   : null,
    normAddress ? hashIdentifier(normAddress) : null,
    normIp      ? hashIdentifier(normIp)      : null,
    normCard    ? hashIdentifier(normCard)    : null,
  ].filter(Boolean) as string[];

  const { data: rows, error } = await service.rpc('search_customer_profiles', {
    p_email:   normEmail  || null,
    p_name:    normName   || null,
    p_address: normAddress || null,
    p_card:    normCard && normCard.length === 4 ? normCard : null,
    p_ip:      normIp     || null,
  });

  if (error) {
    console.error('[lookup] RPC error:', error.message);
    // Still audit the failed attempt (best-effort, non-fatal)
    service.from('access_audit_log').insert({
      merchant_id: merchantId,
      query_type: 'merchant_lookup',
      k_anonymity_satisfied: false,
      result_returned: false,
      queried_hashes: queriedHashes,
      matched_merchant_count: 0,
      lookup_type: 'merchant_lookup',
      request_ip: ip,
    } as any).then(() => {});
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  const results = (rows ?? []).map((p) => {
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
      names:         merchantContributed ? (Array.isArray(p.names) ? (p.names as string[]) : []) : [],
      addresses:     merchantContributed ? (Array.isArray(p.addresses) ? (p.addresses as string[]) : []) : [],
    };
  });

  // -----------------------------------------------------------------------
  // Audit log — one row per lookup attempt regardless of outcome
  // -----------------------------------------------------------------------
  const kAnonSatisfied = results.length > 0;
  // Add small random delay (10–50 ms) so timing cannot distinguish
  // "no results" from "results found but k-anon failing at SQL level"
  await new Promise((r) => setTimeout(r, 10 + Math.random() * 40));

  service.from('access_audit_log').insert({
    merchant_id: merchantId,
    query_type: 'merchant_lookup',
    k_anonymity_satisfied: kAnonSatisfied,
    result_returned: kAnonSatisfied,
    queried_hashes: queriedHashes,
    matched_merchant_count: results.length,
    lookup_type: 'merchant_lookup',
    request_ip: ip,
  } as any).then(({ error: auditErr }) => {
    if (auditErr) console.error('[lookup] audit_log insert failed (non-fatal):', auditErr.message);
  });

  return NextResponse.json({ results, total: results.length });
}
