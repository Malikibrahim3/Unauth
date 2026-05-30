/**
 * Cross-merchant identity link detection at ingestion time.
 *
 * SCOPE: exact-hash matches only (email / phone / shipping address / device).
 * Fuzzy name matching is intentionally NOT implemented here — that is a new
 * matching algorithm and CLAUDE.md Ground Rule #1 forbids adding matching logic
 * without explicit sign-off. The 'name_fuzzy_match' link_type exists in the
 * schema for when that is authorised.
 *
 * This is purely additive: it records candidate links in identity_link_candidates
 * and never mutates the existing identity graph / cluster-building logic.
 */
import { TABLES } from '@/lib/supabase/tables';
import type { CustomerIdentityHashes } from '@/lib/support/intake/store';

type ServiceClient = { from: (table: string) => Record<string, unknown> };

export const LINK_CONFIDENCE: Record<string, number> = {
  email_match: 1.0,
  phone_match: 0.9,
  device_match: 0.85,
  address_match: 0.8,
};

export type IdentityLinkCandidate = {
  primary_customer_email_hash: string;
  linked_customer_email_hash: string;
  merchant_id_a: string;
  merchant_id_b: string;
  link_type: string;
  link_confidence: number;
};

type MatchDefinition = {
  field: string;
  value: string | null;
  linkType: keyof typeof LINK_CONFIDENCE;
};

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function matchOtherMerchants(
  client: ServiceClient,
  field: string,
  value: string,
  merchantId: string
): Promise<Array<{ merchant_id: string; customer_email_hash: string }>> {
  const { data, error } = await (client.from(TABLES.CUSTOMER_IDENTITY_SIGNALS) as {
    select: (columns: string) => {
      eq: (col: string, val: string) => {
        neq: (col2: string, val2: string) => Promise<{
          data: Array<Record<string, unknown>> | null;
          error: { message: string } | null;
        }>;
      };
    };
  })
    .select('merchant_id, customer_email_hash')
    .eq(field, value)
    .neq('merchant_id', merchantId);

  if (error) throw new Error(`identity_link_match_failed(${field}): ${error.message}`);

  return (data ?? [])
    .map((row) => ({
      merchant_id: asString(row.merchant_id),
      customer_email_hash: asString(row.customer_email_hash),
    }))
    .filter(
      (row): row is { merchant_id: string; customer_email_hash: string } =>
        !!row.merchant_id && !!row.customer_email_hash
    );
}

async function insertCandidate(
  client: ServiceClient,
  candidate: IdentityLinkCandidate
): Promise<void> {
  const { error } = await (client.from(TABLES.IDENTITY_LINK_CANDIDATES) as {
    upsert: (
      values: Record<string, unknown>,
      opts: { onConflict: string }
    ) => { select: () => { single: () => PromiseLike<{ error: { message: string } | null }> } };
  })
    .upsert(
      { ...candidate, detected_at: new Date().toISOString() },
      {
        onConflict:
          'primary_customer_email_hash,linked_customer_email_hash,merchant_id_a,merchant_id_b,link_type',
      }
    )
    .select()
    .single();

  if (error) throw new Error(`insert_identity_link_candidate_failed: ${error.message}`);
}

/**
 * Detect and persist cross-merchant identity link candidates for the customer
 * just ingested. Returns the candidates recorded. Never throws — linking must
 * not break ingestion (errors are swallowed and an empty list returned).
 */
export async function detectIdentityLinkCandidates(
  supabase: unknown,
  input: { merchantId: string; hashes: CustomerIdentityHashes }
): Promise<IdentityLinkCandidate[]> {
  const client = supabase as ServiceClient;
  const { merchantId, hashes } = input;

  const definitions: MatchDefinition[] = [
    { field: 'customer_email_hash', value: hashes.customer_email_hash, linkType: 'email_match' },
    { field: 'phone_hash', value: hashes.phone_hash, linkType: 'phone_match' },
    { field: 'shipping_address_hash', value: hashes.shipping_address_hash, linkType: 'address_match' },
    { field: 'device_fingerprint', value: hashes.device_fingerprint, linkType: 'device_match' },
  ];

  const created: IdentityLinkCandidate[] = [];
  const seen = new Set<string>();

  try {
    for (const def of definitions) {
      if (!def.value) continue;
      const matches = await matchOtherMerchants(client, def.field, def.value, merchantId);
      for (const match of matches) {
        const candidate: IdentityLinkCandidate = {
          primary_customer_email_hash: hashes.customer_email_hash,
          linked_customer_email_hash: match.customer_email_hash,
          merchant_id_a: merchantId,
          merchant_id_b: match.merchant_id,
          link_type: def.linkType,
          link_confidence: LINK_CONFIDENCE[def.linkType],
        };
        const dedupeKey = `${candidate.linked_customer_email_hash}|${candidate.merchant_id_b}|${candidate.link_type}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        await insertCandidate(client, candidate);
        created.push(candidate);
      }
    }
  } catch {
    // Linking is best-effort; swallow and return whatever was recorded.
  }

  return created;
}
