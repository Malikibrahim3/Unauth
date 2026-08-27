import type { ConnectionReadModel } from '@/lib/connections/readModel';
import type { EffectiveConnectionBadge } from '@/lib/connections/effectiveStatus';
import type { ConnectorCatalogueItem } from '@/lib/connectors/catalogue';
import type { IntegrationCategory } from '@/lib/integrations/types';
import { humanise } from '@/lib/ui/labels';

export type CatalogueRowItem = ConnectorCatalogueItem & {
  badge: EffectiveConnectionBadge;
  noteTone?: 'warning' | 'danger' | null;
  readModel?: ConnectionReadModel;
};

export type IntegrationsView = 'connected' | 'browse' | 'imports';

const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  commerce: 'Commerce',
  helpdesk: 'Helpdesk',
  tracking: 'Tracking',
  carrier: 'Carrier',
  warehouse_3pl: 'Warehouse / 3PL',
  returns: 'Returns',
  payments_disputes: 'Payments / disputes',
  documents: 'Documents',
};

export function categoryLabel(category: string) {
  return CATEGORY_LABELS[category as IntegrationCategory] ?? humanise(category);
}
