import {
  normaliseAddress as normaliseAddressCanonical,
  normaliseEmail as normaliseEmailCanonical,
  normalisePhone as normalisePhoneCanonical,
} from '@/lib/identity/normalise';

export type ShopifyAddress = {
  name?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  zip?: string | null;
  country?: string | null;
};

export type MerchantIdentityInsert = {
  shop_domain: string;
  source: 'order' | 'customer' | 'refund' | 'dispute';
  source_id: string;
  email: string | null;
  phone: string | null;
  shipping_address: string | null;
  billing_address: string | null;
  customer_id: string | null;
  updated_at: string;
};

function normalizeText(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

export function normalizeEmail(value: string | null | undefined): string | null {
  return normaliseEmailCanonical(value);
}

export function normalizePhone(value: string | null | undefined): string | null {
  return normalisePhoneCanonical(value);
}

export function normalizeAddress(address: ShopifyAddress | null | undefined): string | null {
  if (!address) return null;
  const parts = [address.address1, address.address2, address.city, address.province, address.zip, address.country]
    .map((p) => normalizeText(p))
    .filter(Boolean) as string[];
  return parts.length ? normaliseAddressCanonical(parts.join(', ')) : null;
}

export async function upsertMerchantIdentityRows(supabase: any, rows: MerchantIdentityInsert[]) {
  if (!rows.length) return;
  const batchSize = 500;
  const batches = Array.from({ length: Math.ceil(rows.length / batchSize) }, (_, i) =>
    rows.slice(i * batchSize, i * batchSize + batchSize)
  );
  await Promise.all(
    batches.map(async (batch) => {
      const { error } = await supabase
        .from('merchant_identities' as any)
        .upsert(batch as any, { onConflict: 'shop_domain,source,source_id' });
      if (error) throw new Error(error.message);
    })
  );
}
