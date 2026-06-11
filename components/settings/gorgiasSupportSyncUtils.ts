import {
  GORGIAS_CONNECT_SUCCESS_MESSAGE,
  GORGIAS_SUPPORT_SECRET_SAVE_WARNING,
  GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME,
  type GorgiasSidebarWidgetSetupResult,
  type GorgiasSupportConnectionSettings,
} from '@/lib/support/gorgias/supportConnectionShared';

const gorgiasWhenFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatGorgiasWhen(value: string | null) {
  if (!value) return 'Never';
  return gorgiasWhenFormatter.format(new Date(value));
}

export function gorgiasAccountLabel(connection: GorgiasSupportConnectionSettings) {
  return (
    connection.provider_account_name ||
    connection.provider_account_id ||
    connection.provider_base_url ||
    'Gorgias account'
  );
}

function looksLikeDomain(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.includes('.') && !/^\d+$/.test(trimmed);
}

export function buildGorgiasCreatePayload(
  accountOrDomain: string,
  displayName: string,
  gorgiasApiEmail: string,
  gorgiasApiKey: string
) {
  const trimmed = accountOrDomain.trim();
  const name = displayName.trim() || undefined;
  const credentials = {
    gorgias_api_email: gorgiasApiEmail.trim(),
    gorgias_api_key: gorgiasApiKey.trim(),
  };
  if (looksLikeDomain(trimmed)) {
    return { domain: trimmed, name, ...credentials };
  }
  return { account_id: trimmed, name, ...credentials };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isGorgiasIntegrationLimitError(error: string | null | undefined): boolean {
  if (!error?.trim()) return false;
  const lower = error.toLowerCase();
  return lower.includes('integration limit') || lower.includes('upgrade your plan');
}

export function formatGorgiasSidebarWidgetRegistrationWarning(
  sidebarError: string | null | undefined,
  webhookAutoRegistered: boolean,
): string {
  const prefix = `Gorgias connected${webhookAutoRegistered ? ' and ticket sync is active' : ''}, but the sidebar widget couldn't be registered automatically`;

  if (isGorgiasIntegrationLimitError(sidebarError)) {
    return `${prefix}. Your Gorgias account has reached its integration limit. In Gorgias, go to Settings → Integrations and remove an unused integration, or upgrade your Gorgias plan. Then reconnect here.`;
  }

  return `${prefix} (${sidebarError ?? 'unknown error'}). Reconnect to try again.`;
}

function parseSidebarWidget(value: unknown): GorgiasSidebarWidgetSetupResult | null {
  if (!isRecord(value)) return null;
  const status = value.status;
  if (status !== 'success' && status !== 'error') return null;
  const result: GorgiasSidebarWidgetSetupResult = { status };
  if (typeof value.integration_id === 'number') result.integration_id = value.integration_id;
  if (typeof value.widget_id === 'number') result.widget_id = value.widget_id;
  if (typeof value.error === 'string') result.error = value.error;
  if (value.error_kind === 'auth' || value.error_kind === 'other') result.error_kind = value.error_kind;
  return result;
}

export type GorgiasCreateConnectionResponse = {
  webhook_secret_plaintext?: string;
  webhook_url?: string;
  header_name?: string;
  warning?: string;
  hasExistingConnection: boolean;
  sidebar_widget?: GorgiasSidebarWidgetSetupResult | null;
  support_webhook_auto_registered?: boolean;
  code?: string;
  error?: string;
};

export function parseGorgiasCreateConnectionResponse(body: unknown): GorgiasCreateConnectionResponse {
  if (!isRecord(body)) return { hasExistingConnection: false };
  return {
    webhook_secret_plaintext:
      typeof body.webhook_secret_plaintext === 'string' ? body.webhook_secret_plaintext : undefined,
    webhook_url: typeof body.webhook_url === 'string' ? body.webhook_url : undefined,
    header_name: typeof body.header_name === 'string' ? body.header_name : undefined,
    warning: typeof body.warning === 'string' ? body.warning : undefined,
    hasExistingConnection: isRecord(body.connection) && typeof body.connection.id === 'string',
    sidebar_widget: parseSidebarWidget(body.sidebar_widget),
    support_webhook_auto_registered: body.support_webhook_auto_registered === true,
    code: typeof body.code === 'string' ? body.code : undefined,
    error: typeof body.error === 'string' ? body.error : undefined,
  };
}

export function resolveGorgiasConnectMessage(
  body: GorgiasCreateConnectionResponse,
  sidebar: GorgiasSidebarWidgetSetupResult | null | undefined
): { message: { type: 'success' | 'error' | 'warning'; text: string }; showSetup: boolean; ephemeral?: {
  secret: string;
  webhookUrl: string;
  headerName: string;
  warning: string;
} } {
  const webhookAutoRegistered = Boolean(body.support_webhook_auto_registered);
  const isUpdate = !body.webhook_secret_plaintext && body.hasExistingConnection;

  if (body.webhook_secret_plaintext && body.webhook_url && !webhookAutoRegistered) {
    const ephemeral = {
      secret: body.webhook_secret_plaintext,
      webhookUrl: body.webhook_url,
      headerName: body.header_name ?? GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME,
      warning: body.warning ?? GORGIAS_SUPPORT_SECRET_SAVE_WARNING,
    };
    if (sidebar && sidebar.status === 'error') {
      return {
        showSetup: true,
        ephemeral,
        message: {
          type: 'warning',
          text: formatGorgiasSidebarWidgetRegistrationWarning(sidebar.error, webhookAutoRegistered),
        },
      };
    }
    return {
      showSetup: true,
      ephemeral,
      message: {
        type: 'success',
        text: 'Gorgias credentials saved. Complete the webhook steps below to show risk data in tickets.',
      },
    };
  }

  if (sidebar && sidebar.status === 'error') {
    return {
      showSetup: false,
      message: {
        type: 'warning',
        text: formatGorgiasSidebarWidgetRegistrationWarning(sidebar.error, webhookAutoRegistered),
      },
    };
  }

  if (webhookAutoRegistered) {
    return { showSetup: false, message: { type: 'success', text: GORGIAS_CONNECT_SUCCESS_MESSAGE } };
  }

  if (isUpdate && sidebar?.status === 'success') {
    return { showSetup: false, message: { type: 'success', text: GORGIAS_CONNECT_SUCCESS_MESSAGE } };
  }

  if (isUpdate) {
    return { showSetup: false, message: { type: 'success', text: 'Gorgias API credentials saved.' } };
  }

  return { showSetup: false, message: { type: 'success', text: GORGIAS_CONNECT_SUCCESS_MESSAGE } };
}
