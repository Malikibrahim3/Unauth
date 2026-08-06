import { createHash } from 'node:crypto';
import { z } from 'zod';
import { hashIdentifier } from '@/lib/identity/hash';
import {
  normaliseAddress,
  normaliseEmail,
  normaliseIP,
  normalisePhone,
} from '@/lib/identity/normalise';
import { TABLES } from '@/lib/supabase/tables';
import {
  SUPPORT_PROVIDER_CONNECTION_STATUSES,
  SUPPORT_PROVIDERS,
  type PublicSupportProviderConnection,
  type SupportProvider,
  type SupportProviderConnectionRow,
} from '@/lib/support/providers/types';

const supportProviderSchema = z.enum(SUPPORT_PROVIDERS);

const connectionStatusSchema = z.enum(SUPPORT_PROVIDER_CONNECTION_STATUSES);

const TOKEN_FIELDS = ['access_token_encrypted', 'refresh_token_encrypted'] as const;

export function normalizeProviderName(value: string): SupportProvider {
  const normalized = value.trim().toLowerCase();
  return supportProviderSchema.parse(normalized);
}

export function hashSupportIdentifier(value: string): string {
  return hashIdentifier(value.trim().toLowerCase());
}

export function hashSupportEmail(email: string): string {
  const normalized = normaliseEmail(email);
  if (!normalized) {
    throw new Error('invalid email for support intake hash');
  }
  return hashIdentifier(normalized);
}

