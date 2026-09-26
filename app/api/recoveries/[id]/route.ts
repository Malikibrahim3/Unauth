import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { getRecoveryCase } from '@/lib/recoveries/store';
import { TABLES } from '@/lib/supabase/tables';
import { derivePartnerStatistics, deriveRecoveryAgeing } from '@/lib/capabilities/derived';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  const { id } = await params;
  const recoveryCase = await getRecoveryCase(serviceClient, ctx.merchantId, id);
  if (!recoveryCase) return NextResponse.json({ error: 'Recovery case not found' }, { status: 404 });

  const { data: events } = await serviceClient
    .from(TABLES.RECOVERY_CASE_EVENTS)
    .select('*')
    .eq('merchant_id', ctx.merchantId)
    .eq('recovery_case_id', id)
    .order('created_at', { ascending: false });
  const history = (events ?? []) as Array<{ to_status: string | null; created_at: string | null }>;
  const ageing = deriveRecoveryAgeing({
    createdAt: recoveryCase.created_at,
    status: recoveryCase.status,
    deadlineAt: recoveryCase.deadline_at,
    events: history,
  });
  let partnerStatistics = undefined;
  if (recoveryCase.partner_id) {
    const { data: partnerRows } = await serviceClient
      .from(TABLES.RECOVERY_CASES)
      .select('status,created_at,updated_at')
      .eq('merchant_id', ctx.merchantId)
      .eq('partner_id', recoveryCase.partner_id)
      .limit(500);
    partnerStatistics = derivePartnerStatistics(((partnerRows ?? []) as Array<{ status: string | null; created_at: string | null; updated_at: string | null }>).map((row) => ({
      status: row.status,
      createdAt: row.created_at,
      respondedAt: /approved|rejected|paid|credited|reconciled/i.test(row.status ?? '') ? row.updated_at : null,
    })));
  }

  return NextResponse.json({ recoveryCase: { ...recoveryCase, ageing, ...(partnerStatistics ? { partner_statistics: partnerStatistics } : {}) }, events: events ?? [] });
}
