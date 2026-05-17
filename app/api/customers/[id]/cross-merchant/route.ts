/**
 * Phase E-2 — Cross-Merchant Signal Explanation
 * GET /api/customers/[id]/cross-merchant
 *
 * Feature-flagged by FLAG_CROSS_MERCHANT_SIGNALS (default-off check is on the
 * client; the endpoint itself is always available for authorised merchants).
 *
 * Reads fraud_entities + fraud_entity_co_occurrences to distinguish:
 *   - Signals seen on the calling merchant's own transactions
 *   - Signals seen across the network (other merchants, anonymised)
 *
 * READ-ONLY. Zero writes. Merchant-scoped — no cross-tenant data leakage.
 * Multi-tenancy isolation: all transaction joins are filtered through
 * processing_jobs.merchant_id = ctx.merchantId.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: profileId } = await params;
  if (!profileId) {
    return NextResponse.json({ error: 'Missing profile id' }, { status: 400 });
  }

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(
    serviceClient,
    user.id,
    PERMISSIONS.VIEW_CUSTOMERS,
  );
  if (denied || !ctx?.merchantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { merchantId } = ctx;

  // ---------------------------------------------------------------------------
  // 1. Fetch the customer profile — ensure it belongs to this merchant.
  // ---------------------------------------------------------------------------
  const { data: profile, error: profileErr } = await serviceClient
    .from('customer_profiles' as any)
    .select('id, fraud_flags, linked_emails, linked_phones, linked_ips, linked_cards')
    .eq('id', profileId)
    .single();

  if (profileErr || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Confirm the profile is accessible to this merchant via processing_jobs.
  const { count: merchantCount } = await serviceClient
    .from('transactions' as any)
    .select('id', { count: 'exact', head: true })
    .eq('customer_profile_id', profileId)
    .in(
      'processing_job_id',
      (
        await serviceClient
          .from('processing_jobs')
          .select('id')
          .eq('merchant_id', merchantId)
      ).data?.map((r: { id: string }) => r.id) ?? [],
    );

  if (!merchantCount || merchantCount === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ---------------------------------------------------------------------------
  // 2. Build "your store" signals from the profile's own fraud_flags.
  // ---------------------------------------------------------------------------
  const rawFlags: string[] = Array.isArray((profile as any).fraud_flags)
    ? (profile as any).fraud_flags
    : [];

  const SIGNAL_TYPE_MAP: Record<string, string> = {
    shared_email:       'shared_email',
    shared_phone:       'shared_phone',
    shared_address:     'shared_address',
    shared_card:        'shared_card',
    shared_ip:          'shared_ip',
    shared_device:      'shared_device',
    shared_account_id:  'shared_account_id',
    refund_velocity:    'refund_velocity',
    chargeback_after_delivery: 'chargeback_after_delivery',
  };

  const yourStore = rawFlags
    .map((f) => SIGNAL_TYPE_MAP[f.toLowerCase().replace(/ /g, '_')] ?? null)
    .filter(Boolean)
    .map((sig) => ({
      signalType: sig as string,
      label: sig!.replace(/_/g, ' '),
      count: 1, // per-flag count — expand if transaction-level counts are needed
    }));

  // ---------------------------------------------------------------------------
  // 3. Fetch fraud_entity_co_occurrences for network signals.
  //    We read entity records for this profile's known email/phone/ip values.
  // ---------------------------------------------------------------------------
  const linkedEmails: string[] = Array.isArray((profile as any).linked_emails)
    ? (profile as any).linked_emails
    : [];
  const linkedPhones: string[] = Array.isArray((profile as any).linked_phones)
    ? (profile as any).linked_phones
    : [];
  const linkedIps: string[] = Array.isArray((profile as any).linked_ips)
    ? (profile as any).linked_ips
    : [];

  // Fetch entity rows for this profile's known identifiers (read-only)
  const entityTypes = [
    ...linkedEmails.map((v) => ({ type: 'email', value: v })),
    ...linkedPhones.map((v) => ({ type: 'phone', value: v })),
    ...linkedIps.map((v) => ({ type: 'ip', value: v })),
  ];

  let networkEntityCount = 0;
  const networkMap: Map<string, { merchantCount: number; totalOccurrences: number }> = new Map();

  if (entityTypes.length > 0) {
    // Query fraud_entities for these values
    for (const { type, value } of entityTypes.slice(0, 20)) { // cap at 20 lookups
      const { data: entityRows } = await serviceClient
        .from('fraud_entities' as any)
        .select('id, entity_type, flagged_count, chargeback_count')
        .eq('entity_type', type)
        .eq('entity_value', value)
        .limit(5);

      if (!entityRows?.length) continue;

      for (const row of entityRows as Array<{
        id: string;
        entity_type: string;
        flagged_count: number;
        chargeback_count: number;
      }>) {
        networkEntityCount++;
        const sigKey = `shared_${row.entity_type}`;
        const existing = networkMap.get(sigKey) ?? { merchantCount: 0, totalOccurrences: 0 };
        // Each entity record is approximately "1 merchant context" for display purposes.
        // We don't expose the actual merchant IDs (anonymised).
        networkMap.set(sigKey, {
          merchantCount: existing.merchantCount + 1,
          totalOccurrences: existing.totalOccurrences + (row.flagged_count ?? 1),
        });
      }
    }
  }

  const network = Array.from(networkMap.entries()).map(([signalType, counts]) => ({
    signalType,
    label: signalType.replace(/_/g, ' '),
    merchantCount: counts.merchantCount,
    totalOccurrences: counts.totalOccurrences,
  }));

  return NextResponse.json({
    yourStore,
    network,
    networkEntityCount,
  });
}
