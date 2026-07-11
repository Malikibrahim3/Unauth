import { assertClaimStatusTransition } from '@/lib/claims/statusMachine';
import { TABLES } from '@/lib/supabase/tables';

export type ClaimForAction = {
  id: string;
  merchant_id: string;
  source_ticket_id?: string | null;
  source_order_id?: string | null;
  identity_id?: string | null;
  claim_type?: string | null;
  status: string;
  detection_method?: string | null;
  reason_raw?: string | null;
  reason_normalized?: string | null;
  amount_at_risk?: number | null;
  currency?: string | null;
  requires_review?: boolean | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  first_viewed_at?: string | null;
  assigned_to?: string | null;
  assigned_at?: string | null;
  snoozed_until?: string | null;
  state_version?: number;
  _viewRecorded?: boolean;
};

type ClaimLoadResult =
  | { claim: ClaimForAction; denied: null }
  | { claim: null; denied: 'not_found' | 'forbidden' };

const CLAIM_SELECT =
  'id,merchant_id,source_ticket_id,source_order_id,identity_id,claim_type,status,detection_method,reason_raw,reason_normalized,amount_at_risk,currency,requires_review,submitted_at,created_at,updated_at,first_viewed_at,assigned_to,assigned_at,snoozed_until,state_version';

async function fetchClaim(serviceClient: any, claimId: string): Promise<ClaimForAction | null> {
  const { data, error } = await serviceClient
    .from(TABLES.MERCHANT_CLAIMS)
    .select(CLAIM_SELECT)
    .eq('id', claimId)
    .maybeSingle();
  if (error) throw new Error(`select claims failed: ${error.message}`);
  return data ?? null;
}

export async function markClaimViewed(serviceClient: any, claim: ClaimForAction, _merchantId: string, _userId: string) {
  if (claim.first_viewed_at) return { ...claim, _viewRecorded: false };
  const { data, error } = await serviceClient
    .from(TABLES.MERCHANT_CLAIMS)
    .update({ first_viewed_at: new Date().toISOString() })
    .eq('id', claim.id)
    .eq('merchant_id', claim.merchant_id)
    .is('first_viewed_at', null)
    .select(CLAIM_SELECT)
    .maybeSingle();
  if (error) {
    const detail = [error.message, error.details, error.hint, error.code].filter(Boolean).join(' | ');
    throw new Error(`mark claims viewed failed: ${detail}`);
  }
  if (data) return { ...data, _viewRecorded: true };

  // Another concurrent request may have won the first-view update. Treat that
  // as a successful idempotent view instead of returning a noisy 500.
  const fresh = await fetchClaim(serviceClient, claim.id);
  if (fresh?.first_viewed_at) return { ...fresh, _viewRecorded: false };
  throw new Error('mark claims viewed failed: no row updated');
}

export async function updateClaimAssignment(serviceClient: any, claim: ClaimForAction, merchantId: string, assignedTo: string | null) {
  const payload = assignedTo
    ? { assigned_to: assignedTo, assigned_at: new Date().toISOString() }
    : { assigned_to: null, assigned_at: null };
  const { data, error } = await serviceClient
    .from(TABLES.MERCHANT_CLAIMS)
    .update(payload)
    .eq('id', claim.id)
    .eq('merchant_id', merchantId)
    .select(CLAIM_SELECT)
    .single();
  if (error) throw new Error(`update claims assignment failed: ${error.message}`);
  return data;
}

export async function updateClaimSnooze(
  serviceClient: any,
  claim: ClaimForAction,
  merchantId: string,
  snoozedUntil: string | null,
  // v2 claims has no snooze_reason column; the reason is recorded on the
  // claim_snoozed event by the caller.
  _reason: string | null,
) {
  const { data, error } = await serviceClient
    .from(TABLES.MERCHANT_CLAIMS)
    .update({ snoozed_until: snoozedUntil, status: snoozedUntil ? 'pending' : claim.status })
    .eq('id', claim.id)
    .eq('merchant_id', merchantId)
    .select(CLAIM_SELECT)
    .single();
  if (error) throw new Error(`update claims snooze failed: ${error.message}`);
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
  return { claim: null, denied: 'forbidden' };
}

export async function updateClaimStatus(
  serviceClient: any,
  claim: ClaimForAction,
  merchantId: string,
  status: string,
  options: { allowReopen?: boolean } = {},
) {
  const nextStatus = assertClaimStatusTransition(claim.status, status, options);
  const { data, error } = await serviceClient
    .from(TABLES.MERCHANT_CLAIMS)
    .update({ status: nextStatus })
    .eq('id', claim.id)
    .eq('merchant_id', merchantId)
    .select(CLAIM_SELECT)
    .single();
  if (error) throw new Error(`update claims status failed: ${error.message}`);
  return data;
}
