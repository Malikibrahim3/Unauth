import {
  unifiedToCustomerResults,
  type CustomerResult,
  type UnifiedResult,
} from '@/components/layout/commandPaletteReducer';
import type { SearchApiType } from '@/lib/search/access';

export class SearchPermissionError extends Error {
  constructor() {
    super('You do not have permission to search workspace records.');
    this.name = 'SearchPermissionError';
  }
}

export type SearchFetchOptions = {
  types?: string[];
  limit?: number;
  type?: string;
  source?: string;
  cursor?: string | null;
};

export async function fetchSearchResults(query: string, options: SearchFetchOptions = {}): Promise<{
  customerResults: CustomerResult[];
  unifiedResults: UnifiedResult[];
  partialFailures: string[];
  restrictedTypes: SearchApiType[];
  counts: Record<string, number>;
  total: number;
  nextCursor: string | null;
}> {
  const trimmed = query.trim();
  const params = new URLSearchParams({
    q: trimmed,
    limit: String(options.limit ?? 6),
  });
  if (options.types?.length) params.set('types', options.types.join(','));
  if (options.type) params.set('type', options.type);
  if (options.source && options.source !== 'all') params.set('source', options.source);
  if (options.cursor) params.set('cursor', options.cursor);
  const response = await fetch(`/api/search?${params.toString()}`);
  if (response.status === 403) throw new SearchPermissionError();
  if (!response.ok) throw new Error('Search is temporarily unavailable');
  const data = await response.json() as {
    results?: UnifiedResult[];
    partialFailures?: string[];
    restrictedTypes?: SearchApiType[];
    counts?: Record<string, number>;
    total?: number;
    nextCursor?: string | null;
  };
  const unifiedResults = data.results ?? [];
  return {
    unifiedResults,
    customerResults: unifiedToCustomerResults(unifiedResults),
    partialFailures: data.partialFailures ?? [],
    restrictedTypes: data.restrictedTypes ?? [],
    counts: data.counts ?? { all: unifiedResults.length },
    total: data.total ?? unifiedResults.length,
    nextCursor: data.nextCursor ?? null,
  };
}
