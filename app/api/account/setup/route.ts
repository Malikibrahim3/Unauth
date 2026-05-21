import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient, createServiceClient } from '@/lib/supabase/server';
import { upsertMerchantForUser } from '@/lib/account/upsertMerchantForUser';

interface SetupBody {
  storeName?: string;
  platform?: string;
  monthlyOrderVolume?: string;
  primaryFraudConcern?: string;
  setupComplete?: boolean;
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as SetupBody;
  const serviceClient = createServiceClient();
  const adminClient = createAdminClient();

  try {
    const merchant = await upsertMerchantForUser(serviceClient, {
      userId: user.id,
      email: user.email,
      storeName: body.storeName ?? (user.user_metadata?.store_name as string | undefined) ?? null,
      platform: body.platform ?? (user.user_metadata?.platform as string | undefined) ?? null,
      monthlyOrderVolume:
        body.monthlyOrderVolume ??
        (user.user_metadata?.monthly_order_volume as string | undefined) ??
        null,
      primaryFraudConcern:
        body.primaryFraudConcern ??
        (user.user_metadata?.primary_fraud_concern as string | undefined) ??
        null,
      setupComplete: body.setupComplete === true,
    });

    const metadataPatch: Record<string, unknown> = {
      ...(user.user_metadata ?? {}),
    };

    if (body.storeName !== undefined) metadataPatch.store_name = body.storeName;
    if (body.platform !== undefined) metadataPatch.platform = body.platform;
    if (body.monthlyOrderVolume !== undefined) metadataPatch.monthly_order_volume = body.monthlyOrderVolume;
    if (body.primaryFraudConcern !== undefined) metadataPatch.primary_fraud_concern = body.primaryFraudConcern;
    metadataPatch.setup_complete = merchant.setup_complete;

    const metadataResult = await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: metadataPatch,
    });

    if (metadataResult.error) {
      throw new Error(`Failed to update account metadata: ${metadataResult.error.message}`);
    }

    return NextResponse.json({ ok: true, merchantId: merchant.id, setupComplete: merchant.setup_complete });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save account setup.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
