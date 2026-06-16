import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { reorderSchema } from '@/lib/rules/store';

export async function PATCH(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid reorder payload' }, { status: 400 });
  }

  // Update each affected row, scoped to the merchant so a caller can never
  // reprioritise another merchant's rules. Supabase has no multi-row
  // transaction primitive over PostgREST, so we apply the updates in sequence
  // and fail the whole call if any write errors.
  for (const { id, priority } of parsed.data.order) {
    const { error } = await serviceClient
      .from(TABLES.MERCHANT_RULES)
      .update({ priority, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('merchant_id', ctx.merchantId);
    if (error) {
      return NextResponse.json({ error: 'Failed to reorder rules' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
