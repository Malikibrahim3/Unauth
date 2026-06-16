import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { validateWidgetToken } from '@/lib/api/widgetTokens';
import { GORGIAS_WIDGET_TOKEN_HEADER } from '@/lib/support/gorgias/registerSidebarWidget';
import { evaluateSchema, runRuleEvaluation } from '@/lib/rules/store';

export const dynamic = 'force-dynamic';

/**
 * POST /api/rules/evaluate
 *
 * Called by helpdesk widgets after identity resolution. Evaluates the
 * merchant's active rules against the supplied identity signals, writes the
 * audit row, and returns the recommendation.
 *
 * Auth: widget token (header `x-widget-token` or `widget_token` query param).
 * merchant_id is resolved from the token — NEVER from the request body.
 *
 * On any internal failure, returns a graceful 500 so the caller can fail
 * silently and still show identity signals.
 */
function resolveWidgetToken(request: NextRequest): string {
  const headerToken = request.headers.get(GORGIAS_WIDGET_TOKEN_HEADER)?.trim();
  if (headerToken) return headerToken;
  return request.nextUrl.searchParams.get('widget_token')?.trim() ?? '';
}

export async function POST(request: NextRequest) {
  const token = resolveWidgetToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Missing widget token' }, { status: 401 });
  }

  const auth = await validateWidgetToken(token);
  if ('status' in auth) {
    return NextResponse.json({ error: auth.message }, { status: auth.status === 500 ? 500 : 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = evaluateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid evaluation payload' }, { status: 400 });
  }

  try {
    const serviceClient = createServiceClient();
    const result = await runRuleEvaluation({
      client: serviceClient,
      merchantId: auth.merchantId,
      claimId: parsed.data.claim_id ?? null,
      identityId: parsed.data.identity_id ?? null,
      signals: parsed.data.signals,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[rules-engine] evaluate failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 });
  }
}
