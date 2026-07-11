/**
 * Gorgias connector adapter (wrapper).
 *
 * Wraps the existing Gorgias helpdesk stack. The generic Gorgias sync branch
 * historically performed no work yet could update last_sync_at; this adapter
 * returns a typed `unsupported` result for sync (the real Gorgias backfill runs
 * through its dedicated route) so it can never report a false success.
 */
import { capability } from '@/lib/connectors/capabilities';
import { writeAccountabilityNoteToGorgias } from '@/lib/claim-gate/writeBackToGorgias';
import type {
  ActionResult,
  ConnectorAction,
  ConnectorAdapter,
  ConnectorContext,
  ConnectionTestResult,
  DeepLinkInput,
  DisconnectResult,
  IngestionResult,
  NormalizedRecord,
  SyncPage,
  UnsupportedResult,
  WebhookContext,
} from '@/lib/connectors/types';

const RUNTIME_PENDING: UnsupportedResult = {
  supported: false,
  reason: 'Gorgias sync/webhook run through the dedicated Gorgias support routes pending Phase 2 runtime wiring.',
};

export const gorgiasConnector: ConnectorAdapter = {
  manifest: {
    id: 'gorgias',
    name: 'Gorgias',
    category: 'helpdesk',
    authMode: 'api_key',
    verificationStatus: 'partial',
    launchVisible: true,
    connectorVersion: '1',
    description: 'Support tickets, messages, and the compressed decision widget.',
    capabilities: [
      capability('tickets.read', 'read', { description: 'Read tickets' }),
      capability('messages.read', 'read', { description: 'Read ticket messages' }),
      capability('tickets.subscribe', 'subscribe', { description: 'Ticket webhooks' }),
      capability('tickets.write_note', 'write', { risk: 'low', description: 'Add internal note' }),
      capability('tickets.write_tag', 'write', { risk: 'low', description: 'Add tag' }),
      // MVP+ boundary: autonomous denial stays unsupported.
      capability('request.deny', 'act', { support: 'unsupported', description: 'Deny request (forbidden in MVP+)' }),
    ],
  },

  async testConnection(ctx: ConnectorContext): Promise<ConnectionTestResult> {
    const creds = ctx.credentials ?? {};
    const domain = typeof creds.accountDomain === 'string' ? creds.accountDomain : null;
    const apiKey = typeof creds.apiKey === 'string' ? creds.apiKey : null;
    if (!domain || !apiKey) {
      return { ok: false, errorCode: 'test_connection_failed', message: 'Missing account domain or API key.' };
    }
    return { ok: true, providerAccountId: domain, providerAccountName: domain };
  },

  async initialImport(): Promise<SyncPage | UnsupportedResult> {
    return RUNTIME_PENDING;
  },
  async incrementalSync(): Promise<SyncPage | UnsupportedResult> {
    return RUNTIME_PENDING;
  },
  async processWebhook(_ctx: WebhookContext): Promise<IngestionResult | UnsupportedResult> {
    return RUNTIME_PENDING;
  },

  async normalize(input): Promise<NormalizedRecord[]> {
    const raw = input.raw;
    if (input.sourceEntityType === 'ticket') {
      const externalId = String(raw.id ?? raw.external_id ?? '');
      if (!externalId) return [];
      return [{
        canonicalEntityType: 'ticket',
        sourceEntityType: 'ticket',
        externalId,
        sourceCreatedAt: typeof raw.created_datetime === 'string' ? raw.created_datetime : null,
        sourceUpdatedAt: typeof raw.updated_datetime === 'string' ? raw.updated_datetime : null,
        data: raw,
      }];
    }
    return [];
  },

  deepLink(input: DeepLinkInput): string | null {
    if (input.sourceUrl) return input.sourceUrl;
    const base = input.providerAccountBaseUrl?.replace(/\/$/, '');
    if (!base) return null;
    if (input.entityType === 'ticket') return `${base}/tickets/${input.externalId}`;
    return null;
  },

  /**
   * Low-risk write-backs: internal note and tag on a helpdesk ticket. These
   * route through the real Gorgias API (the same path the accountability/gate
   * write-backs use), so the controlled connector-action service executes them
   * for real instead of falling back to manual-required.
   */
  async executeAction(ctx: ConnectorContext, action: ConnectorAction): Promise<ActionResult> {
    const externalTicketId = typeof action.payload.externalRecordId === 'string'
      ? action.payload.externalRecordId
      : null;
    if (!externalTicketId) {
      return { ok: false, reversible: false, message: 'missing_external_ticket_id' };
    }
    const tags = Array.isArray(action.payload.tags)
      ? action.payload.tags.map((t) => String(t))
      : undefined;

    if (action.capabilityId === 'tickets.write_note') {
      const bodyText = typeof action.payload.bodyText === 'string' ? action.payload.bodyText : '';
      if (!bodyText.trim()) return { ok: false, reversible: false, message: 'missing_note_body' };
      const result = await writeAccountabilityNoteToGorgias({
        client: ctx.client, merchantId: ctx.merchantId, externalTicketId, bodyText, tags,
      });
      return { ok: result.ok, reversible: false, message: result.error };
    }

    if (action.capabilityId === 'tickets.write_tag') {
      if (!tags?.length) return { ok: false, reversible: false, message: 'missing_tags' };
      const result = await writeAccountabilityNoteToGorgias({
        client: ctx.client, merchantId: ctx.merchantId, externalTicketId, bodyText: '', tags,
      });
      return { ok: result.ok, reversible: true, message: result.error };
    }

    return { ok: false, reversible: false, message: `unsupported_capability:${action.capabilityId}` };
  },

  async disconnect(): Promise<DisconnectResult> {
    return { ok: true };
  },
};
