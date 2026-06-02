import { FLAG_COMMAND_CENTER } from '@/lib/flags';
import {
  unifiedToCustomerResults,
  type CustomerResult,
  type UnifiedResult,
} from '@/components/layout/commandPaletteReducer';

export async function fetchSearchResults(query: string): Promise<{
  customerResults: CustomerResult[];
  unifiedResults: UnifiedResult[];
}> {
  const trimmed = query.trim();
  if (FLAG_COMMAND_CENTER) {
    const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=6`);
    const data = response.ok ? await response.json() as { results?: UnifiedResult[] } : { results: [] };
    const unifiedResults = data.results ?? [];
    return { unifiedResults, customerResults: unifiedToCustomerResults(unifiedResults) };
  }
  const response = await fetch(`/api/customers/search?q=${encodeURIComponent(trimmed)}&limit=5`);
  const data = response.ok ? await response.json() as { results?: CustomerResult[] } : { results: [] };
  return { unifiedResults: [], customerResults: data.results ?? [] };
}
