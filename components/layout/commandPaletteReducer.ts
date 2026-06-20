import type { ReactNode } from 'react';
import type { ConfidenceGrade } from '@/lib/engine/weights';

export interface CustomerResult {
  id: string;
  name: string;
  email: string | null;
  risk_level: string;
}

export interface UnifiedResult {
  type: 'customer' | 'order' | 'case';
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  riskLevel?: string;
}

export type CommandPaletteState = {
  query: string;
  activeIdx: number;
  customerResults: CustomerResult[];
  unifiedResults: UnifiedResult[];
  searchingCustomers: boolean;
};

export type CommandPaletteAction =
  | { type: 'setQuery'; query: string }
  | { type: 'setActiveIdx'; activeIdx: number }
  | { type: 'searchStart' }
  | { type: 'searchSuccess'; customerResults: CustomerResult[]; unifiedResults: UnifiedResult[] }
  | { type: 'searchClear' }
  | { type: 'reset' };

export const initialCommandPaletteState: CommandPaletteState = {
  query: '',
  activeIdx: 0,
  customerResults: [],
  unifiedResults: [],
  searchingCustomers: false,
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
      return { ...state, searchingCustomers: true };
    case 'searchSuccess':
      return {
        ...state,
        searchingCustomers: false,
        customerResults: action.customerResults,
        unifiedResults: action.unifiedResults,
      };
    case 'searchClear':
      return {
        ...state,
        searchingCustomers: false,
        customerResults: [],
        unifiedResults: [],
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
};