export function hashRawPayload(payload: unknown): string {
  const canonical =
    payload === null || payload === undefined
      ? ''
      : typeof payload === 'string'
        ? payload
        : JSON.stringify(payload);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

const ORDER_REF_PATTERNS: Array<{ pattern: RegExp; group: number }> = [
  { pattern: /\b(ORD-\d{4}-\d+)\b/i, group: 1 },
  { pattern: /\b(SM-\d{4}-\d+)\b/i, group: 1 },
  // "order number 1008", "order no. 1008", "order no 1008", "order num 1008".
  // Must precede the looser "order #? <digits>" rule below so the qualifier is consumed.
  { pattern: /\border\s*(?:number|no|num)\.?\s*:?\s*#?\s*(\d{3,})\b/i, group: 1 },
  { pattern: /\border\s*#?\s*(\d{3,})\b/i, group: 1 },
  { pattern: /#(\d{3,})\b/, group: 1 },
];

export function extractOrderRefFromText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  for (const { pattern, group } of ORDER_REF_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[group]) {
      return match[group];
    }
  }

  return null;
}

export function toPublicSupportProviderConnection(
  row: SupportProviderConnectionRow
): PublicSupportProviderConnection {
  const {
    access_token_encrypted: _a,
    refresh_token_encrypted: _r,
    webhook_secret_hash: _wh,
    webhook_secret_created_at: _wc,
    webhook_secret_rotated_at: _wr,
    ...safe
  } = row as SupportProviderConnectionRow & {
    webhook_secret_hash?: string | null;
    webhook_secret_created_at?: string | null;
    webhook_secret_rotated_at?: string | null;
  };
  return safe;
}

function stripForbiddenIntakeFields<T extends Record<string, unknown>>(payload: T): T {
  const cleaned = { ...payload };
  for (const key of [
    'raw_payload',
    'rawPayload',
    'customer_email',
    'customerEmail',
    'access_token',
    'access_token_encrypted',
    'refresh_token_encrypted',
    ...TOKEN_FIELDS,
  ]) {
    delete cleaned[key];
  }
  return cleaned;
}

const upsertConnectionSchema = z.object({
  merchant_id: z.string().uuid(),
  provider: supportProviderSchema,
  provider_account_id: z.string().nullable().optional(),
  provider_account_name: z.string().nullable().optional(),
  provider_base_url: z.string().nullable().optional(),
  status: connectionStatusSchema.default('active'),
  access_token_encrypted: z.string().nullable().optional(),
  refresh_token_encrypted: z.string().nullable().optional(),
  token_expires_at: z.string().datetime().nullable().optional(),
  scopes: z.array(z.unknown()).default([]),
  last_sync_at: z.string().datetime().nullable().optional(),
  last_error: z.string().nullable().optional(),
  webhook_secret_hash: z.string().nullable().optional(),
  webhook_secret_created_at: z.string().datetime().nullable().optional(),
  webhook_secret_rotated_at: z.string().datetime().nullable().optional(),
});

/**
 * External-provider timestamps (Gorgias/Zendesk/etc.) arrive in assorted valid
 * ISO-8601 forms — `Z`, numeric offsets like `+00:00`, and 6-digit microsecond
 * fractions — that Zod's strict `.datetime()` rejects. Accept anything the JS
 * Date parser understands and canonicalise to `…Z`. Genuinely invalid strings
 * still fail; null/undefined pass through (handled by `.nullable().optional()`).
 * Empty strings are normalised to `null` upstream by `asString`, so they never
 * reach here as `''` — and if one did, Date.parse rejects it (never coerced to now).
 *
 * Scoped to provider timestamps only — internal/auth timestamps stay strict.
 */
const providerTimestamp = z
  .string()
  .nullable()
  .optional()
  .transform((value, ctx) => {
    if (value === null || value === undefined) return value;
    const ms = Date.parse(value);
    if (Number.isNaN(ms)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid datetime' });
      return z.NEVER;
    }
    return new Date(ms).toISOString();
  });

const upsertCaseSchema = z.object({
  merchant_id: z.string().uuid(),
  provider: supportProviderSchema,
  provider_connection_id: z.string().uuid().nullable().optional(),
  external_case_id: z.string().min(1),
  external_url: z.string().nullable().optional(),
  customer_email: z.string().email().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  ticket_subject: z.string().nullable().optional(),
  customer_email_hash: z.string().nullable().optional(),
  customer_identifier: z.string().nullable().optional(),
  order_ref: z.string().nullable().optional(),
  shop_domain: z.string().nullable().optional(),
  claim_reason: z.string().nullable().optional(),
  customer_message_summary: z.string().nullable().optional(),
  agent_notes_summary: z.string().nullable().optional(),
  case_status: z.string().nullable().optional(),
  decision: z.string().nullable().optional(),
  outcome: z.string().nullable().optional(),
  attachments_metadata: z.array(z.unknown()).default([]),
  tags: z.array(z.unknown()).default([]),
  raw_payload: z.unknown().optional(),
  raw_payload_hash: z.string().optional(),
  created_at_provider: providerTimestamp,
  updated_at_provider: providerTimestamp,
  opened_at_provider: providerTimestamp,
  closed_at_provider: providerTimestamp,
  // Additive claim-intelligence signals (see classifyClaim.ts / normalizeTicket.ts).
  channel: z.string().nullable().optional(),
  message_count: z.number().int().nullable().optional(),
  customer_reply_count: z.number().int().nullable().optional(),
  was_reopened: z.boolean().nullable().optional(),
  macros_used: z.array(z.string()).default([]),
  sentiment_score: z.number().nullable().optional(),
  chargeback_threatened: z.boolean().optional(),
  is_claim: z.boolean().optional(),
  claim_type: z.enum(['INR', 'missing_item', 'damaged', 'wrong_item', 'not_as_described', 'other']).nullable().optional(),
  claim_type_confidence: z.number().min(0).max(1).nullable().optional(),
  provided_evidence: z.boolean().nullable().optional(),
  accepted_first_resolution: z.boolean().nullable().optional(),
  resolution_type: z.string().nullable().optional(),
  escalation_count: z.number().int().nullable().optional(),
  time_to_first_claim_message_seconds: z.number().int().nullable().optional(),
  detection_method: z.enum(['tag', 'keyword_fallback', 'manual', 'shopify_dispute']).default('keyword_fallback'),
  trigger_tag: z.string().nullable().optional(),
  trigger_tags: z.array(z.string()).default([]),
  requires_merchant_review: z.boolean().optional(),
  keyword_matched: z.string().nullable().optional(),
});

const appendEventSchema = z.object({
  merchant_id: z.string().uuid(),
  support_case_id: z.string().uuid(),
  provider: supportProviderSchema,
  event_type: z.string().min(1),
  event_summary: z.string().nullable().optional(),
  actor_type: z.string().nullable().optional(),
  actor_identifier: z.string().nullable().optional(),
  occurred_at_provider: providerTimestamp,
  metadata: z.record(z.unknown()).default({}),
  raw_payload: z.unknown().optional(),
  raw_payload_hash: z.string().nullable().optional(),
});

type SupabaseUpsertClient = {
  from: (table: string) => {
    upsert: (
      payload: Record<string, unknown>,
      opts: { onConflict: string }
    ) => {
      select: (columns?: string) => {
        // PromiseLike (not Promise): the real Supabase query builder is a thenable, not a
        // full Promise. Typing it this way lets the production SupabaseClient satisfy this
        // structural type while still accepting the async-function mocks used in tests.
        single: () => PromiseLike<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
      };
    };
  };
};

type SupabaseInsertClient = {
  from: (table: string) => {
    insert: (payload: Record<string, unknown>) => {
      select: (columns?: string) => {
        single: () => PromiseLike<{
          data: Record<string, unknown> | null;
          error: { message: string; code?: string } | null;
        }>;
      };
    };
    // Used to return the existing event on an idempotent replay (23505).
    select: (columns?: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
      };
    };
  };
};

const CONNECTION_SELECT_PUBLIC =
  'id,merchant_id,provider,provider_account_id,provider_account_name,provider_base_url,status,token_expires_at,scopes,last_sync_at,last_error,created_at,updated_at';

export async function upsertSupportProviderConnection(
  supabase: SupabaseUpsertClient,
  input: z.input<typeof upsertConnectionSchema>
) {
  const parsed = upsertConnectionSchema.parse(input);
  const now = new Date().toISOString();
  const payload = stripForbiddenIntakeFields({
    ...parsed,
    provider: normalizeProviderName(parsed.provider),
    updated_at: now,
  }) as Record<string, unknown>;

  // Trusted server paths (e.g. Gorgias settings) pass encrypted provider tokens explicitly.
  if (parsed.access_token_encrypted !== undefined) {
    payload.access_token_encrypted = parsed.access_token_encrypted;
  }
  if (parsed.refresh_token_encrypted !== undefined) {
    payload.refresh_token_encrypted = parsed.refresh_token_encrypted;
  }

  const { data, error } = await supabase
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .upsert(payload, { onConflict: 'merchant_id,provider,provider_account_id' })
    .select(CONNECTION_SELECT_PUBLIC)
    .single();

  if (error) throw new Error(`upsert ${TABLES.SUPPORT_PROVIDER_CONNECTIONS} failed: ${error.message}`);
  return toPublicSupportProviderConnection(data as SupportProviderConnectionRow);
}

export async function upsertSupportCaseIntake(
  supabase: SupabaseUpsertClient,
  input: z.input<typeof upsertCaseSchema>
) {
  const parsed = upsertCaseSchema.parse(input);
  const rawPayloadHash =
    parsed.raw_payload_hash ?? hashRawPayload(parsed.raw_payload ?? null);
  const customerEmailHash =
    parsed.customer_email_hash ??
    (parsed.customer_email ? hashSupportEmail(parsed.customer_email) : null);

  let orderRef = parsed.order_ref ?? null;
  if (!orderRef) {
    const searchText = [
      parsed.customer_message_summary,
      parsed.agent_notes_summary,
      parsed.claim_reason,
    ]
      .filter(Boolean)
      .join(' ');
    if (searchText) {
      orderRef = extractOrderRefFromText(searchText);
    }
  }

  // v2 source_tickets shape (post-cutover): provider-native classification
  // fields (is_claim, summaries, decisions) do NOT live on the ticket row —
  // claims become first-class rows via ensureClaimForTicketV2 and rich
  // classification detail rides on the intake source_ticket_events entry.
  const TICKET_CHANNELS = new Set(['email', 'chat', 'sms', 'phone', 'social', 'portal', 'api', 'bot']);
  const channel = typeof parsed.channel === 'string' && TICKET_CHANNELS.has(parsed.channel.toLowerCase())
    ? parsed.channel.toLowerCase()
    : 'unknown';
  const payload = {
    merchant_id: parsed.merchant_id,
    provider: normalizeProviderName(parsed.provider),
    connection_id: parsed.provider_connection_id ?? null,
    external_id: parsed.external_case_id,
    external_url: parsed.external_url ?? null,
    subject: parsed.ticket_subject ?? null,
    status: parsed.case_status ?? null,
    channel,
    tags: parsed.tags ?? [],
    message_count: parsed.message_count ?? null,
    customer_reply_count: parsed.customer_reply_count ?? null,
    was_reopened: parsed.was_reopened ?? null,
    linked_order_external_ids: orderRef ? [orderRef.replace(/^#/, '')] : [],
    created_at_provider: parsed.created_at_provider ?? null,
    updated_at_provider: parsed.updated_at_provider ?? null,
    opened_at_provider: parsed.opened_at_provider ?? null,
    closed_at_provider: parsed.closed_at_provider ?? null,
    raw_payload_hash: rawPayloadHash,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(TABLES.SUPPORT_CASE_INTAKE)
    .upsert(payload, { onConflict: 'merchant_id,provider,external_id' })
    .select()
    .single();

  if (error) throw new Error(`upsert ${TABLES.SUPPORT_CASE_INTAKE} failed: ${error.message}`);
  // echo legacy-shaped fields callers still read off the result
  return {
    ...(data as Record<string, unknown>),
    external_case_id: (data as Record<string, unknown>).external_id,
    customer_email_hash: customerEmailHash,
    order_ref: orderRef,
  } as Record<string, unknown>;
}

export async function appendSupportCaseEvent(
  supabase: SupabaseInsertClient,
  input: z.input<typeof appendEventSchema>
) {
  const parsed = appendEventSchema.parse(input);
  const actorIdentifierHash = parsed.actor_identifier
    ? hashSupportIdentifier(parsed.actor_identifier)
    : null;
  const rawPayloadHash =
    parsed.raw_payload_hash ??
    (parsed.raw_payload !== undefined ? hashRawPayload(parsed.raw_payload) : null);

  // Idempotency key: stable across replays of the same event, unique across
  // distinct events for a case. Only set when we have a payload hash to key on;
  // events without a hash are not deduped (key stays null → many nulls allowed).
  const eventIdempotencyKey =
    rawPayloadHash != null
      ? `${parsed.merchant_id}:${parsed.support_case_id}:${parsed.event_type}:${rawPayloadHash}`
      : null;

  // v2 source_ticket_events shape
  const payload = {
    merchant_id: parsed.merchant_id,
    source_ticket_id: parsed.support_case_id,
    event_type: parsed.event_type,
    actor_type: parsed.actor_type ?? null,
    summary: parsed.event_summary ?? null,
    occurred_at: parsed.occurred_at_provider ?? null,
    metadata: {
      ...parsed.metadata,
      provider: normalizeProviderName(parsed.provider),
      ...(actorIdentifierHash ? { actor_identifier_hash: actorIdentifierHash } : {}),
    },
    raw_payload_hash: rawPayloadHash,
    event_idempotency_key: eventIdempotencyKey,
  };

  const { data, error } = await supabase
    .from(TABLES.SUPPORT_CASE_EVENTS)
    .insert(payload)
    .select()
    .single();

  if (error) {
    // Replayed helpdesk event: the unique index on event_idempotency_key rejects
    // the duplicate (23505). Return the already-recorded event — idempotent.
    if (eventIdempotencyKey && error.code === '23505') {
      const { data: existing } = await supabase
        .from(TABLES.SUPPORT_CASE_EVENTS)
        .select()
        .eq('event_idempotency_key', eventIdempotencyKey)
        .maybeSingle();
      if (existing) return existing;
    }
    throw new Error(`insert ${TABLES.SUPPORT_CASE_EVENTS} failed: ${error.message}`);
  }
  if (!data) throw new Error(`insert ${TABLES.SUPPORT_CASE_EVENTS} returned no row`);
  return data;
}

// ---------------------------------------------------------------------------
// Claim-intelligence sibling tables
// ---------------------------------------------------------------------------

export function diffDays(fromIso: string | null | undefined, toIso: string | null | undefined): number | null {
  if (!fromIso || !toIso) return null;
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.floor((to - from) / 86_400_000);
}

export function hashPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = normalisePhone(raw);
  return normalized ? hashIdentifier(normalized) : null;
}

export function hashAddress(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = normaliseAddress(raw);
  return normalized ? hashIdentifier(normalized) : null;
}

export function hashIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = normaliseIP(raw);
  return normalized ? hashIdentifier(normalized) : null;
}

const orderClaimContextSchema = z.object({
  support_case_id: z.string().uuid(),
  merchant_id: z.string().uuid(),
  order_ref: z.string().nullable().optional(),
  order_value: z.number().nullable().optional(),
  order_created_at: z.string().nullable().optional(),
  fulfillment_status_at_claim: z.string().nullable().optional(),
  delivery_status_at_claim: z.string().nullable().optional(),
  shipping_carrier: z.string().nullable().optional(),
  tracking_number: z.string().nullable().optional(),
  days_since_order_at_claim: z.number().int().nullable().optional(),
  days_since_delivery_at_claim: z.number().int().nullable().optional(),
  time_to_claim_days: z.number().int().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  discount_code_used: z.boolean().nullable().optional(),
  discount_amount: z.number().nullable().optional(),
  is_first_order: z.boolean().nullable().optional(),
  shipping_equals_billing: z.boolean().nullable().optional(),
  was_refunded_previously: z.boolean().nullable().optional(),
  refund_amount_requested: z.number().nullable().optional(),
  refund_amount_approved: z.number().nullable().optional(),
  partial_refund: z.boolean().nullable().optional(),
});

export type OrderClaimContextInput = z.input<typeof orderClaimContextSchema>;

export async function upsertOrderClaimContext(
  supabase: SupabaseUpsertClient,
  input: OrderClaimContextInput
) {
  const parsed = orderClaimContextSchema.parse(input);
  const { data, error } = await supabase
    .from(TABLES.ORDER_CLAIM_CONTEXT)
    .upsert(parsed, { onConflict: 'support_case_id' })
    .select()
    .single();

  if (error) throw new Error(`upsert ${TABLES.ORDER_CLAIM_CONTEXT} failed: ${error.message}`);
  return data;
}

const identitySignalsInputSchema = z.object({
  merchant_id: z.string().uuid(),
  customer_email_hash: z.string().min(1),
  phone: z.string().nullable().optional(),
  shipping_address: z.string().nullable().optional(),
  billing_address: z.string().nullable().optional(),
  ip_address: z.string().nullable().optional(),
  device_fingerprint: z.string().nullable().optional(),
  customer_account_type: z.enum(['guest', 'registered']).nullable().optional(),
  account_created_at: z.string().nullable().optional(),
  claimed_at: z.string().nullable().optional(),
});

export type CustomerIdentitySignalsInput = z.input<typeof identitySignalsInputSchema>;

export type CustomerIdentityHashes = {
  customer_email_hash: string;
  phone_hash: string | null;
  shipping_address_hash: string | null;
  billing_address_hash: string | null;
  ip_hash: string | null;
  device_fingerprint: string | null;
};

/**
 * Upsert hashed identity signals for a (merchant, customer) pair and return the
 * computed hashes so the caller can run cross-merchant link detection.
 *
 * NOTE: first_seen_at is set to the claim time on every write; refining it to
 * the earliest-ever value is left to a future DB-side LEAST() trigger.
 */
export async function upsertCustomerIdentitySignals(
  supabase: SupabaseUpsertClient,
  input: CustomerIdentitySignalsInput
): Promise<{ row: Record<string, unknown> | null; hashes: CustomerIdentityHashes }> {
  const parsed = identitySignalsInputSchema.parse(input);
  const seenAt = parsed.claimed_at ?? new Date().toISOString();

  const hashes: CustomerIdentityHashes = {
    customer_email_hash: parsed.customer_email_hash,
    phone_hash: hashPhone(parsed.phone),
    shipping_address_hash: hashAddress(parsed.shipping_address),
    billing_address_hash: hashAddress(parsed.billing_address),
    ip_hash: hashIp(parsed.ip_address),
    device_fingerprint: parsed.device_fingerprint?.trim() || null,
  };

  const payload = {
    merchant_id: parsed.merchant_id,
    customer_email_hash: parsed.customer_email_hash,
    phone_hash: hashes.phone_hash,
    shipping_address_hash: hashes.shipping_address_hash,
    billing_address_hash: hashes.billing_address_hash,
    ip_hash: hashes.ip_hash,
    device_fingerprint: hashes.device_fingerprint,
    customer_account_type: parsed.customer_account_type ?? null,
    account_created_at: parsed.account_created_at ?? null,
    days_between_account_creation_and_first_claim: diffDays(parsed.account_created_at, seenAt),
    first_seen_at: seenAt,
    last_seen_at: seenAt,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(TABLES.CUSTOMER_IDENTITY_SIGNALS)
    .upsert(payload, { onConflict: 'merchant_id,customer_email_hash' })
    .select()
    .single();

  if (error) throw new Error(`upsert ${TABLES.CUSTOMER_IDENTITY_SIGNALS} failed: ${error.message}`);
  return { row: data, hashes };
}

const webhookLogSchema = z.object({
  provider: z.string().min(1),
  external_case_id: z.string().nullable().optional(),
  merchant_id: z.string().uuid().nullable().optional(),
  status: z.enum(['success', 'validation_error', 'error']),
  http_status: z.number().int().nullable().optional(),
  is_claim: z.boolean().nullable().optional(),
  claim_type: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
});

export type WebhookLogInput = z.input<typeof webhookLogSchema>;

/** Best-effort webhook delivery log. Never throws — logging must not break the response. */
export async function logWebhookResult(
  supabase: SupabaseInsertClient,
  input: WebhookLogInput
): Promise<void> {
  try {
    const parsed = webhookLogSchema.parse(input);
    await supabase.from(TABLES.WEBHOOK_LOGS).insert(parsed).select('id').single();
  } catch {
    // Swallow — the webhook response must not depend on logging success.
  }
}
