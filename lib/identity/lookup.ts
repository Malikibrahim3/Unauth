// DEPRECATED — orphaned file, not imported anywhere. Do not use. Cross-merchant
// signal reads from customer_profiles and fraud_entities directly. Retained
// pending cleanup.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';

export interface IdentitySignals {
  emailHash: string;
  phoneHash?: string | null;
  addressShippingHash?: string | null;
  addressBillingHash?: string | null;
  nameHash?: string | null;
  cardFingerprint?: string | null;
  cardBin?: string | null;
  cardLast4?: string | null;
  cardBinLast4?: string | null;
  browserFingerprint?: string | null;
  cookieIdHash?: string | null;
  userAgentHash?: string | null;
  asnHash?: string | null;
  accountIdHash?: string | null;
  ipHash?: string | null;
  deviceIdHash?: string | null;
}

// ---------------------------------------------------------------------------
// Single identity upsert via Postgres RPC (1 round trip instead of ~20)
// ---------------------------------------------------------------------------

export async function upsertIdentity(
  serviceClient: SupabaseClient<Database>,
  signals: IdentitySignals,
  merchantId: string,
  isRefund: boolean,
  isInr: boolean
): Promise<void> {
  const signalPayload: Record<string, string> = {};

  const add = (key: string, val: string | null | undefined) => {
    if (val) signalPayload[key] = val;
  };

  add('email',                signals.emailHash);
  add('phone',                signals.phoneHash);
  add('address_shipping',     signals.addressShippingHash);
  add('address_billing',      signals.addressBillingHash);
  add('name',                 signals.nameHash);
  add('card_fingerprint',     signals.cardFingerprint);
  add('card_bin',             signals.cardBin);
  add('card_last4',           signals.cardLast4);
  add('card_bin_last4',       signals.cardBinLast4);
  add('browser_fingerprint',  signals.browserFingerprint);
  add('cookie_id',            signals.cookieIdHash);
  add('user_agent',           signals.userAgentHash);
  add('asn',                  signals.asnHash);
  add('account_id',           signals.accountIdHash);
  add('ip',                   signals.ipHash);
  add('device',               signals.deviceIdHash);

  // upsert_identity_v2 was dropped with its backing tables (migration 0078);
  // identity observations now flow through ingest_identity_observations()
  // against identity_signals/identity_edges. This legacy path is a no-op
  // until callers are migrated to the v2 ingest pipeline.
  console.warn('identity lookup upsert skipped: legacy upsert_identity_v2 retired', {
    merchantId,
    signalCount: Object.keys(signalPayload).length,
    isRefund,
    isInr,
  });
}
