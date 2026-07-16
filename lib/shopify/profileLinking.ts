/**
 * LEGACY v1 — NOT part of live Shopify ingestion.
 *
 * `syncShopifyProfilesForShop` builds v1 `customer_profiles` rows, a table dropped
 * in the v2 cutover. It is NOT imported by any app route, API route, webhook, or
 * lib runtime path — live Shopify ingestion resolves identity through the v2
 * identity resolver against `source_orders` / `source_customers` / `identities`.
 * This file is retained only for the standalone repair/test scripts that still
 * reference it.
 * and will not function against the v2 schema. Do not wire it back into runtime.
 */
import { createHash } from 'crypto';
import { normaliseEmail } from '@/lib/identity/normalise';
import { createServiceClient } from '../supabase/server';

type IdentityRow = {
  email: string | null;
  phone: string | null;
  shipping_address: string | null;
  billing_address: string | null;
  customer_id: string | null;
  source_id: string;
};

type OrderSignalRow = {
  shopify_order_id: string;
  customer_id?: string | null;
  risk_level: string | null;
  risk_recommendation: string | null;
  refunds_count: number | null;
  created_at_shopify: string | null;
};

type Anchor = { identity_type: 'email'|'phone'|'shopify_customer_id'|'shopify_order_id'|'address_hash'; identity_value: string };
type ProfileCandidate = {
  id: string;
  merchant_ids?: string[] | null;
  emails?: string[] | null;
  phones?: string[] | null;
  addresses?: string[] | null;
  total_orders?: number | null;
  total_refund_claims?: number | null;
  first_seen?: string | null;
  last_seen?: string | null;
};

function uniq(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v && v.trim().length > 0).map((v) => v.trim())));
}

function hashAddress(value: string | null): string | null {
  if (!value) return null;
  return createHash('sha256').update(value.trim().toLowerCase(), 'utf8').digest('hex');
}

function chooseCanonicalProfile(candidates: ProfileCandidate[]): string | null {
  const sorted = [...candidates]
    .filter((row) => row.id)
    .sort((a, b) => {
      const ordersDelta = Number(b.total_orders ?? 0) - Number(a.total_orders ?? 0);
      if (ordersDelta !== 0) return ordersDelta;
      const aFirst = a.first_seen ?? '';
      const bFirst = b.first_seen ?? '';
      return aFirst.localeCompare(bFirst);
    });
  return sorted[0]?.id ?? null;
}

async function resolveMerchantIdsForShop(service: any, shopDomain: string): Promise<string[]> {
  const { data } = await service.from('merchant_shopify_connections' as any).select('merchant_id').eq('shop_domain', shopDomain).eq('active', true);
  return uniq((data ?? []).map((r: any) => r.merchant_id));
}

async function findProfileCandidates(input: {
  service: any;
  merchantIds: string[];
  anchors: Anchor[];
  emails: string[];
}): Promise<ProfileCandidate[]> {
  const { service, merchantIds, anchors, emails } = input;
  const profileIds = new Set<string>();

  await Promise.all(
    merchantIds.map(async (merchantId) => {
      const grouped = anchors.reduce((acc, a) => {
        (acc[a.identity_type] ||= []).push(a.identity_value);
        return acc;
      }, {} as Record<string, string[]>);
      const identityMatches = await Promise.all(
        Object.entries(grouped).map(async ([t, vals]) => {
          const { data } = await service
            .from('customer_profile_identities' as any)
            .select('customer_profile_id')
            .eq('merchant_id', merchantId)
            .eq('identity_type', t)
            .in('identity_value', uniq(vals));
          return data ?? [];
        })
      );
      for (const rows of identityMatches) {
        for (const row of rows) {
          if (row?.customer_profile_id) profileIds.add(row.customer_profile_id);
        }
      }
    })
  );

  const emailProfileRows = await Promise.all(
    emails.map(async (email) => {
      const [primaryRes, emailArrayRes] = await Promise.all([
        service
          .from('customer_profiles' as any)
          .select('id,merchant_ids,emails,phones,addresses,total_orders,total_refund_claims,first_seen,last_seen')
          .eq('primary_email', email),
        service
          .from('customer_profiles' as any)
          .select('id,merchant_ids,emails,phones,addresses,total_orders,total_refund_claims,first_seen,last_seen')
          .contains('emails', [email]),
      ]);
      return [...(primaryRes.data ?? []), ...(emailArrayRes.data ?? [])];
    })
  );
  for (const rows of emailProfileRows) {
    const merchantIdSet = new Set(merchantIds);
    for (const row of rows) {
      const rowMerchantIds = Array.isArray(row.merchant_ids) ? row.merchant_ids : [];
      if (rowMerchantIds.some((merchantId: string) => merchantIdSet.has(merchantId))) {
        profileIds.add(row.id);
      }
    }
  }

  if (profileIds.size === 0) return [];

  const { data } = await service
    .from('customer_profiles' as any)
    .select('id,merchant_ids,emails,phones,addresses,total_orders,total_refund_claims,first_seen,last_seen')
    .in('id', [...profileIds]);
  return (data ?? []) as ProfileCandidate[];
}

