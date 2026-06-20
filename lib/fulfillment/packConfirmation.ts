import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { getAppUrl } from '@/lib/utils/appUrl';
import { env } from '@/lib/utils/env';

type PackConfirmationLinkInput = {
  merchantId: string;
  orderId: string;
  fulfillmentId: string;
  expiresAt: string;
};

function signingSecret(): string {
  return env.INTERNAL_HMAC_SECRET ?? env.IDENTITY_SALT;
}

function signaturePayload(input: PackConfirmationLinkInput): string {
  return `${input.merchantId}.${input.orderId}.${input.fulfillmentId}.${input.expiresAt}`;
}

export function signPackConfirmationLink(input: PackConfirmationLinkInput): string {
  return createHmac('sha256', signingSecret()).update(signaturePayload(input), 'utf8').digest('base64url');
}

export function verifyPackConfirmationSignature(input: PackConfirmationLinkInput & { token: string }): boolean {
  const expected = Buffer.from(signPackConfirmationLink(input));
  const received = Buffer.from(input.token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function buildPackConfirmationUrl(input: Omit<PackConfirmationLinkInput, 'expiresAt'> & {
  expiresAt?: string;
}): string {
  const expiresAt = input.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const token = signPackConfirmationLink({ ...input, expiresAt });
  const url = new URL('/api/fulfillment/pack-confirmation', getAppUrl());
  url.searchParams.set('merchantId', input.merchantId);
  url.searchParams.set('orderId', input.orderId);
  url.searchParams.set('fulfillmentId', input.fulfillmentId);
  url.searchParams.set('expiresAt', expiresAt);
  url.searchParams.set('token', token);
  return url.toString();
}

async function categoryIsNotApplicable(client: SupabaseClient, merchantId: string): Promise<boolean> {
  const { data, error } = await client
    .from(TABLES.CATEGORY_APPLICABILITY)
    .select('status')
    .eq('merchant_id', merchantId)
    .eq('category', 'warehouse_3pl')
    .maybeSingle();
  if (error) throw new Error(`pack_confirmation_applicability_lookup_failed: ${error.message}`);
  return data?.status === 'not_applicable';
}

async function packConfirmationEnabled(client: SupabaseClient, merchantId: string): Promise<boolean> {
  const { data, error } = await client
    .from(TABLES.MERCHANT_INTEGRATIONS)
    .select('status')
    .eq('merchant_id', merchantId)
    .eq('provider_id', 'self_fulfillment_pack')
    .maybeSingle();
  if (error) throw new Error(`pack_confirmation_setting_lookup_failed: ${error.message}`);
  return data?.status === 'connected';
}

async function existingPackConfirmation(
  client: SupabaseClient,
  input: { merchantId: string; orderId: string; fulfillmentId: string },
): Promise<boolean> {
  const { data, error } = await client
    .from(TABLES.PACK_CONFIRMATIONS)
    .select('id')
    .eq('merchant_id', input.merchantId)
    .eq('order_id', input.orderId)
    .eq('fulfillment_id', input.fulfillmentId)
    .maybeSingle();
  if (error) throw new Error(`pack_confirmation_lookup_failed: ${error.message}`);
  return Boolean(data?.id);
}

export async function maybeTriggerPackConfirmation(input: {
  client: SupabaseClient;
  merchantId: string;
  orderId: string;
  fulfillmentId: string;
  recipient?: string | null;
}): Promise<{ requested: boolean; reason?: string; url?: string }> {
  const [notApplicable, enabled, alreadyConfirmed] = await Promise.all([
    categoryIsNotApplicable(input.client, input.merchantId),
    packConfirmationEnabled(input.client, input.merchantId),
    existingPackConfirmation(input.client, input),
  ]);

  if (!notApplicable) return { requested: false, reason: 'warehouse_3pl_applicable' };
  if (!enabled) return { requested: false, reason: 'self_fulfillment_pack_disabled' };
  if (alreadyConfirmed) return { requested: false, reason: 'already_confirmed' };

  const url = buildPackConfirmationUrl(input);
  const notifyUrl = process.env.PACK_CONFIRMATION_NOTIFY_URL?.trim();
  if (!notifyUrl) {
    return { requested: true, reason: 'notification_not_configured', url };
  }

  const response = await fetch(notifyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchantId: input.merchantId,
      orderId: input.orderId,
      fulfillmentId: input.fulfillmentId,
      recipient: input.recipient ?? null,
      url,
    }),
    cache: 'no-store',
  });
  if (!response.ok) {
    return { requested: true, reason: `notification_failed:${response.status}`, url };
  }
  return { requested: true, reason: 'notification_sent' };
}
