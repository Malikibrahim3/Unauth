import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient, createServiceClient } from '@/lib/supabase/server';
import { enforceRateLimit, limitFromEnv, rateLimitKey, getClientIp } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(
    rateLimitKey('account-delete', getClientIp(request.headers)),
    limitFromEnv('RL_ACCOUNT_DELETE_PER_HOUR', 3, 3600)
  );
  if (limited) return limited;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { confirm?: string };
  if (body.confirm !== 'DELETE') {
    return NextResponse.json({ error: 'Confirmation phrase required.' }, { status: 400 });
  }

  const service = createServiceClient();

  // Resolve the merchant owned by this user.
  const { data: merchant } = await service
    .from('merchants')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  const merchantId = (merchant as { id?: string } | null)?.id ?? null;

  if (merchantId) {
    // Delete merchant data in dependency order.
    // Non-fatal failures are logged but don't block account deletion.
    const tables: string[] = [
      'watchlist_appearances',
      'watchlist_entries',
      'customer_profile_audit_appearances',
      'evidence_packages',
      'customer_notes',
      'customer_activity_log',
      'audit_transactions',
      'csv_upload_queue',
      'processing_jobs',
      'merchant_members',
      'access_audit_log',
      'normalisation_learning',
    ];
    for (const table of tables) {
      const { error } = await service
        .from(table as any)
        .delete()
        .eq('merchant_id', merchantId);
      if (error) console.warn(`[account-delete] non-fatal: ${table}:`, error.message);
    }

    // Delete customer profiles where this is the only merchant.
    await service.rpc('delete_orphan_customer_profiles' as any, { p_merchant_id: merchantId }).maybeSingle();

    await service.from('merchants').delete().eq('id', merchantId);
  }

  // Delete the auth user last — this invalidates all sessions.
  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('[account-delete] auth.admin.deleteUser failed:', deleteError.message);
    return NextResponse.json({ error: 'Failed to delete account. Contact support@unauth.app.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
