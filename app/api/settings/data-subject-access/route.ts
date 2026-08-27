import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { getClientIp } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';

const querySchema = z.object({ subjectId: z.string().uuid() });
const MAX_EXPORT_BYTES = 25 * 1024 * 1024;

async function GETHandler(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.BULK_DELETE);
  if (denied) return denied;
  const parsed = querySchema.safeParse({ subjectId: request.nextUrl.searchParams.get('subjectId') });
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid canonical customer ID is required.' }, { status: 400 });
  }

  const auditedService = createServiceClient({
    audit: {
      actorId: ctx.userId,
      actorRole: ctx.role,
      requestIp: getClientIp(request.headers),
    },
  });
  const { data, error } = await auditedService.rpc('export_merchant_data_subject_v1', {
    p_merchant_id: ctx.merchantId,
    p_subject_id: parsed.data.subjectId,
    p_requested_by: ctx.userId,
  });
  if (error) {
    const status = error.code === 'P0002' ? 404 : 500;
    return NextResponse.json({
      error: status === 404 ? 'Customer not found in this workspace.' : 'Subject access export failed.',
    }, { status });
  }

  const payload = JSON.stringify(data, null, 2);
  if (Buffer.byteLength(payload, 'utf8') > MAX_EXPORT_BYTES) {
    return NextResponse.json({
      error: 'This subject export exceeds the 25 MB synchronous download limit. Contact support with the customer ID for a controlled export.',
    }, { status: 413 });
  }

  return new NextResponse(payload, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="subject-access-${parsed.data.subjectId}.json"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const GET = withRequestLogging('/api/settings/data-subject-access', GETHandler);
