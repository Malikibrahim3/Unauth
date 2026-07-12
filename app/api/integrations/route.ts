import { NextResponse } from 'next/server';
import { createAdminClient, createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { getCategoryApplicabilityViews } from '@/lib/integrations/applicability';
import { getShopifyCredential, getStoredIntegrationViews } from '@/lib/integrations/auth';
import { inferPaymentProcessor } from '@/lib/integrations/paymentProcessorInference';
import { integrationProvidersByCategory } from '@/lib/integrations/registry';
import { getShopifyConnectionStatus } from '@/lib/shopify/connectionStatus';
import { detectShopifyPaymentsCoverage } from '@/lib/shopify/detectShopifyPaymentsCoverage';

const VALID_PROCESSOR_SELECTIONS = ['stripe', 'paypal', 'adyen', 'other'] as const;
type ProcessorSelection = (typeof VALID_PROCESSOR_SELECTIONS)[number];

export const dynamic = 'force-dynamic';

async function resolvePaymentSetup(
  serviceClient: ReturnType<typeof createServiceClient>,
  merchantId: string,
) {
  const shopifyStatus = await getShopifyConnectionStatus(serviceClient, merchantId);
  const inferredProcessor = await inferPaymentProcessor(serviceClient, merchantId).catch(() => null);

  if (!shopifyStatus.connected) {
    return {
      shopifyPaymentsCovered: null as boolean | null,
      inferredProcessor,
    };
  }

  const credential = await getShopifyCredential(serviceClient, merchantId);
  if (!credential) {
    return {
      shopifyPaymentsCovered: null as boolean | null,
      inferredProcessor,
    };
  }

  const coverage = await detectShopifyPaymentsCoverage(credential);
  return {
    shopifyPaymentsCovered: coverage === 'covered'
      ? true
      : coverage === 'not_covered'
        ? false
        : null,
    inferredProcessor,
  };
}

export async function GET() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) return denied;

  const rawSelection = (user.user_metadata as Record<string, unknown> | undefined)?.payment_processor_selection;
  const processorSelection: ProcessorSelection | null = VALID_PROCESSOR_SELECTIONS.includes(rawSelection as ProcessorSelection)
    ? (rawSelection as ProcessorSelection)
    : null;

  const [providers, categoryApplicability, paymentSetup] = await Promise.all([
    getStoredIntegrationViews(serviceClient, ctx.merchantId),
    getCategoryApplicabilityViews(serviceClient, ctx.merchantId),
    resolvePaymentSetup(serviceClient, ctx.merchantId),
  ]);
  return NextResponse.json({
    providers,
    categoryApplicability,
    paymentSetup: { ...paymentSetup, processorSelection },
    groups: integrationProvidersByCategory(),
  });
}

export async function POST(request: Request) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const body = await request.json().catch(() => ({})) as { processorSelection?: unknown };
  if (!VALID_PROCESSOR_SELECTIONS.includes(body.processorSelection as ProcessorSelection)) {
    return NextResponse.json({ error: 'Invalid processorSelection value.' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata ?? {}),
      payment_processor_selection: body.processorSelection,
    },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
