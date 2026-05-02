import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { normaliseEmail, normaliseIP, normaliseAddress, normaliseCard } from '@/lib/identity/normalise';
import { buildFastContext } from '@/lib/engine/fastContext';
import { scoreBatch } from '@/lib/engine/fastScore';
import { buildIdentityClusters } from '@/lib/engine/identityMatching';
import { hashIdentifier } from '@/lib/identity/hash';
import type { NormalisedOrder } from '@/lib/engine/types';

const DAILY_LOOKUP_LIMIT = 200;

// Shared IP throttle map (imported from the main lookup route at runtime they
// are different module instances on Vercel, so each module tracks independently)
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

export async function POST(request: NextRequest) {
  // Per-IP per-minute throttle
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (checkIpThrottle(ip)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const rawEmail   = (body.email   ?? '').trim();
  const rawName    = (body.name    ?? '').trim();
  const rawAddress = (body.address ?? '').trim();
  const rawCard    = (body.card_last4 ?? '').trim();
  const rawIP      = (body.ip      ?? '').trim();

  if (!rawEmail && !rawName && !rawAddress && !rawCard && !rawIP) {
    return NextResponse.json({ error: 'At least one field is required' }, { status: 400 });
  }

  // Shared rate limit with the main lookup endpoint
  const service = createServiceClient();
  const merchantId = user.id;
  const today = new Date().toISOString().slice(0, 10) as unknown as Date;

  const { data: newCount, error: countError } = await service.rpc(
    'increment_lookup_count' as any,
    { p_merchant_id: merchantId, p_date: today }
  );

  if (countError) {
    return NextResponse.json({ error: 'Rate limit check failed' }, { status: 500 });
  }

  if ((newCount as number) > DAILY_LOOKUP_LIMIT) {
    return NextResponse.json(
      { error: 'Daily lookup limit reached. Limit resets at 00:00 UTC.' },
      { status: 429 }
    );
  }

  const normEmail   = rawEmail   ? normaliseEmail(rawEmail)    : '';
  const normAddress = rawAddress ? normaliseAddress(rawAddress) : '';
  const normCard    = rawCard    ? normaliseCard(rawCard)       : '';
  const normIP      = rawIP      ? normaliseIP(rawIP)           : '';

  // Build a synthetic single-row NormalisedOrder from the submitted fields
  const syntheticOrder: NormalisedOrder & {
    _rawEmail?: string;
    _rawIP?: string | null;
    _rawAddress?: string | null;
    _rawCardLast4?: string | null;
  } = {
    orderId: 'quick-check',
    orderDate: new Date(),
    emailHash: normEmail ? hashIdentifier(normEmail) : hashIdentifier(`anon-${Date.now()}`),
    addressHash: normAddress ? hashIdentifier(normAddress) : null,
    phoneHash: null,
    nameHash: rawName ? hashIdentifier(rawName.toLowerCase()) : null,
    ipHash: normIP ? hashIdentifier(normIP) : null,
    cardLast4: normCard || null,
    customerNameNorm: rawName.toLowerCase() || 'unknown',
    orderTotal: 0,
    currency: 'GBP',
    orderStatus: 'completed',
    refundStatus: 'none',
    refundReason: null,
    refundDate: null,
    refundAmount: null,
    paymentMethod: null,
    _rawEmail: normEmail || undefined,
    _rawIP: normIP || null,
    _rawAddress: normAddress || null,
    _rawCardLast4: normCard || null,
  };

  try {
    // Build context — queries fraud_entities and co_occurrences for the submitted values
    const ctx = await buildFastContext([syntheticOrder], service as any);

    // Build identity cluster map (will be empty for a single order, which is fine)
    const clusterMap = await buildIdentityClusters([syntheticOrder], ctx);

    // Score the synthetic order
    const [scored] = scoreBatch([syntheticOrder], ctx, clusterMap);

    // Collect matching historical entity records for display
    const matchingEntities: Array<{ type: string; value: string; record: object }> = [];
    if (normEmail) {
      const rec = ctx.historicalEmailMap.get(normEmail);
      if (rec) matchingEntities.push({ type: 'email', value: normEmail, record: rec });
    }
    if (normIP) {
      const rec = ctx.historicalIPMap.get(normIP);
      if (rec) matchingEntities.push({ type: 'ip', value: normIP, record: rec });
    }
    if (normAddress) {
      const rec = ctx.historicalAddressMap.get(normAddress);
      if (rec) matchingEntities.push({ type: 'address', value: normAddress, record: rec });
    }
    if (normCard) {
      const rec = ctx.historicalCardMap.get(normCard);
      if (rec) matchingEntities.push({ type: 'card_last4', value: normCard, record: rec });
    }

    const hasHistory = matchingEntities.length > 0;

    // Audit log — one row per attempt
    const queriedHashes = [
      normEmail   ? hashIdentifier(normEmail)   : null,
      normAddress ? hashIdentifier(normAddress) : null,
      normIP      ? hashIdentifier(normIP)      : null,
      normCard    ? hashIdentifier(normCard)    : null,
    ].filter(Boolean) as string[];

    service.from('access_audit_log').insert({
      merchant_id: merchantId,
      query_type: 'quick_score',
      k_anonymity_satisfied: hasHistory,
      result_returned: true,
      queried_hashes: queriedHashes,
      matched_merchant_count: matchingEntities.length,
      lookup_type: 'quick_score',
      request_ip: ip,
    } as any).then(({ error: auditErr }) => {
      if (auditErr) console.error('[quick-score] audit_log insert failed (non-fatal):', auditErr.message);
    });

    return NextResponse.json({
      score: scored.totalScore,
      riskTier: scored.riskTier,
      flagged: scored.flagged,
      signals: scored.signals.filter((s) => s.fired).map((s) => ({
        name: s.name,
        score: s.score,
        reason: s.reason,
      })),
      matchingEntities,
      hasHistory,
      caveat: !hasHistory
        ? "No history found for this customer. A blank result is not a green light — it may be their first appearance."
        : null,
    });
  } catch (err) {
    console.error('[quick-score] error:', err);
    return NextResponse.json({ error: 'Scoring failed' }, { status: 500 });
  }
}
