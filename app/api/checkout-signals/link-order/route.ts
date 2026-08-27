import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/ratelimit';
import { validateApiKeyPlaintext } from '@/lib/api/validateApiKey';
import {
  linkCheckoutSignalsToOrder,
  type CheckoutSignalPlatform,
} from '@/lib/checkoutSignals/linkOrder';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLATFORMS = new Set(['shopify', 'woocommerce', 'bigcommerce']);

function text(value: unknown, max = 255): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function POST(request: NextRequest) {
  const key = request.headers.get('X-Unauth-Key')?.trim();
  if (!key) return NextResponse.json({ ok: false }, { status: 401 });

  const auth = await validateApiKeyPlaintext(key, getClientIp(request.headers), 'imports:write');
  if ('status' in auth) {
    return NextResponse.json({ ok: false }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const merchantId = text(body.merchantId, 64);
  const orderId = text(body.orderId, 255);
  const visitorId = text(body.visitorId, 128);
  const platform = text(body.platform, 32);
  if (
    !merchantId ||
    !UUID_RE.test(merchantId) ||
    merchantId !== auth.merchantId ||
    !orderId ||
    !visitorId ||
    !platform ||
    !PLATFORMS.has(platform)
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = createServiceClient();
  await linkCheckoutSignalsToOrder(supabase, {
    merchantId,
    platformOrderId: orderId,
    visitorId,
    platform: platform as CheckoutSignalPlatform,
  });

  return NextResponse.json({ ok: true });
}
