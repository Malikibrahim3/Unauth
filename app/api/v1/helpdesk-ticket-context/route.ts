import { NextRequest, NextResponse } from 'next/server';
import { getSubscribedMerchantTier } from '@/lib/billing/getMerchantTier';
import { TIER_CONFIG } from '@/lib/billing/tiers';
import { createServiceClient } from '@/lib/supabase/server';
import { validateApiKey, isValidatedApiKey } from '@/lib/api/validateApiKey';
import { performHelpdeskTicketContext } from '@/lib/api/v1/helpdeskTicketContext';
import { v1OptionsResponse, withV1Cors } from '@/lib/api/v1/cors';
import { withRequestLogging } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return v1OptionsResponse(request);
}

async function GETHandler(request: NextRequest) {
  const authResult = await validateApiKey(request, 'cases:read');
  if (!isValidatedApiKey(authResult)) return withV1Cors(authResult, request);

  const service = createServiceClient();
  const tier = await getSubscribedMerchantTier(service, authResult.merchantId);
  if (TIER_CONFIG[tier].features.helpdesk_widget !== true) {
    return withV1Cors(
      NextResponse.json(
        {
          error:
            'Helpdesk sidebar context requires a plan that includes the helpdesk widget. Upgrade in Billing settings.',
        },
        { status: 403 },
      ),
      request,
    );
  }

  const { searchParams } = new URL(request.url);
  const rawEmail = searchParams.get('email')?.trim() ?? '';
  if (!rawEmail) {
    return withV1Cors(
      NextResponse.json({ error: 'email query parameter is required' }, { status: 400 }),
      request,
    );
  }

  try {
    const body = await performHelpdeskTicketContext(
      service,
      {
        merchantId: authResult.merchantId,
        apiKeyId: authResult.keyId,
        requestIp: authResult.requestIp,
        auditQueryType: 'zendesk_sidebar',
      },
      {
        rawEmail,
        rawName: searchParams.get('name')?.trim() ?? '',
        orderRef: searchParams.get('order_ref')?.trim() ?? '',
      },
    );

    return withV1Cors(NextResponse.json(body), request);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'helpdesk_context_failed';
    return withV1Cors(NextResponse.json({ error: message }, { status: 500 }), request);
  }
}

export const GET = withRequestLogging('/api/v1/helpdesk-ticket-context', GETHandler);
