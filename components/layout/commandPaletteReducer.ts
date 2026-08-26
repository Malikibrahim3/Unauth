import type { ReactNode } from 'react';
import type { SearchApiType, SearchResultType } from '@/lib/search/access';

export interface CustomerResult {
  id: string;
  name: string;
  email: string | null;
  risk_level: string;
  href?: string;
}

export interface UnifiedResult {
  type: SearchResultType;
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  riskLevel?: string;
  source?: string;
}

export type CommandPaletteState = {
  query: string;
  activeIdx: number;
  customerResults: CustomerResult[];
  unifiedResults: UnifiedResult[];
  searchingCustomers: boolean;
  searchError: string | null;
  partialFailures: string[];
  restrictedTypes: SearchApiType[];
};

export type CommandPaletteAction =
  | { type: 'setQuery'; query: string }
  | { type: 'setActiveIdx'; activeIdx: number }
  | { type: 'searchStart' }
  | { type: 'searchSuccess'; customerResults: CustomerResult[]; unifiedResults: UnifiedResult[]; partialFailures: string[]; restrictedTypes: SearchApiType[] }
  | { type: 'searchFailure'; error: string }
  | { type: 'searchClear' }
  | { type: 'reset' };

export const initialCommandPaletteState: CommandPaletteState = {
  query: '',
  activeIdx: 0,
  customerResults: [],
  unifiedResults: [],
  searchingCustomers: false,
  searchError: null,
  partialFailures: [],
  restrictedTypes: [],
};

export function commandPaletteReducer(
  state: CommandPaletteState,
  action: CommandPaletteAction,
): CommandPaletteState {
  switch (action.type) {
    case 'setQuery':
      return { ...state, query: action.query, activeIdx: 0 };
    case 'setActiveIdx':
      return { ...state, activeIdx: action.activeIdx };
    case 'searchStart':
      return {
        ...state,
        activeIdx: 0,
        customerResults: [],
        unifiedResults: [],
        searchingCustomers: true,
        searchError: null,
        partialFailures: [],
        restrictedTypes: [],
      };
    case 'searchSuccess':
      return {
        ...state,
        searchingCustomers: false,
        customerResults: action.customerResults,
        unifiedResults: action.unifiedResults,
        partialFailures: action.partialFailures,
        restrictedTypes: action.restrictedTypes,
        searchError: null,
      };
    case 'searchFailure':
      return {
        ...state,
        activeIdx: 0,
        customerResults: [],
        unifiedResults: [],
        searchingCustomers: false,
        searchError: action.error,
        partialFailures: [],
        restrictedTypes: [],
      };
    case 'searchClear':
      return {
        ...state,
        searchingCustomers: false,
        customerResults: [],
        unifiedResults: [],
        searchError: null,
        partialFailures: [],
        restrictedTypes: [],
      };
    case 'reset':
      return initialCommandPaletteState;
    default:
      return state;
  }
}

export function unifiedToCustomerResults(results: UnifiedResult[]): CustomerResult[] {
  const customers: CustomerResult[] = [];
  for (const r of results) {
    if (r.type === 'customer') {
      customers.push({
        id: r.id,
        name: r.label,
        email: r.sublabel ?? null,
        risk_level: r.riskLevel ?? '',
        href: r.href,
      });
    }
  }
  return customers;
}

export type NavItem = {
  label: string;
  description: string;
  href: string;
  icon: ReactNode;
  group?: string;
};
