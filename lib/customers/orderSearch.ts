import { escapePostgrestFilterValue } from '@/lib/supabase/merchantHelpers';

export function isOrderReferenceSearchTerm(value: string): boolean {
  const q = value.trim();
  return q.length >= 3 && (/^ord[-_\s]?\d+/i.test(q) || /^\d{3,}$/.test(q));
}

export function orderReferenceIlike(value: string): string {
  return `%${escapePostgrestFilterValue(value.trim().replace(/[%_]/g, ''))}%`;
}
