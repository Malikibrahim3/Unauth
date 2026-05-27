export type ClaimForAction = {
  id: string;
  merchant_id: string | null;
  shop_domain: string | null;
  shopify_order_id?: string | null;
  order_ref?: string | null;
  order_source?: string | null;
  customer_id?: string | null;
  claim_type?: string | null;
  status: string;
  amount_at_risk?: number | null;
  currency?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ClaimLoadResult =
  | { claim: ClaimForAction; denied: null }
  | { claim: null; denied: 'not_found' | 'forbidden' };

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

async function fetchClaim(serviceClient: any, claimId: string): Promise<ClaimForAction | null> {
  const extendedSelect = 'id,merchant_id,shop_domain,shopify_order_id,order_ref,order_source,customer_id,claim_type,status,amount_at_risk,currency,submitted_at,created_at,updated_at';
  const baseSelect = 'id,merchant_id,shop_domain,shopify_order_id,customer_id,claim_type,status,amount_at_risk,currency,submitted_at,created_at,updated_at';

  let { data, error } = await serviceClient
    .from('merchant_claims' as any)
    .select(extendedSelect)
    .eq('id', claimId)
    .maybeSingle();

  if (error) {
    const fallback = await serviceClient
      .from('merchant_claims' as any)
      .select(baseSelect)
      .eq('id', claimId)
      .maybeSingle();
    data = fallback.data;
  }

  return data ?? null;
}

export async function loadClaimForMerchant(
  serviceClient: any,
  claimId: string,
  merchantId: string,
): Promise<ClaimLoadResult> {
  const claim = await fetchClaim(serviceClient, claimId);
  if (!claim) return { claim: null, denied: 'not_found' };

  if (claim.merchant_id === merchantId) return { claim, denied: null };
  if (claim.shop_domain && await merchantOwnsShopDomain(serviceClient, merchantId, claim.shop_domain)) {
    return { claim, denied: null };
  }

  return { claim: null, denied: 'forbidden' };
}

export async function updateClaimStatus(
  serviceClient: any,
  claim: ClaimForAction,
  merchantId: string,
  status: string,
) {
  let query = serviceClient
    .from('merchant_claims' as any)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', claim.id);

  if (claim.merchant_id) query = query.eq('merchant_id', merchantId);
  const { data, error } = await query.select().single();
  if (error) throw new Error(`update merchant_claims status failed: ${error.message}`);
  return data;
}
