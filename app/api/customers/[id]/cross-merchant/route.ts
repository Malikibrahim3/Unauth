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
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { normaliseEmail, normaliseIP } from '@/lib/identity/normalise';
import { normalisePhone } from '@/lib/linker';

export const dynamic = 'force-dynamic';

const SIGNAL_TYPE_MAP: Record<string, string> = {
  shared_email: 'shared_email',
  shared_phone: 'shared_phone',
  shared_address: 'shared_address',
  shared_card: 'shared_card',
  shared_ip: 'shared_ip',
  shared_device: 'shared_device',
  shared_account_id: 'shared_account_id',
  refund_velocity: 'refund_velocity',
  chargeback_after_delivery: 'chargeback_after_delivery',
};

type CustomerProfileRow = {
  id: string;
  fraud_flags: unknown;
  emails: unknown;
  phones: unknown;
  ips: unknown;
  card_last4s: unknown;
  merchant_ids: unknown;
};

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

  const { data: profile, error: profileErr } = await serviceClient
    .from(TABLES.CUSTOMER_PROFILES)
    .select('id, fraud_flags, emails, phones, ips, card_last4s, merchant_ids')
    .eq('id', profileId)
    .single();

  if (profileErr || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const row = profile as CustomerProfileRow;
  const merchantIds: string[] = Array.isArray(row.merchant_ids)
    ? (row.merchant_ids as string[])
    : [];
  if (!merchantIds.includes(merchantId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rawFlags: string[] = Array.isArray(row.fraud_flags)
    ? (row.fraud_flags as string[])
    : [];

  const yourStore = rawFlags.flatMap((f) => {
    const sig = SIGNAL_TYPE_MAP[f.toLowerCase().replace(/ /g, '_')];
    return sig
      ? [{ signalType: sig, label: sig.replace(/_/g, ' '), count: 1 }]
      : [];
  });

  const profileEmails: string[] = Array.isArray(row.emails) ? (row.emails as string[]) : [];
  const profilePhones: string[] = Array.isArray(row.phones) ? (row.phones as string[]) : [];
  const profileIps: string[] = Array.isArray(row.ips) ? (row.ips as string[]) : [];

  const entityTypes: Array<{ type: string; value: string }> = [
    ...profileEmails
      .map((v) => normaliseEmail(v))
      .filter((v): v is string => Boolean(v))
      .map((value) => ({ type: 'email', value })),
    ...profilePhones
      .map((v) => normalisePhone(v))
      .filter((v): v is string => Boolean(v))
      .map((value) => ({ type: 'phone', value })),
    ...profileIps
      .map((v) => normaliseIP(v))
      .filter((v): v is string => Boolean(v))
      .map((value) => ({ type: 'ip', value })),
  ];

  let networkEntityCount = 0;
  const networkMap: Map<string, { merchantCount: number; totalOccurrences: number }> = new Map();

  if (entityTypes.length > 0) {
    const entityRowGroups = await Promise.all(
      entityTypes.slice(0, 20).map(async ({ type, value }) => {
        const { data: entityRows } = await serviceClient
          .from('fraud_entities')
          .select('id, entity_type, flagged_count, chargeback_count')
          .eq('entity_type', type)
          .eq('entity_value', value)
          .limit(5);
        return (entityRows ?? []) as Array<{
          id: string;
          entity_type: string;
          flagged_count: number;
          chargeback_count: number;
        }>;
      })
    );

    for (const entityRows of entityRowGroups) {
      for (const entityRow of entityRows) {
        networkEntityCount++;
        const sigKey = `shared_${entityRow.entity_type}`;
        const existing = networkMap.get(sigKey) ?? { merchantCount: 0, totalOccurrences: 0 };
        networkMap.set(sigKey, {
          merchantCount: existing.merchantCount + 1,
          totalOccurrences: existing.totalOccurrences + (entityRow.flagged_count ?? 1),
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