async function mergeDuplicateProfiles(input: {
  service: any;
  canonicalProfileId: string;
  duplicateProfileIds: string[];
}): Promise<void> {
  const { service, canonicalProfileId, duplicateProfileIds } = input;
  const duplicates = uniq(duplicateProfileIds);
  if (duplicates.length === 0) return;

  const { data: duplicateIdentities } = await service
    .from('customer_profile_identities' as any)
    .select('merchant_id,shop_domain,identity_type,identity_value,source')
    .in('customer_profile_id', duplicates);

  const identityRows = (duplicateIdentities ?? []) as Array<{
    merchant_id: string;
    shop_domain: string;
    identity_type: string;
    identity_value: string;
    source: string | null;
  }>;

  if (identityRows.length > 0) {
    await service.from('customer_profile_identities' as any).upsert(
      identityRows.map((identity) => ({
        customer_profile_id: canonicalProfileId,
        merchant_id: identity.merchant_id,
        shop_domain: identity.shop_domain,
        identity_type: identity.identity_type,
        identity_value: identity.identity_value,
        source: identity.source ?? 'shopify',
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'merchant_id,identity_type,identity_value' },
    );
  }

  await Promise.all([
    service
      .from('customer_profile_identities' as any)
      .delete()
      .in('customer_profile_id', duplicates),
    service
      .from('customer_profiles' as any)
      .delete()
      .in('id', duplicates),
  ]);
}

async function countRealShopifyOrdersForProfile(input: {
  service: any;
  merchantIds: string[];
  shopDomain: string;
  profileId: string;
  currentOrderIds: string[];
}): Promise<{ totalOrders: number; totalRefundClaims: number }> {
  const { service, merchantIds, shopDomain, profileId, currentOrderIds } = input;
  const orderIdentitiesPromise = service
    .from('customer_profile_identities' as any)
    .select('identity_value')
    .eq('identity_type', 'shopify_order_id')
    .in('merchant_id', merchantIds)
    .eq('customer_profile_id', profileId);
  const seedSignalsPromise = currentOrderIds.length > 0
    ? service
      .from('shopify_order_signals' as any)
      .select('shopify_order_id,order_number,refunds_count')
      .eq('shop_domain', shopDomain)
      .in('shopify_order_id', currentOrderIds)
    : Promise.resolve({ data: [] as Array<{ shopify_order_id: string | null; order_number: string | null; refunds_count: number | null }> });

  const [{ data: orderIdentities }, { data: seedSignalRows }] = await Promise.all([
    orderIdentitiesPromise,
    seedSignalsPromise,
  ]);

  const orderIds = uniq([
    ...((orderIdentities ?? []).map((row: any) => row.identity_value)),
    ...currentOrderIds,
  ]);
  if (orderIds.length === 0) return { totalOrders: 0, totalRefundClaims: 0 };

  const missingOrderIds = orderIds.filter((orderId) =>
    !(seedSignalRows ?? []).some((row: { shopify_order_id: string | null }) => String(row.shopify_order_id) === orderId),
  );
  const { data: extraSignalRows } = missingOrderIds.length > 0
    ? await service
      .from('shopify_order_signals' as any)
      .select('shopify_order_id,order_number,refunds_count')
      .eq('shop_domain', shopDomain)
      .in('shopify_order_id', missingOrderIds)
    : { data: [] as Array<{ shopify_order_id: string | null; order_number: string | null; refunds_count: number | null }> };

  const signalRows = [...(seedSignalRows ?? []), ...(extraSignalRows ?? [])];

  const realOrderIds = new Set<string>();
  let totalRefundClaims = 0;
  for (const row of signalRows ?? []) {
    const orderNumber = row.order_number == null ? null : String(row.order_number).trim();
    if (orderNumber && !/^\d+$/.test(orderNumber)) continue;
    if (row.shopify_order_id != null) {
      realOrderIds.add(String(row.shopify_order_id));
      totalRefundClaims += Number(row.refunds_count ?? 0);
    }
  }

  return { totalOrders: realOrderIds.size, totalRefundClaims };
}

export async function syncShopifyProfilesForShop(input: { shopDomain: string; supabase?: any; onlyOrderIds?: string[]; }) {
  const service = input.supabase ?? createServiceClient();
  const merchantIds = await resolveMerchantIdsForShop(service, input.shopDomain);
  if (merchantIds.length === 0) return { groups: 0, profilesCreated: 0, profilesLinked: 0, identitiesUpserted: 0 };

  const onlyOrderIds = uniq((input.onlyOrderIds ?? []).map((v) => String(v)));
  let idQuery = service.from('merchant_identities' as any).select('email,phone,shipping_address,billing_address,customer_id,source_id').eq('shop_domain', input.shopDomain).eq('source', 'order');
  if (onlyOrderIds.length) idQuery = idQuery.in('source_id', onlyOrderIds);
  let identities = ((await idQuery).data ?? []) as IdentityRow[];
  if (onlyOrderIds.length && identities.length === 0) {
    identities = ((await service.from('merchant_identities' as any).select('email,phone,shipping_address,billing_address,customer_id,source_id').eq('shop_domain', input.shopDomain).eq('source', 'order')).data ?? []) as IdentityRow[];
  }

  let signalQuery = service
    .from('shopify_order_signals' as any)
    .select('shopify_order_id,customer_id,risk_level,risk_recommendation,refunds_count,created_at_shopify')
    .eq('shop_domain', input.shopDomain);
  if (onlyOrderIds.length) signalQuery = signalQuery.in('shopify_order_id', onlyOrderIds);
  const signalsForScope = ((await signalQuery).data ?? []) as OrderSignalRow[];

  const groupMap = new Map<string, IdentityRow[]>();
  for (const row of identities) {
    const key = (row.customer_id ? `cid:${row.customer_id}` : null) ?? (row.email ? `email:${row.email.toLowerCase()}` : `order:${row.source_id}`);
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(row);
  }
  for (const s of signalsForScope) {
    const key = s.customer_id ? `cid:${String(s.customer_id)}` : `order:${String(s.shopify_order_id)}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, [{
        email: null,
        phone: null,
        shipping_address: null,
        billing_address: null,
        customer_id: s.customer_id ? String(s.customer_id) : null,
        source_id: String(s.shopify_order_id),
      }]);
    }
  }
  const customerIdByOrderId = new Map<string, string>();
  for (const s of signalsForScope) {
    if (s.customer_id) {
      customerIdByOrderId.set(String(s.shopify_order_id), String(s.customer_id));
    }
  }
  for (const orderId of onlyOrderIds) {
    const orderKey = `order:${orderId}`;
    const customerKey = customerIdByOrderId.get(orderId);
    const key = customerKey ? `cid:${String(customerKey)}` : orderKey;
    if (!groupMap.has(key)) {
      groupMap.set(key, [{
        email: null,
        phone: null,
        shipping_address: null,
        billing_address: null,
        customer_id: customerKey ? String(customerKey) : null,
        source_id: orderId,
      }]);
    }
  }

  let profilesCreated = 0;
  let profilesLinked = 0;
  let identitiesUpserted = 0;

  for (const rows of groupMap.values()) {
    const orderIds = uniq(rows.map((r) => String(r.source_id)));
    const emails = uniq(rows.map((r) => normaliseEmail(r.email)));
    const phones = uniq(rows.map((r) => r.phone));
    const addresses = uniq(rows.flatMap((r) => [r.shipping_address, r.billing_address]));
    const customerIds = uniq(rows.map((r) => r.customer_id));

    const { data: signalsRaw } = await service
      .from('shopify_order_signals' as any)
      .select('shopify_order_id,customer_id,risk_level,risk_recommendation,refunds_count,created_at_shopify')
      .eq('shop_domain', input.shopDomain)
      .in('shopify_order_id', orderIds);
    const signals = (signalsRaw ?? []) as OrderSignalRow[];
    for (const s of signals) if (s.customer_id) customerIds.push(String(s.customer_id));

    const anchors: Anchor[] = [
      ...emails.map((v) => ({ identity_type: 'email' as const, identity_value: v })),
      ...phones.map((v) => ({ identity_type: 'phone' as const, identity_value: v })),
      ...uniq(customerIds).map((v) => ({ identity_type: 'shopify_customer_id' as const, identity_value: v })),
      ...orderIds.map((v) => ({ identity_type: 'shopify_order_id' as const, identity_value: v })),
      ...uniq(addresses.map(hashAddress)).map((v) => ({ identity_type: 'address_hash' as const, identity_value: v })),
    ];

    const profileCandidates = await findProfileCandidates({ service, merchantIds, anchors, emails });
    let profileId: string | null = chooseCanonicalProfile(profileCandidates);
    if (profileId) {
      await mergeDuplicateProfiles({
        service,
        canonicalProfileId: profileId,
        duplicateProfileIds: profileCandidates.flatMap((candidate) =>
          candidate.id !== profileId ? [candidate.id] : [],
        ),
      });
    }

    const createdTs = signals.flatMap((r) => r.created_at_shopify ? [r.created_at_shopify] : []).sort();
    const firstSeen = createdTs[0] ?? new Date().toISOString();
    const lastSeen = createdTs[createdTs.length - 1] ?? new Date().toISOString();

    if (!profileId) {
      const ins = await service.from('customer_profiles' as any).insert({
        primary_email: emails[0] ?? null, emails, ips: [], addresses, card_last4s: [], phones, names: [],
        risk_score: 15, risk_level: 'low', fraud_flags: [], total_orders: signals.length, total_refund_claims: signals.reduce((n, r) => n + (r.refunds_count ?? 0), 0),
        total_chargebacks: 0, total_merchants_seen_at: merchantIds.length, refund_rate: 0, refund_timestamps: [], refund_acceleration_score: 0,
        merchant_ids: merchantIds, first_seen: firstSeen, last_seen: lastSeen, profile_confidence: 60, manually_reviewed: false, on_watchlist: false,
      }).select('id').single();
      profileId = ins.data?.id ?? null;
      if (profileId) profilesCreated += 1;
    } else {
      const existing = await service.from('customer_profiles' as any).select('merchant_ids,emails,phones,addresses,total_orders,total_refund_claims,first_seen').eq('id', profileId).single();
      const row = existing.data;
      const counts = await countRealShopifyOrdersForProfile({
        service,
        merchantIds,
        shopDomain: input.shopDomain,
        profileId,
        currentOrderIds: orderIds,
      });
      await service.from('customer_profiles' as any).update({
        merchant_ids: uniq([...(row?.merchant_ids ?? []), ...merchantIds]),
        emails: uniq([...(row?.emails ?? []), ...emails]),
        phones: uniq([...(row?.phones ?? []), ...phones]),
        addresses: uniq([...(row?.addresses ?? []), ...addresses]),
        primary_email: emails[0] ?? null,
        total_orders: counts.totalOrders > 0 ? counts.totalOrders : Number(row?.total_orders ?? 0),
        total_refund_claims: counts.totalOrders > 0 ? counts.totalRefundClaims : Number(row?.total_refund_claims ?? 0),
        first_seen: row?.first_seen ?? firstSeen,
        last_seen: lastSeen,
      }).eq('id', profileId);
      profilesLinked += 1;
    }

    if (!profileId) continue;
    const upsertResults = await Promise.all(
      merchantIds.flatMap((merchantId) =>
        anchors.map((a) =>
          service.from('customer_profile_identities' as any).upsert({
            customer_profile_id: profileId, merchant_id: merchantId, shop_domain: input.shopDomain,
            identity_type: a.identity_type, identity_value: a.identity_value, source: 'shopify', updated_at: new Date().toISOString(),
          }, { onConflict: 'merchant_id,identity_type,identity_value' })
        )
      )
    );
    identitiesUpserted += upsertResults.filter(({ error }) => !error).length;
  }

  return { groups: groupMap.size, profilesCreated, profilesLinked, identitiesUpserted };
}
