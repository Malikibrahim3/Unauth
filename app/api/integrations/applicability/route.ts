import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { setCategoryApplicability } from '@/lib/integrations/applicability';
import type { ApplicableIntegrationCategory, CategoryApplicabilityStatus } from '@/lib/integrations/types';

const bodySchema = z.object({
  category: z.enum(['warehouse_3pl', 'returns']),
  status: z.enum(['applicable', 'not_applicable']),
});

export async function POST(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  try {
    await setCategoryApplicability({
      client: serviceClient,
      merchantId: ctx.merchantId,
      category: parsed.data.category as ApplicableIntegrationCategory,
      status: parsed.data.status as CategoryApplicabilityStatus,
      setBy: user.id,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not save applicability.', code: 'applicability_save_failed' }, { status: 500 });
  }
}
