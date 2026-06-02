import type { FreshdeskEphemeralSecret } from '@/components/settings/freshdeskSupportSyncReducer';
import {
  FRESHDESK_CONNECT_SUCCESS_MESSAGE,
  FRESHDESK_SUPPORT_SECRET_SAVE_WARNING,
  FRESHDESK_SUPPORT_WEBHOOK_HEADER_NAME,
} from '@/lib/support/freshdesk/supportConnectionShared';

const freshdeskWhenFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatFreshdeskWhen(value: string | null) {
  if (!value) return 'Never';
  return freshdeskWhenFormatter.format(new Date(value));
}

export function freshdeskAccountLabel(connection: {
  provider_account_name: string | null;
  provider_account_id: string | null;
  provider_base_url: string | null;
}) {
  return (
    connection.provider_account_name ||
    connection.provider_account_id ||
    connection.provider_base_url ||
    'Freshdesk account'
  );
}

export function buildFreshdeskCreatePayload(
  domain: string,
  displayName: string,
  freshdeskApiKey: string
) {
  return {
    domain: domain.trim(),
    name: displayName.trim() || undefined,
    freshdesk_api_key: freshdeskApiKey.trim(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export type FreshdeskCreateConnectionResponse = {
  webhook_secret_plaintext?: string;
  webhook_url?: string;
  header_name?: string;
  warning?: string;
  hasExistingConnection: boolean;
  code?: string;
  error?: string;
};

export function parseFreshdeskCreateConnectionResponse(
  body: unknown
): FreshdeskCreateConnectionResponse {
  if (!isRecord(body)) return { hasExistingConnection: false };
  return {
    webhook_secret_plaintext:
      typeof body.webhook_secret_plaintext === 'string' ? body.webhook_secret_plaintext : undefined,
    webhook_url: typeof body.webhook_url === 'string' ? body.webhook_url : undefined,
    header_name: typeof body.header_name === 'string' ? body.header_name : undefined,
    warning: typeof body.warning === 'string' ? body.warning : undefined,
    hasExistingConnection: isRecord(body.connection) && typeof body.connection.id === 'string',
    code: typeof body.code === 'string' ? body.code : undefined,
    error: typeof body.error === 'string' ? body.error : undefined,
  };
}

export function resolveFreshdeskConnectMessage(body: FreshdeskCreateConnectionResponse): {
  message: { type: 'success' | 'error' | 'warning'; text: string };
  showSetup: boolean;
  ephemeral?: FreshdeskEphemeralSecret;
} {
  if (body.webhook_secret_plaintext && body.webhook_url) {
    const ephemeral: FreshdeskEphemeralSecret = {
      secret: body.webhook_secret_plaintext,
      webhookUrl: body.webhook_url,
      headerName: body.header_name ?? FRESHDESK_SUPPORT_WEBHOOK_HEADER_NAME,
      warning: body.warning ?? FRESHDESK_SUPPORT_SECRET_SAVE_WARNING,
    };
    return {
      showSetup: true,
      ephemeral,
      message: {
        type: 'success',
        text: 'Freshdesk credentials saved. Complete the automation webhook steps below to sync tickets.',
      },
    };
  }

  if (!body.webhook_secret_plaintext && body.hasExistingConnection) {
    return {
      showSetup: false,
      message: { type: 'success', text: 'Freshdesk API credentials saved.' },
    };
  }

  return { showSetup: false, message: { type: 'success', text: FRESHDESK_CONNECT_SUCCESS_MESSAGE } };
}
