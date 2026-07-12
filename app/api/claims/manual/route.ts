import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { createManualCase, manualCaseSchema } from '@/lib/cases/createManualCase';

export const dynamic = 'force-dynamic';

/**
 * Create a manual support payout case. Works with no connected commerce/helpdesk
 * source: an order reference is optional and resolved explicitly (confirmed /
 * ambiguous / unmatched) — an unmatched reference is kept as manual_reference,
 * never fabricated into a fake order.
 */
export async function POST(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = manualCaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_manual_case', issues: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) }, { status: 400 });
  }

  try {
    const result = await createManualCase(serviceClient, ctx.merchantId, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'manual_case_create_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
