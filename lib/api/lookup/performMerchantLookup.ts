import type { NextRequest } from 'next/server';
import {
  getContextCreditCost,
  type ContextUnlockReason,
  type ContextUnlockType,
} from '@/lib/billing/contextCredits';
import {
  creditFailureResponse,
  precheckContextCredits,
  spendContextCreditsAfterSuccess,
} from '@/lib/billing/contextUnlockFlow';
import {
  CONTEXT_REVIEW_DISCLAIMER,
  formatContextLookupResults,
  runContextProfileSearch,
} from '@/lib/api/lookup/contextLookupCore';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';

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
  contextType?: ContextUnlockType;
  claimId?: string;
  ticketRef?: string;
  orderRef?: string;
  customerRef?: string;
  reason?: ContextUnlockReason;
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
  const contextType = body.contextType ?? 'full_context';

  if (!rawEmail && !rawName && !rawAddress && !rawCard && !rawIp) {
    return { status: 400, json: { error: 'At least one search term is required' } };
  }

  const merchantId = ctx.merchantId;
  const creditPrecheck = await precheckContextCredits(service, merchantId, contextType);
  if (!creditPrecheck.ok) {
    return {
      status: creditPrecheck.status,
      json: creditFailureResponse({
        contextType,
        creditsRequired: creditPrecheck.creditsRequired,
        remaining: creditPrecheck.snapshot.remaining,
        error: creditPrecheck.error,
      }),
    };
  }

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

  const search = await runContextProfileSearch(service, {
    rawEmail,
    rawName,
    rawAddress,
    rawCard,
    rawIp,
  });

  if (!search.ok) {
    console.error('[lookup] RPC error:', search.error);
    void service.from('access_audit_log').insert({
      merchant_id: merchantId,
      query_type: 'merchant_lookup',
      k_anonymity_satisfied: false,
      result_returned: false,
      queried_hashes: search.queriedHashes,
      matched_merchant_count: 0,
      lookup_type: 'merchant_lookup',
      request_ip: ip,
    });
    return { status: 500, json: { error: 'Search failed' } };
  }

  const creditSpend = await spendContextCreditsAfterSuccess(service, {
    merchantId,
    userId: user.id,
    contextType,
    claimId: body.claimId ?? null,
    ticketRef: body.ticketRef ?? null,
    orderRef: body.orderRef ?? null,
    customerRef: body.customerRef ?? null,
    reason: body.reason ?? null,
    metadata: {
      request_source: 'app',
      source: 'merchant_lookup',
      requestedIdentifiers: {
        email: Boolean(rawEmail),
        name: Boolean(rawName),
        address: Boolean(rawAddress),
        card: Boolean(rawCard),
        ip: Boolean(rawIp),
      },
    },
  });

  if (!creditSpend.ok) {
    return {
      status: 402,
      json: creditFailureResponse({
        contextType,
        creditsRequired: creditSpend.creditsRequired,
        remaining: creditSpend.snapshot.remaining,
        error: 'Not enough context credits remaining for this review.',
      }),
    };
  }

  const results = formatContextLookupResults(merchantId, contextType, search.rawRows);
  const kAnonSatisfied = results.length > 0;
  await new Promise((r) => setTimeout(r, 10 + Math.random() * 40));

  void service.from('access_audit_log').insert({
    merchant_id: merchantId,
    query_type: 'merchant_lookup',
    k_anonymity_satisfied: kAnonSatisfied,
    result_returned: kAnonSatisfied,
    queried_hashes: search.queriedHashes,
    matched_merchant_count: results.length,
    lookup_type: 'merchant_lookup',
    request_ip: ip,
  }).then((res: { error?: { message: string } | null }) => {
    const auditErr = res?.error;
    if (auditErr) console.error('[lookup] audit_log insert failed (non-fatal):', auditErr.message);
  });

  return {
    status: 200,
    json: {
      results,
      total: results.length,
      contextType,
      creditsSpent: getContextCreditCost(contextType),
      remainingCredits: creditSpend.snapshot.remaining,
      disclaimer: CONTEXT_REVIEW_DISCLAIMER,
    },
  };
}
