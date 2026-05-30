import { normaliseEmail } from '@/lib/identity/normalise';

export type GorgiasTicketEmailSource =
  | 'message_sender'
  | 'message_source_from'
  | 'ticket_sender'
  | 'ticket_customer'
  | null;

export type ResolvedGorgiasTicketCustomerEmail = {
  email: string;
  normEmail: string;
  source: GorgiasTicketEmailSource;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readPath(root: unknown, path: string[]): unknown {
  let current: unknown = root;
  for (const key of path) {
    const record = asRecord(current);
    if (!record) return undefined;
    current = record[key];
  }
  return current;
}

function tryNormaliseEmail(value: string | null): string | null {
  if (!value) return null;
  try {
    return normaliseEmail(value);
  } catch {
    return null;
  }
}

function isUnresolvedTemplate(value: string): boolean {
  return value.includes('{{') || value.includes('}}');
}

/** Emails that should not be used as the shopper identity (API user, placeholders). */
export function buildGorgiasEmailExclusionSet(excludeRaw: Array<string | null | undefined>): Set<string> {
  const out = new Set<string>();
  for (const raw of excludeRaw) {
    const norm = tryNormaliseEmail(raw ?? null);
    if (norm) out.add(norm);
  }
  return out;
}

function isExcludedEmail(normEmail: string, exclude: Set<string>): boolean {
  return exclude.has(normEmail);
}

function emailFromMessage(message: Record<string, unknown>): {
  email: string;
  normEmail: string;
  source: 'message_sender' | 'message_source_from';
} | null {
  const sender = asRecord(message.sender);
  const senderEmail = tryNormaliseEmail(asString(sender?.email));
  if (senderEmail) {
    return { email: asString(sender?.email) ?? senderEmail, normEmail: senderEmail, source: 'message_sender' };
  }

  const source = asRecord(message.source);
  const from = asRecord(source?.from);
  const fromEmail = tryNormaliseEmail(asString(from?.address ?? from?.email));
  if (fromEmail) {
    const raw = asString(from?.address ?? from?.email) ?? fromEmail;
    return { email: raw, normEmail: fromEmail, source: 'message_source_from' };
  }

  return null;
}

function isAgentMessage(message: Record<string, unknown>): boolean {
  if (message.from_agent === true) return true;
  if (asString(message.sender_type)?.toLowerCase() === 'agent') return true;
  const source = asRecord(message.source);
  if (asString(source?.type)?.toLowerCase() === 'internal-note') return true;
  return false;
}

/**
 * Resolve the external shopper email for a Gorgias ticket.
 * For inbound email, ticket.customer.email may be the helpdesk/support profile;
 * prefer the latest non-agent message sender / source.from address.
 */
export function resolveGorgiasTicketCustomerEmail(
  rawTicket: unknown,
  options?: { excludeEmails?: Set<string> }
): ResolvedGorgiasTicketCustomerEmail | null {
  const ticket = asRecord(rawTicket);
  if (!ticket) return null;

  const exclude = options?.excludeEmails ?? new Set<string>();
  const candidates: Array<ResolvedGorgiasTicketCustomerEmail & { priority: number }> = [];

  const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = asRecord(messages[i]);
    if (!message || isAgentMessage(message)) continue;
    const fromMessage = emailFromMessage(message);
    if (!fromMessage || isExcludedEmail(fromMessage.normEmail, exclude)) continue;
    candidates.push({ ...fromMessage, priority: 1 });
  }

  const ticketSender = tryNormaliseEmail(asString(readPath(ticket, ['sender', 'email'])));
  if (ticketSender && !isExcludedEmail(ticketSender, exclude)) {
    candidates.push({
      email: asString(readPath(ticket, ['sender', 'email'])) ?? ticketSender,
      normEmail: ticketSender,
      source: 'ticket_sender',
      priority: 2,
    });
  }

  const customerEmail = tryNormaliseEmail(asString(readPath(ticket, ['customer', 'email'])));
  if (customerEmail && !isExcludedEmail(customerEmail, exclude)) {
    candidates.push({
      email: asString(readPath(ticket, ['customer', 'email'])) ?? customerEmail,
      normEmail: customerEmail,
      source: 'ticket_customer',
      priority: 3,
    });
  }

  candidates.sort((a, b) => a.priority - b.priority);
  const best = candidates[0];
  if (!best) return null;

  return { email: best.email, normEmail: best.normEmail, source: best.source };
}

export function isUsableWidgetEmailParam(value: string | null | undefined): boolean {
  const raw = value?.trim() ?? '';
  if (!raw || isUnresolvedTemplate(raw)) return false;
  return tryNormaliseEmail(raw) !== null;
}

export function pickWidgetEmailFromQueryParams(input: {
  email?: string | null;
  customerEmail?: string | null;
  exclude?: Set<string>;
}): { rawEmail: string; querySource: 'email' | 'customer_email' } | null {
  const exclude = input.exclude ?? new Set<string>();

  for (const [param, source] of [
    [input.email, 'email'] as const,
    [input.customerEmail, 'customer_email'] as const,
  ]) {
    const raw = param?.trim() ?? '';
    if (!isUsableWidgetEmailParam(raw)) continue;
    const norm = tryNormaliseEmail(raw);
    if (!norm || isExcludedEmail(norm, exclude)) continue;
    return { rawEmail: raw, querySource: source };
  }

  return null;
}
