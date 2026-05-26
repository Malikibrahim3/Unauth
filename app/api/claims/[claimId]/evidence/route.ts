import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { createEvidenceItemSchema, upsertClaimEvidenceItem } from '@/lib/claims/store';

async function getClaimShopDomain(serviceClient: any, claimId: string): Promise<string | null> {
  const { data } = await serviceClient
    .from('merchant_claims' as any)
    .select('shop_domain')
    .eq('id', claimId)
    .maybeSingle();
  return data?.shop_domain ?? null;
}

async function merchantOwnsShopDomain(serviceClient: any, merchantId: string, shopDomain: string): Promise<boolean> {
  const { data } = await serviceClient
    .from('merchant_shopify_connections' as any)
    .select('merchant_id')
    .eq('merchant_id', merchantId)
    .eq('shop_domain', shopDomain)
    .eq('active', true)
    .maybeSingle();
  return !!data;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_FRAUD_FEEDBACK);
  if (denied) return denied;

  const { claimId } = await params;
  const claimShopDomain = await getClaimShopDomain(serviceClient, claimId);
  if (!claimShopDomain) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  if (!(await merchantOwnsShopDomain(serviceClient, ctx.merchantId, claimShopDomain))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createEvidenceItemSchema.safeParse({ ...body as object, claim_id: claimId });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid evidence payload' }, { status: 400 });

  try {
    const evidence = await upsertClaimEvidenceItem(serviceClient, {
      ...parsed.data,
      actor_user_id: parsed.data.actor_user_id ?? user.id,
    });
    return NextResponse.json({ evidence: { id: evidence.id, claim_id: evidence.claim_id, evidence_type: evidence.evidence_type, source: evidence.source } });
  } catch {
    return NextResponse.json({ error: 'Failed to add evidence' }, { status: 500 });
  }
}
