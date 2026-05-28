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
  first_viewed_at?: string | null;
  first_viewed_by?: string | null;
  assigned_to?: string | null;
  assigned_at?: string | null;
  snoozed_until?: string | null;
  snooze_reason?: string | null;
  last_customer_response_text?: string | null;
  last_customer_response_at?: string | null;
  last_customer_response_by?: string | null;
  _viewRecorded?: boolean;
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
  const extendedSelect = 'id,merchant_id,shop_domain,shopify_order_id,order_ref,order_source,customer_id,claim_type,status,amount_at_risk,currency,submitted_at,created_at,updated_at,first_viewed_at,first_viewed_by,assigned_to,assigned_at,snoozed_until,snooze_reason,last_customer_response_text,last_customer_response_at,last_customer_response_by';
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

export async function markClaimViewed(serviceClient: any, claim: ClaimForAction, merchantId: string, userId: string) {
  if (claim.first_viewed_at) return { ...claim, _viewRecorded: false };
  let query = serviceClient
    .from('merchant_claims' as any)
    .update({ first_viewed_at: new Date().toISOString(), first_viewed_by: userId, updated_at: new Date().toISOString() })
    .eq('id', claim.id)
    .is('first_viewed_at', null);
  if (claim.merchant_id) {
    // Use the claim's actual merchant_id (not caller's merchantId) because
    // loadClaimForMerchant may have authorized via shop_domain when
    // claim.merchant_id differs from the caller's merchantId.
    query = query.eq('merchant_id', claim.merchant_id);
  } else if (claim.shop_domain) {
    query = query.eq('shop_domain', claim.shop_domain);
  } else {
    throw new Error('mark merchant_claims viewed failed: claim missing merchant scope');
  }
  const { data, error } = await query.select().maybeSingle();
  if (error) {
    const detail = [error.message, error.details, error.hint, error.code].filter(Boolean).join(' | ');
    throw new Error(`mark merchant_claims viewed failed: ${detail}`);
  }
  if (data) return { ...data, _viewRecorded: true };

  // Another concurrent request may have won the first-view update. Treat that
  // as a successful idempotent view instead of returning a noisy 500.
  const fresh = await fetchClaim(serviceClient, claim.id);
  if (fresh?.first_viewed_at) return { ...fresh, _viewRecorded: false };
  throw new Error('mark merchant_claims viewed failed: no row updated');
}

export async function updateClaimAssignment(serviceClient: any, claim: ClaimForAction, merchantId: string, assignedTo: string | null) {
  const payload = assignedTo
    ? { assigned_to: assignedTo, assigned_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    : { assigned_to: null, assigned_at: null, updated_at: new Date().toISOString() };
  const { data, error } = await serviceClient
    .from('merchant_claims' as any)
    .update(payload)
    .eq('id', claim.id)
    .eq('merchant_id', merchantId)
    .select()
    .single();
  if (error) throw new Error(`update merchant_claims assignment failed: ${error.message}`);
  return data;
}

export async function updateClaimSnooze(
  serviceClient: any,
  claim: ClaimForAction,
  merchantId: string,
  snoozedUntil: string | null,
  reason: string | null,
) {
  const { data, error } = await serviceClient
    .from('merchant_claims' as any)
    .update({ snoozed_until: snoozedUntil, snooze_reason: reason, status: snoozedUntil ? 'pending' : claim.status, updated_at: new Date().toISOString() })
    .eq('id', claim.id)
    .eq('merchant_id', merchantId)
    .select()
    .single();
  if (error) throw new Error(`update merchant_claims snooze failed: ${error.message}`);
  return data;
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
