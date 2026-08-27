import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient, createServiceClient } from '@/lib/supabase/server';
import { upsertMerchantForUser } from '@/lib/account/upsertMerchantForUser';
import {
  getMerchantProfileById,
  mergeMerchantSettings,
} from '@/lib/account/merchantProfile';
import {
  ACTIVE_MERCHANT_COOKIE,
  hasPermission,
  PERMISSIONS,
  resolveCallerContext,
} from '@/lib/permissions';
import { setCategoryApplicability } from '@/lib/integrations/applicability';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { TABLES } from '@/lib/supabase/tables';

interface SetupBody {
  bootstrapOnly?: boolean;
  storeName?: string;
  platform?: string;
  monthlyOrderVolume?: string;
  primaryLossConcern?: string;
  primaryFraudConcern?: string;
  usesWms3pl?: boolean;
  usesReturnsPlatform?: boolean;
  profileComplete?: boolean;
  deferOnboarding?: boolean;
  setupComplete?: boolean;
}

const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
]);

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
    const selectedMerchantId = request.cookies.get(ACTIVE_MERCHANT_COOKIE)?.value;
    const existingContext = await resolveCallerContext(serviceClient, user.id, selectedMerchantId);
    const { data: anyActiveMembership, error: membershipError } = await serviceClient
      .from(TABLES.MERCHANT_MEMBERS)
      .select('id')
      .eq('user_id', user.id)
      .eq('invite_status', 'active')
      .limit(1)
      .maybeSingle();
    if (membershipError) {
      return NextResponse.json({ error: 'Workspace access could not be verified.' }, { status: 503 });
    }
    if (anyActiveMembership && !existingContext) {
      return NextResponse.json({ error: 'Select an active workspace before changing its profile.' }, { status: 403 });
    }
    if (
      existingContext
      && !await hasPermission(serviceClient, existingContext, PERMISSIONS.MANAGE_SETTINGS)
    ) {
      return NextResponse.json({ error: 'Workspace administration permission is required.' }, { status: 403 });
    }

    const email = user.email?.toLowerCase() ?? '';
    const domain = email.split('@')[1] ?? '';
    const isDemo = Boolean((user.user_metadata as Record<string, unknown> | undefined)?.is_demo);
    const isSkipAction = body.setupComplete === true || body.deferOnboarding === true;
    const isBootstrap = body.bootstrapOnly === true;
    if (body.deferOnboarding === true && (isBootstrap || body.profileComplete === true || body.setupComplete === true)) {
      return NextResponse.json({ error: 'Choose either defer setup or complete setup.' }, { status: 400 });
    }
    if (!isBootstrap && !isSkipAction && !isDemo && (!domain || PERSONAL_EMAIL_DOMAINS.has(domain))) {
      return NextResponse.json(
        { error: 'Use a company email domain to complete merchant verification.' },
        { status: 403 }
      );
    }

    const onboardingDeferredAt = body.deferOnboarding === true
      ? new Date().toISOString()
      : body.profileComplete === true || body.setupComplete === true
        ? null
        : undefined;
    const merchant = await upsertMerchantForUser(serviceClient, {
      userId: user.id,
      email: user.email,
      storeName: body.storeName
        ?? (user.user_metadata?.store_name as string | undefined)
        ?? (isBootstrap ? email.split('@')[0] || 'New workspace' : null),
      platform: body.platform ?? (user.user_metadata?.platform as string | undefined) ?? null,
      monthlyOrderVolume:
        body.monthlyOrderVolume ??
        (user.user_metadata?.monthly_order_volume as string | undefined) ??
        null,
      primaryFraudConcern:
        body.primaryLossConcern ??
        body.primaryFraudConcern ??
        (user.user_metadata?.primary_loss_concern as string | undefined) ??
        (user.user_metadata?.primary_fraud_concern as string | undefined) ??
        null,
      profileComplete:
        !isBootstrap && (body.profileComplete === true || body.setupComplete === true),
      onboardingDeferredAt,
      // Final completion is applied only after the selected provider stack is
      // verified below. Existing completed merchants remain completed.
      setupComplete: false,
    });
    let setupComplete = merchant.setup_complete;
    if (!isBootstrap && body.setupComplete === true && !setupComplete) {
      const connectionState = await getConnectionState(serviceClient, merchant.id);
      if (!connectionState.shopify || !connectionState.helpdesk) {
        return NextResponse.json(
          {
            error:
              'Connect Shopify and one supported helpdesk before completing setup.',
            requirements: {
              shopify: connectionState.shopify,
              helpdesk: connectionState.helpdesk,
            },
          },
          { status: 409 },
        );
      }
      const { data: storedMerchant, error: loadMerchantError } =
        await serviceClient
          .from(TABLES.MERCHANTS)
          .select('settings')
          .eq('id', merchant.id)
          .maybeSingle();
      if (loadMerchantError || !storedMerchant) {
        throw new Error(
          `Failed to verify merchant setup: ${loadMerchantError?.message ?? 'merchant missing'}`,
        );
      }
      const { error: completeError } = await serviceClient
        .from(TABLES.MERCHANTS)
        .update({
          settings: mergeMerchantSettings(storedMerchant.settings, {
            onboarding_profile_complete: true,
            onboarding_deferred_at: null,
            setup_complete: true,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', merchant.id);
      if (completeError) {
        throw new Error(`Failed to complete account setup: ${completeError.message}`);
      }
      setupComplete = true;
    }

    const metadataPatch: Record<string, unknown> = {
      ...(user.user_metadata ?? {}),
    };

    const applicabilityWrites = [];
    if (typeof body.usesWms3pl === 'boolean') {
      applicabilityWrites.push(setCategoryApplicability({
        client: serviceClient,
        merchantId: merchant.id,
        category: 'warehouse_3pl',
        status: body.usesWms3pl ? 'applicable' : 'not_applicable',
        setBy: user.id,
      }));
    }
    if (typeof body.usesReturnsPlatform === 'boolean') {
      applicabilityWrites.push(setCategoryApplicability({
        client: serviceClient,
        merchantId: merchant.id,
        category: 'returns',
        status: body.usesReturnsPlatform ? 'applicable' : 'not_applicable',
        setBy: user.id,
      }));
    }
    await Promise.all(applicabilityWrites);

    if (body.storeName !== undefined) metadataPatch.store_name = body.storeName;
    if (body.platform !== undefined) metadataPatch.platform = body.platform;
    if (body.monthlyOrderVolume !== undefined) metadataPatch.monthly_order_volume = body.monthlyOrderVolume;
    const primaryLossConcern = body.primaryLossConcern ?? body.primaryFraudConcern;
    if (primaryLossConcern !== undefined) {
      metadataPatch.primary_loss_concern = primaryLossConcern;
      metadataPatch.primary_fraud_concern = primaryLossConcern;
    }
    if (body.usesWms3pl !== undefined) metadataPatch.uses_wms_3pl = body.usesWms3pl;
    if (body.usesReturnsPlatform !== undefined) metadataPatch.uses_returns_platform = body.usesReturnsPlatform;
    metadataPatch.onboarding_profile_complete =
      body.profileComplete === true
      || body.setupComplete === true
      || user.user_metadata?.onboarding_profile_complete === true
      || setupComplete;
    if (setupComplete || body.profileComplete === true || body.setupComplete === true) {
      metadataPatch.onboarding_deferred_at = null;
    } else if (onboardingDeferredAt !== undefined) {
      metadataPatch.onboarding_deferred_at = onboardingDeferredAt;
    }
    metadataPatch.setup_complete = setupComplete;

    const metadataResult = await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: metadataPatch,
    });

    if (metadataResult.error) {
      throw new Error(`Failed to update account metadata: ${metadataResult.error.message}`);
    }

    return NextResponse.json({
      ok: true,
      merchantId: merchant.id,
      profileComplete: metadataPatch.onboarding_profile_complete === true,
      onboardingDeferred:
        typeof metadataPatch.onboarding_deferred_at === 'string'
        && metadataPatch.onboarding_deferred_at.length > 0,
      setupComplete,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save account setup.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const ctx = await resolveCallerContext(
    serviceClient,
    user.id,
    request.cookies.get(ACTIVE_MERCHANT_COOKIE)?.value,
  );
  if (!ctx) {
    return NextResponse.json({ user: { email: user.email ?? '' }, merchant: null });
  }

  const merchant = await getMerchantProfileById(serviceClient, ctx.merchantId);

  return NextResponse.json({
    user: { email: user.email ?? '' },
    merchant: merchant
      ? {
          id: merchant.id,
          name: merchant.name,
          monthly_order_volume: merchant.monthly_order_volume,
          primary_fraud_concern: merchant.primary_fraud_concern,
          onboarding_profile_complete: merchant.onboarding_profile_complete,
          setup_complete: merchant.setup_complete,
        }
      : null,
  });
}
