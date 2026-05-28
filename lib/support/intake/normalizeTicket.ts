import type { SupportProvider } from '@/lib/support/providers/types';
import {
  extractOrderRefFromText,
  hashRawPayload,
  hashSupportEmail,
  hashSupportIdentifier,
  normalizeProviderName,
} from '@/lib/support/intake/store';

export const SUPPORT_SUMMARY_MAX_LENGTH = 400;

export const NORMALIZED_CASE_STATUSES = [
  'open',
  'pending',
  'awaiting_info',
  'solved',
  'closed',
  'spam',
  'deleted',
] as const;

export type NormalizedCaseStatus = (typeof NORMALIZED_CASE_STATUSES)[number];

export const NORMALIZED_CLAIM_REASONS = [
  'missing_parcel',
  'refund_request',
  'return_request',
  'wrong_item',
  'damaged_item',
  'dispute',
  'unknown',
] as const;

export type NormalizedClaimReason = (typeof NORMALIZED_CLAIM_REASONS)[number];

export type SupportAttachmentMetadata = {
  provider_attachment_id?: string;
  filename?: string;
  content_type?: string;
  size?: number;
  url?: string;
};

export type NormalizeSupportTicketContext = {
  merchant_id: string;
  provider_connection_id?: string | null;
  shop_domain?: string | null;
  provider_base_url?: string | null;
  /** Optional override for unit tests; defaults to hashSupportEmail (IDENTITY_SALT). */
  hashEmail?: (email: string) => string;
};

export type NormalizedSupportCaseIntake = {
  merchant_id: string;
  provider: SupportProvider;
  provider_connection_id: string | null;
  external_case_id: string;
  external_url: string | null;
  customer_email_hash: string | null;
  customer_identifier: string | null;
  order_ref: string | null;
  shop_domain: string | null;
  claim_reason: string | null;
  customer_message_summary: string | null;
  agent_notes_summary: string | null;
  case_status: string | null;
  decision: string | null;
  outcome: string | null;
  attachments_metadata: SupportAttachmentMetadata[];
  tags: string[];
  raw_payload_hash: string;
  created_at_provider: string | null;
  updated_at_provider: string | null;
};

const EXTRA_ORDER_REF_PATTERNS: Array<{ pattern: RegExp; group: number }> = [
  { pattern: /\border_number\s*[:=]\s*(\d{3,})\b/i, group: 1 },
  { pattern: /\bshopify\s+order\s*#?\s*(\d{3,})\b/i, group: 1 },
];

const EXPLICIT_DECISION_FIELD_KEYS = new Set([
  'decision',
  'unauth_decision',
  'merchant_decision',
  'claim_decision',
]);

const EXPLICIT_OUTCOME_FIELD_KEYS = new Set([
  'outcome',
  'unauth_outcome',
  'merchant_outcome',
  'claim_outcome',
]);

function hashEmailForContext(context: NormalizeSupportTicketContext, email: string): string {
  return (context.hashEmail ?? hashSupportEmail)(email);
}

export function truncateSupportSummary(text: string, maxLength = SUPPORT_SUMMARY_MAX_LENGTH): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

export function normalizeClaimReasonFromText(
  text: string,
  tags: string[] = []
): NormalizedClaimReason | null {
  const haystack = `${text}\n${tags.join(' ')}`.toLowerCase();

  if (
    /\b(inr|item not received|not received|never received|missing parcel|parcel missing|delivered not received|didn'?t receive)\b/.test(
      haystack
    )
  ) {
    return 'missing_parcel';
  }
  if (/\b(refund request|refund)\b/.test(haystack)) return 'refund_request';
  if (/\b(returned item|return request|return)\b/.test(haystack)) return 'return_request';
  if (/\bwrong item\b/.test(haystack)) return 'wrong_item';
  if (/\b(damaged|broken|defective)\b/.test(haystack)) return 'damaged_item';
  if (/\b(chargeback|dispute)\b/.test(haystack)) return 'dispute';

  return null;
}

export function normalizeCaseStatusFromProvider(
  provider: SupportProvider,
  rawStatus: string | null | undefined
): string | null {
  if (!rawStatus) return null;
  const status = rawStatus.trim().toLowerCase();

  const map: Record<string, NormalizedCaseStatus> = {
    new: 'open',
    open: 'open',
    pending: 'pending',
    hold: 'awaiting_info',
    'on-hold': 'awaiting_info',
    waiting: 'awaiting_info',
    'waiting on customer': 'awaiting_info',
    'waiting on third party': 'awaiting_info',
    snoozed: 'awaiting_info',
    solved: 'solved',
    resolved: 'solved',
    closed: 'closed',
    archived: 'closed',
    spam: 'spam',
    deleted: 'deleted',
  };

  if (provider === 'intercom') {
    if (status === 'snoozed') return 'awaiting_info';
  }

  if (provider === 'freshdesk') {
    const freshdeskMap: Record<string, NormalizedCaseStatus> = {
      '2': 'open',
      '3': 'pending',
      '4': 'solved',
      '5': 'closed',
      open: 'open',
      pending: 'pending',
      resolved: 'solved',
      closed: 'closed',
    };
    if (freshdeskMap[status]) return freshdeskMap[status];
  }

  return map[status] ?? status;
}

export function extractOrderRefFromSources(
  ...sources: Array<string | null | undefined>
): string | null {
  const combined = sources.filter((s) => typeof s === 'string' && s.trim()).join('\n');
  if (!combined.trim()) return null;

  const primary = extractOrderRefFromText(combined);
  if (primary) return primary;

  for (const { pattern, group } of EXTRA_ORDER_REF_PATTERNS) {
    const match = combined.match(pattern);
    if (match?.[group]) return match[group];
  }

  return null;
}

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && 'name' in item) {
        return asString((item as { name: unknown }).name);
      }
      if (item && typeof item === 'object' && 'id' in item) {
        return asString((item as { id: unknown }).id);
      }
      return null;
    })
    .filter((item): item is string => !!item);
}

