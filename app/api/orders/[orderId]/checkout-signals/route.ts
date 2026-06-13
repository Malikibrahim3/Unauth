import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';

export const dynamic = 'force-dynamic';

type CheckoutSignalRow = {
  id: string;
  visitor_id: string;
  device_fp: string | null;
  email_hash: string | null;
  account_type: 'guest' | 'registered' | 'unknown' | null;
  checkout_reached: boolean;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
};

function emptySummary() {
  return {
    hasPreOrderSignals: false,
    visitorId: null,
    deviceFp: null,
    checkoutReached: false,
    emailCaptured: false,
    accountType: 'unknown',
    crossMerchantDeviceHits: 0,
    sameVisitorOtherOrders: 0,
    sameDeviceOtherMerchants: 0,
    firstSignalAt: null,
  };
}

function accountTypeFor(signals: CheckoutSignalRow[]): 'guest' | 'registered' | 'unknown' {
  if (signals.some((signal) => signal.account_type === 'registered')) return 'registered';
  if (signals.some((signal) => signal.account_type === 'guest')) return 'guest';
  return 'unknown';
}

function crossMerchantHitsFromPayload(signals: CheckoutSignalRow[]): number {
  return signals.reduce((max, signal) => {
    const value = Number(signal.raw_payload?.cross_merchant_device_hits ?? 0);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_AUDIT);
  if (denied) return denied;

  const { data: order } = await service
    .from(TABLES.AUDIT_TRANSACTIONS)
    .select('id')
    .eq('id', orderId)
    .eq('merchant_id', ctx.merchantId)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: links, error: linkError } = await service
    .from(TABLES.CHECKOUT_SIGNAL_ORDER_LINKS)
    .select('checkout_signal_id')
    .eq('order_id', orderId)
    .eq('merchant_id', ctx.merchantId);
  if (linkError) return NextResponse.json({ error: 'Failed to load checkout signals' }, { status: 500 });

  const signalIds = Array.from(new Set((links ?? []).map((link: { checkout_signal_id: string }) => link.checkout_signal_id)));
  if (signalIds.length === 0) return NextResponse.json(emptySummary());

  const { data: signalRows, error: signalError } = await service
    .from(TABLES.CHECKOUT_SIGNALS)
    .select('id, visitor_id, device_fp, email_hash, account_type, checkout_reached, raw_payload, created_at')
    .eq('merchant_id', ctx.merchantId)
    .in('id', signalIds)
    .order('created_at', { ascending: true });
  if (signalError) return NextResponse.json({ error: 'Failed to load checkout signals' }, { status: 500 });

  const signals = (signalRows ?? []) as CheckoutSignalRow[];
  if (signals.length === 0) return NextResponse.json(emptySummary());

  const visitorId = signals.find((signal) => signal.visitor_id)?.visitor_id ?? null;
  const deviceFp = signals.find((signal) => signal.device_fp)?.device_fp ?? null;
  const summary = {
    hasPreOrderSignals: true,
    visitorId,
    deviceFp,
    checkoutReached: signals.some((signal) => signal.checkout_reached),
    emailCaptured: signals.some((signal) => Boolean(signal.email_hash)),
    accountType: accountTypeFor(signals),
    crossMerchantDeviceHits: crossMerchantHitsFromPayload(signals),
    sameVisitorOtherOrders: 0,
    sameDeviceOtherMerchants: 0,
    firstSignalAt: signals[0]?.created_at ?? null,
  };

  if (visitorId) {
    const { data: visitorSignals } = await service
      .from(TABLES.CHECKOUT_SIGNALS)
      .select('id')
      .eq('merchant_id', ctx.merchantId)
      .eq('visitor_id', visitorId)
      .limit(1000);
    const visitorSignalIds = (visitorSignals ?? []).map((signal: { id: string }) => signal.id);
    if (visitorSignalIds.length > 0) {
      const { data: visitorLinks } = await service
        .from(TABLES.CHECKOUT_SIGNAL_ORDER_LINKS)
        .select('order_id')
        .eq('merchant_id', ctx.merchantId)
        .in('checkout_signal_id', visitorSignalIds)
        .neq('order_id', orderId)
        .limit(1000);
      summary.sameVisitorOtherOrders = new Set(
        (visitorLinks ?? []).map((link: { order_id: string }) => link.order_id)
      ).size;
    }
  }

  if (deviceFp) {
    const { data: deviceSignals } = await service
      .from(TABLES.CHECKOUT_SIGNALS)
      .select('merchant_id')
      .eq('device_fp', deviceFp)
      .neq('merchant_id', ctx.merchantId)
      .limit(1000);
    summary.sameDeviceOtherMerchants = new Set(
      (deviceSignals ?? []).map((signal: { merchant_id: string }) => signal.merchant_id)
    ).size;
  }

  return NextResponse.json(summary);
}
