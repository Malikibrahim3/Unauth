export const SUPPORT_PROVIDERS = ['zendesk', 'gorgias', 'intercom', 'freshdesk'] as const;

export type SupportProvider = (typeof SUPPORT_PROVIDERS)[number];

export const SUPPORT_PROVIDER_CONNECTION_STATUSES = [
  'active',
  'disabled',
  'revoked',
  'error',
] as const;

export type SupportProviderConnectionStatus =
  (typeof SUPPORT_PROVIDER_CONNECTION_STATUSES)[number];

export function isSupportProvider(value: string): value is SupportProvider {
  return (SUPPORT_PROVIDERS as readonly string[]).includes(value);
}

/** Server-ingestion row; never expose token fields to clients. */
export type SupportProviderConnectionRow = {
  id: string;
  merchant_id: string;
  provider: SupportProvider;
  provider_account_id: string | null;
  provider_account_name: string | null;
  provider_base_url: string | null;
  status: SupportProviderConnectionStatus;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  scopes: unknown[];
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

/** Safe read shape for dashboards and APIs — no OAuth secrets. */
export type PublicSupportProviderConnection = Omit<
  SupportProviderConnectionRow,
  'access_token_encrypted' | 'refresh_token_encrypted'
>;

export type SupportCaseIntakeRow = {
  id: string;
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
  attachments_metadata: unknown[];
  tags: unknown[];
  raw_payload_hash: string;
  created_at_provider: string | null;
  updated_at_provider: string | null;
  ingested_at: string;
  updated_at: string;
  // Additive claim-intelligence signals (migration 20260530150000).
  channel: string | null;
  message_count: number | null;
  customer_reply_count: number | null;
  was_reopened: boolean | null;
  macros_used: unknown[];
  sentiment_score: number | null;
  chargeback_threatened: boolean;
  is_claim: boolean;
  claim_type: string | null;
  claim_type_confidence: number | null;
  provided_evidence: boolean | null;
  accepted_first_resolution: boolean | null;
  resolution_type: string | null;
  escalation_count: number | null;
  time_to_first_claim_message_seconds: number | null;
};

export type SupportCaseEventRow = {
  id: string;
  merchant_id: string;
  support_case_id: string;
  provider: SupportProvider;
  event_type: string;
  event_summary: string | null;
  actor_type: string | null;
  actor_identifier_hash: string | null;
  occurred_at_provider: string | null;
  metadata: Record<string, unknown>;
  raw_payload_hash: string | null;
  created_at: string;
};
