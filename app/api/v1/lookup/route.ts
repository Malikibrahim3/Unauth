import { NextRequest, NextResponse } from 'next/server';
import { getSubscribedMerchantTier } from '@/lib/billing/getMerchantTier';
import {
  creditFailureResponse,
  precheckContextCredits,
  spendContextCreditsAfterSuccess,
} from '@/lib/billing/contextUnlockFlow';
import { TIER_CONFIG } from '@/lib/billing/tiers';
import { createServiceClient } from '@/lib/supabase/server';
import { validateApiKey, isValidatedApiKey } from '@/lib/api/validateApiKey';
import { performV1Lookup } from '@/lib/api/v1/lookup';
import { v1OptionsResponse, withV1Cors } from '@/lib/api/v1/cors';
import { withRequestLogging } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return v1OptionsResponse(request);
}

async function GETHandler(request: NextRequest) {
  const authResult = await validateApiKey(request);
  if (!isValidatedApiKey(authResult)) return withV1Cors(authResult, request);

  const service = createServiceClient();
  const tier = await getSubscribedMerchantTier(service, authResult.merchantId);
  if (TIER_CONFIG[tier].features.lookup_api !== true) {
    return withV1Cors(
      NextResponse.json(
        {
          error:
            'Case-scoped API lookup is available on Scale plans where enabled. Use the app or helpdesk widget for credit-based context review.',
        },
        { status: 403 },
      ),
      request,
    );
  }

  const creditPrecheck = await precheckContextCredits(
    service,
    authResult.merchantId,
    'api_enrichment',
  );
  if (!creditPrecheck.ok) {
    return withV1Cors(
      NextResponse.json(
        creditFailureResponse({
          contextType: 'api_enrichment',
          creditsRequired: creditPrecheck.creditsRequired,
          remaining: creditPrecheck.snapshot.remaining,
          error: creditPrecheck.error,
        }),
        { status: creditPrecheck.status },
      ),
      request,
    );
  }

  const { searchParams } = new URL(request.url);
  const ticketRef = searchParams.get('ticket_ref')?.trim() ?? null;
  const orderRef = searchParams.get('order_ref')?.trim() ?? null;
  const claimId = searchParams.get('claim_id')?.trim() ?? null;

  const result = await performV1Lookup(
    service,
    {
      merchantId: authResult.merchantId,
      apiKeyId: authResult.keyId,
      requestIp: authResult.requestIp,
    },
    {
      rawEmail: searchParams.get('email')?.trim() ?? '',
      rawName: searchParams.get('name')?.trim() ?? '',
      rawAddress: searchParams.get('address')?.trim() ?? '',
      rawCard: searchParams.get('card')?.trim() ?? '',
      rawIp: searchParams.get('ip')?.trim() ?? '',
      rawPhone: searchParams.get('phone')?.trim() ?? '',
    },
  );

  if (!result.ok) {
    return withV1Cors(
      NextResponse.json({ error: result.error }, { status: result.status }),
      request,
    );
  }

  const creditSpend = await spendContextCreditsAfterSuccess(service, {
    merchantId: authResult.merchantId,
    contextType: 'api_enrichment',
    claimId,
    ticketRef,
    orderRef,
    metadata: { request_source: 'api' },
  });

  if (!creditSpend.ok) {
    return withV1Cors(
      NextResponse.json(
        creditFailureResponse({
          contextType: 'api_enrichment',
          creditsRequired: creditSpend.creditsRequired,
          remaining: creditSpend.snapshot.remaining,
          error: 'Not enough context credits remaining for this API context request.',
        }),
        { status: 402 },
      ),
      request,
    );
  }

  return withV1Cors(NextResponse.json(result.body), request);
}

export const GET = withRequestLogging('/api/v1/lookup', GETHandler);
