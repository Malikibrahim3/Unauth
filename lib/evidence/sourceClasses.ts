/**
 * Evidence provenance is intentionally narrower than the connector list. A
 * source class describes what a record is allowed to establish in a case; it
 * is not a provider capability or a rule decision.
 */
export const CASE_SOURCE_CLASSES = [
  'helpdesk',
  'store',
  'three_pl',
  'courier',
  'customer_history',
] as const;
export type CaseSourceClass = (typeof CASE_SOURCE_CLASSES)[number];

export const CASE_SOURCE_CLASS_LABELS: Record<CaseSourceClass, string> = {
  helpdesk: 'Helpdesk',
  store: 'Store',
  three_pl: '3PL',
  courier: 'Courier',
  customer_history: 'Customer history',
};

const SOURCE_CLASS_ALIASES: Record<string, CaseSourceClass> = {
  helpdesk: 'helpdesk',
  support: 'helpdesk',
  zendesk: 'helpdesk',
  gorgias: 'helpdesk',
  intercom: 'helpdesk',
  store: 'store',
  shopify: 'store',
  woocommerce: 'store',
  ecommerce: 'store',
  three_pl: 'three_pl',
  '3pl': 'three_pl',
  warehouse: 'three_pl',
  fulfillment: 'three_pl',
  wms: 'three_pl',
  courier: 'courier',
  carrier: 'courier',
  shipping: 'courier',
  tracking: 'courier',
  customer_history: 'customer_history',
  history: 'customer_history',
  crm: 'customer_history',
};

function token(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/[-\s]+/g, '_') : '';
}
/** Uses an explicit stored class first, then a conservative connector hint. */
export function resolveCaseSourceClass(row: {
  case_source_class?: unknown;
  source_system?: unknown;
  source_provider?: unknown;
  evidence_type?: unknown;
  source_metadata?: unknown;
}): CaseSourceClass | null {
  const explicit = token(row.case_source_class);
  if (explicit in SOURCE_CLASS_ALIASES) return SOURCE_CLASS_ALIASES[explicit];
  const metadata = row.source_metadata && typeof row.source_metadata === 'object'
    ? row.source_metadata as Record<string, unknown>
    : {};
  const candidates = [
    row.source_system,
    row.source_provider,
    metadata.source_class,
    metadata.source_type,
    metadata.provider,
    row.evidence_type,
  ];
  for (const candidate of candidates) {
    const value = token(candidate);
    if (value in SOURCE_CLASS_ALIASES) return SOURCE_CLASS_ALIASES[value];
    const match = Object.keys(SOURCE_CLASS_ALIASES).find((alias) => value.includes(alias));
    if (match) return SOURCE_CLASS_ALIASES[match];
  }
  return null;
}

export function isCustomerHistorySource(sourceClass: CaseSourceClass | null | undefined): boolean {
  return sourceClass === 'customer_history';
}

/** Customer history is review context only and can never enter a claim pack. */
export function isAllowedInProviderPack(sourceClass: CaseSourceClass | null | undefined): boolean {
  return sourceClass != null && sourceClass !== 'customer_history';
}

export function sourceLineageRootId(row: {
  id: string;
  source_lineage_root_id?: string | null;
}): string {
  return row.source_lineage_root_id ?? row.id;
}

export function sameSourceLineage(left: { id: string; source_lineage_root_id?: string | null }, right: { id: string; source_lineage_root_id?: string | null }): boolean {
  return sourceLineageRootId(left) === sourceLineageRootId(right);
}
