import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';

/**
 * Open match candidates awaiting resolution, merchant-scoped. Optional
 * `subjectType`/`subjectId` filters narrow to one subject (e.g. a case).
 */
export async function GET(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const subjectType = searchParams.get('subjectType');
  const subjectId = searchParams.get('subjectId');

  let query = serviceClient
    .from(TABLES.RECORD_MATCH_CANDIDATES)
    .select('*')
    .eq('merchant_id', ctx.merchantId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(200);
  if (subjectType) query = query.eq('subject_entity_type', subjectType);
  if (subjectId) query = query.eq('subject_entity_id', subjectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'match_list_failed' }, { status: 500 });
  return NextResponse.json({ candidates: data ?? [] });
}
