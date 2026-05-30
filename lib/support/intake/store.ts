import { createHash } from 'node:crypto';
import { z } from 'zod';
import { hashIdentifier } from '@/lib/identity/hash';
import { normaliseEmail } from '@/lib/identity/normalise';
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

const upsertCaseSchema = z.object({
  merchant_id: z.string().uuid(),
  provider: supportProviderSchema,
  provider_connection_id: z.string().uuid().nullable().optional(),
  external_case_id: z.string().min(1),
  external_url: z.string().nullable().optional(),
  customer_email: z.string().email().optional(),
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
  created_at_provider: z.string().datetime().nullable().optional(),
  updated_at_provider: z.string().datetime().nullable().optional(),
});

const appendEventSchema = z.object({
  merchant_id: z.string().uuid(),
  support_case_id: z.string().uuid(),
  provider: supportProviderSchema,
  event_type: z.string().min(1),
  event_summary: z.string().nullable().optional(),
  actor_type: z.string().nullable().optional(),
  actor_identifier: z.string().nullable().optional(),
  occurred_at_provider: z.string().datetime().nullable().optional(),
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
        single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
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

  const {
    customer_email: _email,
    customer_email_hash: _emailHash,
    raw_payload: _raw,
    raw_payload_hash: _rawHash,
    ...rest
  } = parsed;
  const payload = stripForbiddenIntakeFields({
    ...rest,
    provider: normalizeProviderName(parsed.provider),
    customer_email_hash: customerEmailHash,
    order_ref: orderRef,
    raw_payload_hash: rawPayloadHash,
    updated_at: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from(TABLES.SUPPORT_CASE_INTAKE)
    .upsert(payload, { onConflict: 'merchant_id,provider,external_case_id' })
    .select()
    .single();

  if (error) throw new Error(`upsert ${TABLES.SUPPORT_CASE_INTAKE} failed: ${error.message}`);
  return data;
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

  const { actor_identifier: _actor, raw_payload: _raw, raw_payload_hash: _rawHash, ...rest } = parsed;
  const payload = stripForbiddenIntakeFields({
    ...rest,
    provider: normalizeProviderName(parsed.provider),
    actor_identifier_hash: actorIdentifierHash,
    raw_payload_hash: rawPayloadHash,
  });

  const { data, error } = await supabase
    .from(TABLES.SUPPORT_CASE_EVENTS)
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`insert ${TABLES.SUPPORT_CASE_EVENTS} failed: ${error.message}`);
  return data;
}
