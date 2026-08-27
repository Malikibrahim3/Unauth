import { PERMISSIONS, type Permission } from '@/lib/permissions';

export const SEARCH_API_TYPES = [
  'customers',
  'orders',
  'cases',
  'tickets',
  'shipments',
  'refunds',
  'returns',
  'disputes',
  'losses',
  'recoveries',
] as const;

export type SearchApiType = (typeof SEARCH_API_TYPES)[number];
export type SearchResultType =
  | 'customer'
  | 'order'
  | 'case'
  | 'ticket'
  | 'shipment'
  | 'refund'
  | 'return'
  | 'dispute'
  | 'loss'
  | 'recovery';

export const SEARCH_RESULT_TO_API_TYPE: Record<SearchResultType, SearchApiType> = {
  customer: 'customers',
  order: 'orders',
  case: 'cases',
  ticket: 'tickets',
  shipment: 'shipments',
  refund: 'refunds',
  return: 'returns',
  dispute: 'disputes',
  loss: 'losses',
  recovery: 'recoveries',
};

const DEFAULT_SEARCH_API_TYPES: readonly SearchApiType[] = SEARCH_API_TYPES;

const SEARCH_PERMISSION: Record<SearchApiType, Permission> = {
  customers: PERMISSIONS.VIEW_CUSTOMERS,
  orders: PERMISSIONS.VIEW_CUSTOMERS,
  tickets: PERMISSIONS.VIEW_CUSTOMERS,
  shipments: PERMISSIONS.VIEW_CUSTOMERS,
  refunds: PERMISSIONS.VIEW_CUSTOMERS,
  returns: PERMISSIONS.VIEW_CUSTOMERS,
  disputes: PERMISSIONS.VIEW_CUSTOMERS,
  cases: PERMISSIONS.VIEW_INBOX,
  losses: PERMISSIONS.VIEW_INBOX,
  recoveries: PERMISSIONS.VIEW_INBOX,
};

const SEARCH_API_TYPE_SET = new Set<string>(SEARCH_API_TYPES);

export function normalizeRequestedSearchApiTypes(rawTypes?: string): SearchApiType[] {
  const raw = rawTypes ? rawTypes.split(',') : DEFAULT_SEARCH_API_TYPES;
  return [...new Set(raw.map((value) => value.trim()).map((value) => value === 'evidence' ? 'cases' : value))]
    .filter((value): value is SearchApiType => SEARCH_API_TYPE_SET.has(value));
}

export function partitionSearchApiTypes(
  requested: readonly SearchApiType[],
  permissions: ReadonlySet<Permission>,
): { authorized: SearchApiType[]; restricted: SearchApiType[] } {
  const authorized: SearchApiType[] = [];
  const restricted: SearchApiType[] = [];
  for (const type of requested) {
    (permissions.has(SEARCH_PERMISSION[type]) ? authorized : restricted).push(type);
  }
  return { authorized, restricted };
}

export function allowedSearchApiTypes(permissions: ReadonlySet<Permission>): SearchApiType[] {
  return SEARCH_API_TYPES.filter((type) => permissions.has(SEARCH_PERMISSION[type]));
}

export function canSearchResultType(
  type: SearchResultType,
  permissions: ReadonlySet<Permission>,
): boolean {
  return permissions.has(SEARCH_PERMISSION[SEARCH_RESULT_TO_API_TYPE[type]]);
}
