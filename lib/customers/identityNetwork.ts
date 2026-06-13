// lib/customers/identityNetwork.ts
//
// v2 identity-network access for the merchant-facing customers experience.
//
// SECURITY CONTRACT
// -----------------
// identities / identity_profiles / identity_members / identity_signals are
// service-role-only tables (RLS denies authenticated). Every read here goes
// through the service client AND mirrors the k-anonymity semantics of the
// lookup_network_identity RPC: cross-merchant aggregates are only disclosed
// for identities seen at >= 3 distinct merchants OR identities the querying
// merchant has its own signals for.

import type { SupabaseClient } from '@supabase/supabase-js';
import { hashIdentifier } from '@/lib/identity/hash';
import { normaliseEmail, emailRoot, normalisePhone } from '@/lib/identity/normalise';
import { K_ANONYMITY_MIN } from '@/lib/engine/weights';
import type { ConfidenceGrade } from '@/lib/engine/weights';

export type IdentifierHash = { type: 'email' | 'email_root' | 'phone'; hash: string };

export type NetworkIdentitySummary = {
  identityId: string;
  confidenceGrade: ConfidenceGrade;
  confidenceScore: number;
  merchantCount: number;
  totalOrders: number;
  totalClaims: number;
  totalChargebacks: number;
  claimRate: number | null;
  fastestClaimDays: number | null;
  claimTypeCounts: Record<string, number>;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
};

function isConfidenceGrade(value: unknown): value is ConfidenceGrade {
  return value === 'weak' || value === 'possible' || value === 'probable' || value === 'definite';
}

/**
 * Build the hashed identifier set for a merchant-owned customer record.
 * Only identifier types the customers experience can derive locally.
 */
export function buildCustomerIdentifierHashes(input: {
  email?: string | null;
  phone?: string | null;
}): IdentifierHash[] {
  const hashes: IdentifierHash[] = [];
  const email = normaliseEmail(input.email);
  if (email) hashes.push({ type: 'email', hash: hashIdentifier(email) });
  const root = emailRoot(input.email);
  if (root) hashes.push({ type: 'email_root', hash: hashIdentifier(root) });
  const phone = normalisePhone(input.phone);
  if (phone) hashes.push({ type: 'phone', hash: hashIdentifier(phone) });
  return hashes;
}

type RpcIdentityRow = {
  identity_id: string;
  confidence_grade: string;
  confidence_score: number | string | null;
  merchant_count: number | null;
  total_orders: number | null;
  total_claims: number | null;
  total_chargebacks: number | null;
  claim_rate: number | string | null;
  fastest_claim_days: number | string | null;
  claim_type_counts: Record<string, number> | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
};

/**
 * Resolve the network identity for one customer via the canonical
 * lookup_network_identity RPC (k-anonymity enforced server-side, disclosure
 * logged in network_access_log). Returns the strongest match or null.
 */
export async function lookupNetworkIdentity(
  service: SupabaseClient,
  merchantId: string,
  hashes: IdentifierHash[],
): Promise<NetworkIdentitySummary | null> {
  if (hashes.length === 0) return null;

  const { data, error } = await service.rpc('lookup_network_identity', {
    p_merchant_id: merchantId,
    p_identifier_hashes: hashes.map((h) => ({ type: h.type, hash: h.hash })),
    p_request_ip: null,
  }) as unknown as { data: RpcIdentityRow[] | null; error: { message: string } | null };

  if (error) {
    console.error('[identityNetwork] lookup_network_identity failed:', error.message);
    return null;
  }

  const rows = (data ?? []).filter((row) => isConfidenceGrade(row.confidence_grade));
  if (rows.length === 0) return null;

  // Strongest match first: highest confidence score wins.
  rows.sort((a, b) => Number(b.confidence_score ?? 0) - Number(a.confidence_score ?? 0));
  const row = rows[0]!;

  return {
    identityId: row.identity_id,
    confidenceGrade: row.confidence_grade as ConfidenceGrade,
    confidenceScore: Number(row.confidence_score ?? 0),
    merchantCount: Number(row.merchant_count ?? 0),
    totalOrders: Number(row.total_orders ?? 0),
    totalClaims: Number(row.total_claims ?? 0),
    totalChargebacks: Number(row.total_chargebacks ?? 0),
    claimRate: row.claim_rate == null ? null : Number(row.claim_rate),
    fastestClaimDays: row.fastest_claim_days == null ? null : Number(row.fastest_claim_days),
    claimTypeCounts: row.claim_type_counts ?? {},
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
  };
}

export type IdentityGradeBadge = {
  identityId: string;
  grade: ConfidenceGrade;
  score: number;
  merchantCount: number;
};

/**
 * Batched grade lookup for the customer list page.
 *
 * Maps email hash -> identity grade/merchant-count for one page of customers
 * in three queries (members, identities, own-signal check) instead of one RPC
 * per row. K-anonymity mirror of lookup_network_identity: an identity is only
 * surfaced when merchant_count >= K_ANONYMITY_MIN OR the merchant has its own
 * identity_signals row for the queried hash.
 */
