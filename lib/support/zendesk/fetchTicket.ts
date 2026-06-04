import type { ZendeskApiCredentials } from '@/lib/support/zendesk/credentialCrypto';
import { zendeskApiRequest } from '@/lib/support/zendesk/zendeskApi';

type ZendeskTicketResponse = {
  ticket?: Record<string, unknown>;
};

type ZendeskCommentsResponse = {
  comments?: Array<Record<string, unknown>>;
};

export async function fetchZendeskTicketWithComments(input: {
  providerBaseUrl: string;
  credentials: ZendeskApiCredentials;
  ticketId: string;
}): Promise<Record<string, unknown>> {
  const id = input.ticketId.trim();
  const ticketPayload = await zendeskApiRequest<ZendeskTicketResponse>(
    input.providerBaseUrl,
    `/tickets/${encodeURIComponent(id)}.json`,
    input.credentials,
  );
  const ticket = ticketPayload.ticket;
  if (!ticket || typeof ticket !== 'object') {
    throw new Error('zendesk_ticket_missing');
  }

  let comments: Array<Record<string, unknown>> = [];
  try {
    const commentsPayload = await zendeskApiRequest<ZendeskCommentsResponse>(
      input.providerBaseUrl,
      `/tickets/${encodeURIComponent(id)}/comments.json`,
      input.credentials,
    );
    comments = commentsPayload.comments ?? [];
  } catch {
    comments = [];
  }

  return {
    ...ticket,
    comments,
  };
}
