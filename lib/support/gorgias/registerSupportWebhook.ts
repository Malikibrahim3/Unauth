import {
  gorgiasApiBaseUrl,
  gorgiasApiRequest,
  basicAuthHeader,
} from '@/lib/support/gorgias/registerSidebarWidget';
import { GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME } from '@/lib/support/gorgias/supportConnectionShared';
import { GORGIAS_DOMAIN_HEADER } from '@/lib/support/gorgias/accountIdentity';

export type GorgiasSupportWebhookRegistrationResult = { integrationId: number };

export async function registerGorgiasSupportWebhook(input: {
  providerBaseUrl: string;
  credentials: { email: string; api_key: string };
  webhookUrl: string;
  webhookSecretPlaintext: string;
  domain: string;
  previousIntegrationId?: number | null;
}): Promise<GorgiasSupportWebhookRegistrationResult> {
  const apiBaseUrl = gorgiasApiBaseUrl(input.providerBaseUrl);

  const integration = await gorgiasApiRequest<{ id: number }>(
    apiBaseUrl,
    '/integrations',
    input.credentials,
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'Unauth Support Webhook',
        description: 'Pushes Gorgias ticket events to Unauth for fraud/claim intelligence',
        type: 'http',
        http: {
          url: input.webhookUrl,
          method: 'POST',
          headers: {
            [GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME]: input.webhookSecretPlaintext,
            [GORGIAS_DOMAIN_HEADER]: input.domain,
          },
          triggers: {
            'ticket-created': true,
            'ticket-updated': true,
            'ticket-message-created': true,
          },
          request_content_type: 'application/json',
          response_content_type: 'application/json',
        },
      }),
    }
  );

  if (input.previousIntegrationId) {
    await deleteGorgiasSupportWebhookIntegration(
      apiBaseUrl,
      input.credentials,
      input.previousIntegrationId
    );
  }

  return { integrationId: integration.id };
}

export async function deleteGorgiasSupportWebhookIntegration(
  apiBaseUrl: string,
  credentials: { email: string; api_key: string },
  integrationId: number
): Promise<void> {
  try {
    const res = await fetch(
      `${apiBaseUrl.replace(/\/$/, '')}/integrations/${integrationId}`,
      {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: basicAuthHeader(credentials.email, credentials.api_key),
        },
      }
    );
    if (!res.ok && res.status !== 404) {
      await res.text().catch(() => '');
    }
  } catch {
    // best-effort — never throw
  }
}
