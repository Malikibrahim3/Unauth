/**
 * Document-upload connector adapter (wrapper).
 *
 * Manual liability-document upload (carrier/warehouse terms → what's owed).
 * There is no live sync or webhook surface — those methods return a typed
 * `unsupported` result describing the manual nature, which is truthful rather
 * than a false success.
 */
import { capability } from '@/lib/connectors/capabilities';
import { documentUploadProvider } from '@/lib/integrations/providers/documentUpload';
import type {
  ConnectorAdapter,
  ConnectionTestResult,
  DeepLinkInput,
  DisconnectResult,
  IngestionResult,
  NormalizedRecord,
  SyncPage,
  UnsupportedResult,
} from '@/lib/connectors/types';

const MANUAL_ONLY: UnsupportedResult = {
  supported: false,
  reason: 'Document upload is a manual surface; it has no live sync or webhook.',
};

export const documentUploadConnector: ConnectorAdapter = {
  manifest: {
    ...documentUploadProvider,
    verificationStatus: 'partial',
    launchVisible: true,
    connectorVersion: '1',
    capabilities: [
      capability('documents.read', 'read', { description: 'Read uploaded documents' }),
      capability('documents.link', 'link', { description: 'Link documents to cases/partners' }),
    ],
  },

  async testConnection(): Promise<ConnectionTestResult> {
    // Manual upload is always "connected" once the merchant has the feature.
    return { ok: true };
  },

  async initialImport(): Promise<SyncPage | UnsupportedResult> {
    return MANUAL_ONLY;
  },
  async incrementalSync(): Promise<SyncPage | UnsupportedResult> {
    return MANUAL_ONLY;
  },
  async processWebhook(): Promise<IngestionResult | UnsupportedResult> {
    return MANUAL_ONLY;
  },

  async normalize(input): Promise<NormalizedRecord[]> {
    const raw = input.raw;
    const externalId = String(raw.id ?? raw.external_id ?? '');
    if (!externalId) return [];
    return [{ canonicalEntityType: 'document', sourceEntityType: input.sourceEntityType, externalId, data: raw }];
  },

  deepLink(input: DeepLinkInput): string | null {
    return input.sourceUrl ?? null;
  },

  async disconnect(): Promise<DisconnectResult> {
    return { ok: true };
  },
};
