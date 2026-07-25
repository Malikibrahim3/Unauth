import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/send';
import type { CaseInvestigation } from '@/lib/investigations/types';

export type InvestigationDispatch = {
  id: string;
  merchant_id: string;
  investigation_id: string;
  dispatch_kind: 'initial_request' | 'chase';
  channel: 'email';
  idempotency_key: string;
  request_hash: string;
  status: 'requested' | 'processing' | 'accepted' | 'failed';
  lease_token: string | null;
  leased_until: string | null;
  provider_message_id: string | null;
  attempt_count: number;
  last_error: string | null;
  accepted_at: string | null;
  claimed?: boolean;
  replayed?: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function investigationEmailRequestHash(input: {
  investigationId: string;
  recipient: string;
  replyTo: string;
  subject: string;
  body: string;
}): string {
  return createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex');
}

export async function claimInvestigationEmailDispatch(
  client: SupabaseClient,
  input: {
    merchantId: string;
    investigationId: string;
    actorUserId: string;
    idempotencyKey: string;
    requestHash: string;
  },
): Promise<InvestigationDispatch> {
  const { data, error } = await client.rpc('claim_case_investigation_dispatch', {
    p_merchant_id: input.merchantId,
    p_investigation_id: input.investigationId,
    p_dispatch_kind: 'initial_request',
    p_channel: 'email',
    p_idempotency_key: input.idempotencyKey,
    p_request_hash: input.requestHash,
    p_actor_user_id: input.actorUserId,
    p_lease_seconds: 60,
  });
  if (error) throw new Error(`investigation_dispatch_claim_failed:${error.code ?? ''}:${error.message}`);
  return data as InvestigationDispatch;
}

export async function completeInvestigationEmailDispatch(
  client: SupabaseClient,
  input: {
    merchantId: string;
    dispatchId: string;
    leaseToken: string;
    accepted: boolean;
    providerMessageId?: string | null;
    error?: string | null;
  },
): Promise<InvestigationDispatch> {
  const { data, error } = await client.rpc('complete_case_investigation_dispatch', {
    p_merchant_id: input.merchantId,
    p_dispatch_id: input.dispatchId,
    p_lease_token: input.leaseToken,
    p_accepted: input.accepted,
    p_provider_message_id: input.providerMessageId ?? null,
    p_error: input.error ?? null,
  });
  if (error) throw new Error(`investigation_dispatch_complete_failed:${error.code ?? ''}:${error.message}`);
  return data as InvestigationDispatch;
}

export async function sendClaimedInvestigationEmail(input: {
  investigation: CaseInvestigation;
  replyTo: string;
  providerIdempotencyKey: string;
}) {
  const recipient = input.investigation.recipient;
  if (!recipient) {
    return {
      ok: false as const,
      skipped: false,
      error: 'Investigation recipient is missing.',
    };
  }
  return sendEmail({
    to: recipient,
    subject: input.investigation.subject,
    text: input.investigation.request_body,
    html: `<div style="white-space:pre-wrap;font-family:Arial,sans-serif;line-height:1.5">${escapeHtml(input.investigation.request_body)}</div>`,
    replyTo: input.replyTo,
    idempotencyKey: input.providerIdempotencyKey,
  });
}