export async function lookupIdentityGradesByEmailHash(
  service: SupabaseClient,
  merchantId: string,
  emailHashes: string[],
): Promise<Map<string, IdentityGradeBadge>> {
  const result = new Map<string, IdentityGradeBadge>();
  const hashes = Array.from(new Set(emailHashes.filter((h) => h.length > 0)));
  if (hashes.length === 0) return result;

  const { data: memberRows, error: memberError } = await service
    .from('identity_members')
    .select('identity_id, identifier_hash')
    .eq('identifier_type', 'email')
    .in('identifier_hash', hashes) as unknown as {
      data: Array<{ identity_id: string; identifier_hash: string }> | null;
      error: { message: string } | null;
    };
  if (memberError) {
    console.error('[identityNetwork] identity_members lookup failed:', memberError.message);
    return result;
  }
  const members = memberRows ?? [];
  if (members.length === 0) return result;

  const identityIds = Array.from(new Set(members.map((m) => m.identity_id)));

  const [identityRes, ownSignalRes] = await Promise.all([
    service
      .from('identities')
      .select('id, confidence_grade, confidence_score, merchant_count')
      .in('id', identityIds)
      .is('superseded_by', null) as unknown as Promise<{
        data: Array<{
          id: string;
          confidence_grade: string;
          confidence_score: number | string | null;
          merchant_count: number | null;
        }> | null;
        error: { message: string } | null;
      }>,
    service
      .from('identity_signals')
      .select('identifier_hash')
      .eq('merchant_id', merchantId)
      .eq('identifier_type', 'email')
      .in('identifier_hash', hashes) as unknown as Promise<{
        data: Array<{ identifier_hash: string }> | null;
        error: { message: string } | null;
      }>,
  ]);

  if (identityRes.error) {
    console.error('[identityNetwork] identities lookup failed:', identityRes.error.message);
    return result;
  }

  const ownHashes = new Set((ownSignalRes.data ?? []).map((r) => r.identifier_hash));
  const identitiesById = new Map(
    (identityRes.data ?? []).map((row) => [row.id, row] as const),
  );

  for (const member of members) {
    const identity = identitiesById.get(member.identity_id);
    if (!identity || !isConfidenceGrade(identity.confidence_grade)) continue;
    const merchantCount = Number(identity.merchant_count ?? 0);
    // k-anonymity discipline (mirrors lookup_network_identity).
    if (merchantCount < K_ANONYMITY_MIN && !ownHashes.has(member.identifier_hash)) continue;
    const existing = result.get(member.identifier_hash);
    const candidate: IdentityGradeBadge = {
      identityId: identity.id,
      grade: identity.confidence_grade,
      score: Number(identity.confidence_score ?? 0),
      merchantCount,
    };
    if (!existing || candidate.score > existing.score) {
      result.set(member.identifier_hash, candidate);
    }
  }

  return result;
}

/**
 * Resolve the identity_id to attach merchant-side state (notes, watchlist,
 * investigation status) to, for a merchant-owned source_customers row.
 *
 * Discipline: only resolves through identifiers the merchant itself has
 * signals for — never discloses anything cross-merchant by itself.
 */
/**
 * Convenience for API routes keyed by source_customers.id: load the
 * merchant-owned customer row, then resolve its identity (own-signal
 * discipline as resolveIdentityIdForCustomer).
 */
export async function resolveIdentityForSourceCustomerId(
  service: SupabaseClient,
  merchantId: string,
  sourceCustomerId: string,
): Promise<{ customer: { id: string; email: string | null; phone: string | null } | null; identityId: string | null }> {
  const { data: customer } = await service
    .from('source_customers')
    .select('id, email, phone')
    .eq('id', sourceCustomerId)
    .eq('merchant_id', merchantId)
    .maybeSingle() as unknown as {
      data: { id: string; email: string | null; phone: string | null } | null;
    };
  if (!customer) return { customer: null, identityId: null };
  const identityId = await resolveIdentityIdForCustomer(service, merchantId, customer);
  return { customer, identityId };
}

export async function resolveIdentityIdForCustomer(
  service: SupabaseClient,
  merchantId: string,
  customer: { email?: string | null; phone?: string | null },
): Promise<string | null> {
  const hashes = buildCustomerIdentifierHashes(customer);
  if (hashes.length === 0) return null;

  const ownSignals = await service
    .from('identity_signals')
    .select('identifier_type, identifier_hash')
    .eq('merchant_id', merchantId)
    .or(hashes.map((h) => `and(identifier_type.eq.${h.type},identifier_hash.eq.${h.hash})`).join(',')) as unknown as {
      data: Array<{ identifier_type: string; identifier_hash: string }> | null;
      error: { message: string } | null;
    };
  if (ownSignals.error || !ownSignals.data || ownSignals.data.length === 0) return null;

  const { data: memberRows } = await service
    .from('identity_members')
    .select('identity_id, match_confidence')
    .or(ownSignals.data.map((s) => `and(identifier_type.eq.${s.identifier_type},identifier_hash.eq.${s.identifier_hash})`).join(',')) as unknown as {
      data: Array<{ identity_id: string; match_confidence: number | string | null }> | null;
    };

  const rows = memberRows ?? [];
  if (rows.length === 0) return null;
  rows.sort((a, b) => Number(b.match_confidence ?? 0) - Number(a.match_confidence ?? 0));
  return rows[0]!.identity_id;
}