function readPath(obj: unknown, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function normalizeAttachments(raw: unknown): SupportAttachmentMetadata[] {
  if (!Array.isArray(raw)) return [];

  const metadata: SupportAttachmentMetadata[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const url = asString(row.url ?? row.content_url ?? row.attachment_url);
    const meta: SupportAttachmentMetadata = {
      provider_attachment_id: asString(row.id ?? row.attachment_id) ?? undefined,
      filename: asString(row.file_name ?? row.filename ?? row.name) ?? undefined,
      content_type: asString(row.content_type ?? row.mime_type) ?? undefined,
      size: typeof row.size === 'number' ? row.size : undefined,
      url: url && (url.startsWith('https://') || url.startsWith('http://')) ? url : undefined,
    };
    if (
      meta.provider_attachment_id ||
      meta.filename ||
      meta.content_type ||
      meta.size !== undefined ||
      meta.url
    ) {
      metadata.push(meta);
    }
  }
  return metadata;
}

function extractExplicitDecisionOutcome(
  customFields: unknown,
  tags: string[]
): { decision: string | null; outcome: string | null } {
  let decision: string | null = null;
  let outcome: string | null = null;

  if (Array.isArray(customFields)) {
    for (const field of customFields) {
      if (!field || typeof field !== 'object') continue;
      const row = field as Record<string, unknown>;
      const key = asString(row.id ?? row.name ?? row.key)?.toLowerCase();
      const value = asString(row.value);
      if (!key || !value) continue;
      if (EXPLICIT_DECISION_FIELD_KEYS.has(key)) decision = value;
      if (EXPLICIT_OUTCOME_FIELD_KEYS.has(key)) outcome = value;
    }
  } else if (customFields && typeof customFields === 'object') {
    for (const [key, value] of Object.entries(customFields as Record<string, unknown>)) {
      const normalizedKey = key.toLowerCase();
      const text = asString(value);
      if (!text) continue;
      if (EXPLICIT_DECISION_FIELD_KEYS.has(normalizedKey)) decision = text;
      if (EXPLICIT_OUTCOME_FIELD_KEYS.has(normalizedKey)) outcome = text;
    }
  }

  for (const tag of tags) {
    const lower = tag.toLowerCase();
    const decisionMatch = lower.match(/^(?:unauth_)?decision[:=](.+)$/);
    const outcomeMatch = lower.match(/^(?:unauth_)?outcome[:=](.+)$/);
    if (decisionMatch?.[1]) decision = decisionMatch[1].trim();
    if (outcomeMatch?.[1]) outcome = outcomeMatch[1].trim();
  }

  return { decision, outcome };
}

function summarizeMessages(
  messages: Array<{ body?: string | null; from_agent?: boolean; public?: boolean }>
): { customer: string | null; agent: string | null } {
  const customerBodies: string[] = [];
  const agentBodies: string[] = [];

  for (const message of messages) {
    const body = asString(message.body);
    if (!body) continue;
    if (message.from_agent) {
      agentBodies.push(body);
    } else {
      customerBodies.push(body);
    }
  }

  return {
    customer: customerBodies.length
      ? truncateSupportSummary(customerBodies[customerBodies.length - 1])
      : null,
    agent: agentBodies.length
      ? truncateSupportSummary(agentBodies[agentBodies.length - 1])
      : null,
  };
}

function buildNormalizedBase(
  context: NormalizeSupportTicketContext,
  provider: SupportProvider,
  rawTicket: unknown,
  fields: Omit<
    NormalizedSupportCaseIntake,
    'merchant_id' | 'provider' | 'provider_connection_id' | 'shop_domain' | 'raw_payload_hash'
  >
): NormalizedSupportCaseIntake {
  return {
    merchant_id: context.merchant_id,
    provider,
    provider_connection_id: context.provider_connection_id ?? null,
    shop_domain: context.shop_domain ?? null,
    raw_payload_hash: hashRawPayload(rawTicket),
    ...fields,
  };
}

export function normalizeZendeskTicket(
  rawTicket: unknown,
  context: NormalizeSupportTicketContext
): NormalizedSupportCaseIntake {
  const ticket = (rawTicket ?? {}) as Record<string, unknown>;
  const id = asString(ticket.id);
  if (!id) throw new Error('Zendesk ticket missing id');

  const subject = asString(ticket.subject) ?? '';
  const description = asString(ticket.description) ?? '';
  const tags = asStringArray(ticket.tags);
  const requesterEmail = asString(readPath(ticket, ['requester', 'email']));
  const comments = Array.isArray(ticket.comments) ? ticket.comments : [];
  const commentBodies = comments
    .map((comment) => {
      if (!comment || typeof comment !== 'object') return null;
      const row = comment as Record<string, unknown>;
      return {
        body: asString(row.body ?? row.plain_body),
        from_agent: row.public === false ? true : row.author_id !== readPath(ticket, ['requester', 'id']),
        public: row.public !== false,
      };
    })
    .filter(Boolean) as Array<{ body?: string | null; from_agent?: boolean; public?: boolean }>;

  const { customer, agent } = summarizeMessages(commentBodies);
  const customFieldText = Array.isArray(ticket.custom_fields)
    ? ticket.custom_fields
        .map((field) => {
          if (!field || typeof field !== 'object') return '';
          const row = field as Record<string, unknown>;
          return `${asString(row.id) ?? ''}:${asString(row.value) ?? ''}`;
        })
        .join('\n')
    : '';

  const orderRef = extractOrderRefFromSources(
    subject,
    description,
    customer,
    customFieldText,
    tags.join(' ')
  );
  const claimReason =
    normalizeClaimReasonFromText(`${subject}\n${description}\n${customer ?? ''}`, tags) ?? null;
  const { decision, outcome } = extractExplicitDecisionOutcome(ticket.custom_fields, tags);

  const externalUrl =
    asString(ticket.url) ??
    (context.provider_base_url
      ? `${context.provider_base_url.replace(/\/$/, '')}/agent/tickets/${id}`
      : null);

  return buildNormalizedBase(context, 'zendesk', rawTicket, {
    external_case_id: id,
    external_url: externalUrl,
    customer_email_hash: requesterEmail ? hashEmailForContext(context, requesterEmail) : null,
    customer_identifier: requesterEmail ? hashSupportIdentifier(requesterEmail) : null,
    order_ref: orderRef,
    claim_reason: claimReason,
    customer_message_summary:
      customer ?? (description ? truncateSupportSummary(description) : subject ? truncateSupportSummary(subject) : null),
    agent_notes_summary: agent,
    case_status: normalizeCaseStatusFromProvider('zendesk', asString(ticket.status)),
    decision,
    outcome,
    attachments_metadata: normalizeAttachments(ticket.attachments),
    tags,
    created_at_provider: asString(ticket.created_at),
    updated_at_provider: asString(ticket.updated_at),
  });
}

export function normalizeGorgiasTicket(
  rawTicket: unknown,
  context: NormalizeSupportTicketContext
): NormalizedSupportCaseIntake {
  const ticket = (rawTicket ?? {}) as Record<string, unknown>;
  const id = asString(ticket.id);
  if (!id) throw new Error('Gorgias ticket missing id');

  const subject = asString(ticket.subject) ?? '';
  const tags = asStringArray(ticket.tags);
  const customerEmail = asString(readPath(ticket, ['customer', 'email']));
  const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
  const mappedMessages = messages.map((message) => {
    if (!message || typeof message !== 'object') return { body: null, from_agent: false };
    const row = message as Record<string, unknown>;
    const source =
      row.source && typeof row.source === 'object'
        ? (row.source as Record<string, unknown>)
        : null;
    const fromAgent =
      row.from_agent === true ||
      asString(row.sender_type)?.toLowerCase() === 'agent' ||
      asString(source?.type)?.toLowerCase() === 'internal-note';
    return { body: asString(row.body ?? row.stripped_text), from_agent: fromAgent };
  });

  const { customer, agent } = summarizeMessages(mappedMessages);
  const integrationText = JSON.stringify(ticket.integrations ?? ticket.meta ?? {});
  const orderRef = extractOrderRefFromSources(
    subject,
    customer,
    integrationText,
    tags.join(' ')
  );
  const claimReason = normalizeClaimReasonFromText(`${subject}\n${customer ?? ''}`, tags) ?? null;
  const { decision, outcome } = extractExplicitDecisionOutcome(
    readPath(ticket, ['integrations', 'custom_fields']) ?? ticket.meta,
    tags
  );

  return buildNormalizedBase(context, 'gorgias', rawTicket, {
    external_case_id: id,
    external_url:
      asString(ticket.uri) ??
      asString(ticket.external_url) ??
      (context.provider_base_url
        ? `${context.provider_base_url.replace(/\/$/, '')}/app/ticket/${id}`
        : null),
    customer_email_hash: customerEmail ? hashEmailForContext(context, customerEmail) : null,
    customer_identifier: customerEmail ? hashSupportIdentifier(customerEmail) : null,
    order_ref: orderRef,
    claim_reason: claimReason,
    customer_message_summary: customer ?? (subject ? truncateSupportSummary(subject) : null),
    agent_notes_summary: agent,
    case_status: normalizeCaseStatusFromProvider('gorgias', asString(ticket.status)),
    decision,
    outcome,
    attachments_metadata: normalizeAttachments(ticket.attachments),
    tags,
    created_at_provider: asString(ticket.created_datetime ?? ticket.created_at),
    updated_at_provider: asString(ticket.updated_datetime ?? ticket.updated_at),
  });
}

export function normalizeIntercomConversation(
  rawConversation: unknown,
  context: NormalizeSupportTicketContext
): NormalizedSupportCaseIntake {
  const conversation = (rawConversation ?? {}) as Record<string, unknown>;
  const id = asString(conversation.id);
  if (!id) throw new Error('Intercom conversation missing id');

  const tags = asStringArray(conversation.tags);
  const sourceBody = asString(readPath(conversation, ['source', 'body']));
  const parts = Array.isArray(conversation.conversation_parts)
    ? conversation.conversation_parts
    : [];
  const mappedParts = parts.map((part) => {
    if (!part || typeof part !== 'object') return { body: null, from_agent: false };
    const row = part as Record<string, unknown>;
    const author = row.author && typeof row.author === 'object' ? (row.author as Record<string, unknown>) : {};
    const authorType = asString(author.type)?.toLowerCase();
    return {
      body: asString(row.body),
      from_agent: authorType === 'admin' || authorType === 'bot',
    };
  });

  const { customer, agent } = summarizeMessages(mappedParts);
  const latestCustomer = customer ?? (sourceBody ? truncateSupportSummary(sourceBody) : null);
  const contacts = Array.isArray(conversation.contacts) ? conversation.contacts : [];
  const contactEmail =
    contacts
      .map((contact) => asString(readPath(contact, ['email'])))
      .find((email): email is string => !!email) ?? null;

  const orderRef = extractOrderRefFromSources(
    latestCustomer,
    sourceBody,
    tags.join(' ')
  );
  const claimReason =
    normalizeClaimReasonFromText(`${latestCustomer ?? ''}\n${sourceBody ?? ''}`, tags) ?? null;
  const { decision, outcome } = extractExplicitDecisionOutcome(conversation.custom_attributes, tags);

  const state =
    asString(conversation.state) ??
    (conversation.open === true || asString(conversation.open) === 'true' ? 'open' : 'closed');

  return buildNormalizedBase(context, 'intercom', rawConversation, {
    external_case_id: id,
    external_url: context.provider_base_url
      ? `${context.provider_base_url.replace(/\/$/, '')}/inbox/conversation/${id}`
      : null,
    customer_email_hash: contactEmail ? hashEmailForContext(context, contactEmail) : null,
    customer_identifier: contactEmail ? hashSupportIdentifier(contactEmail) : null,
    order_ref: orderRef,
    claim_reason: claimReason,
    customer_message_summary: latestCustomer,
    agent_notes_summary: agent,
    case_status: normalizeCaseStatusFromProvider('intercom', state),
    decision,
    outcome,
    attachments_metadata: normalizeAttachments(conversation.attachments),
    tags,
    created_at_provider: asString(conversation.created_at),
    updated_at_provider: asString(conversation.updated_at),
  });
}

export function normalizeFreshdeskTicket(
  rawTicket: unknown,
  context: NormalizeSupportTicketContext
): NormalizedSupportCaseIntake {
  const ticket = (rawTicket ?? {}) as Record<string, unknown>;
  const id = asString(ticket.id);
  if (!id) throw new Error('Freshdesk ticket missing id');

  const subject = asString(ticket.subject) ?? '';
  const description = asString(ticket.description_text ?? ticket.description) ?? '';
  const tags = asStringArray(ticket.tags);
  const requesterEmail =
    asString(readPath(ticket, ['requester', 'email'])) ?? asString(ticket.email);
  const orderRef = extractOrderRefFromSources(subject, description, tags.join(' '));
  const claimReason = normalizeClaimReasonFromText(`${subject}\n${description}`, tags) ?? null;
  const { decision, outcome } = extractExplicitDecisionOutcome(ticket.custom_fields, tags);

  return buildNormalizedBase(context, 'freshdesk', rawTicket, {
    external_case_id: id,
    external_url: context.provider_base_url
      ? `${context.provider_base_url.replace(/\/$/, '')}/a/tickets/${id}`
      : null,
    customer_email_hash: requesterEmail ? hashEmailForContext(context, requesterEmail) : null,
    customer_identifier: requesterEmail ? hashSupportIdentifier(requesterEmail) : null,
    order_ref: orderRef,
    claim_reason: claimReason,
    customer_message_summary: description
      ? truncateSupportSummary(description)
      : subject
        ? truncateSupportSummary(subject)
        : null,
    agent_notes_summary: null,
    case_status: normalizeCaseStatusFromProvider(
      'freshdesk',
      asString(ticket.status) ?? asString(ticket.status_name)
    ),
    decision,
    outcome,
    attachments_metadata: normalizeAttachments(ticket.attachments),
    tags,
    created_at_provider: asString(ticket.created_at),
    updated_at_provider: asString(ticket.updated_at),
  });
}

export function normalizeSupportTicket(
  provider: string,
  rawTicket: unknown,
  context: NormalizeSupportTicketContext
): NormalizedSupportCaseIntake {
  const normalizedProvider = normalizeProviderName(provider);

  switch (normalizedProvider) {
    case 'zendesk':
      return normalizeZendeskTicket(rawTicket, context);
    case 'gorgias':
      return normalizeGorgiasTicket(rawTicket, context);
    case 'intercom':
      return normalizeIntercomConversation(rawTicket, context);
    case 'freshdesk':
      return normalizeFreshdeskTicket(rawTicket, context);
    default: {
      const _exhaustive: never = normalizedProvider;
      return _exhaustive;
    }
  }
}

/** Map normalizer output to upsertSupportCaseIntake input (pre-hashed fields). */
export function toSupportCaseIntakeUpsertInput(
  normalized: NormalizedSupportCaseIntake
): Record<string, unknown> {
  return {
    merchant_id: normalized.merchant_id,
    provider: normalized.provider,
    provider_connection_id: normalized.provider_connection_id,
    external_case_id: normalized.external_case_id,
    external_url: normalized.external_url,
    customer_email_hash: normalized.customer_email_hash,
    customer_identifier: normalized.customer_identifier,
    order_ref: normalized.order_ref,
    shop_domain: normalized.shop_domain,
    claim_reason: normalized.claim_reason,
    customer_message_summary: normalized.customer_message_summary,
    agent_notes_summary: normalized.agent_notes_summary,
    case_status: normalized.case_status,
    decision: normalized.decision,
    outcome: normalized.outcome,
    attachments_metadata: normalized.attachments_metadata,
    tags: normalized.tags,
    raw_payload_hash: normalized.raw_payload_hash,
    created_at_provider: normalized.created_at_provider,
    updated_at_provider: normalized.updated_at_provider,
  };
}
