import { formatDateTime } from '@/lib/utils/format';

export function formatIntegrationDate(value: string | null) {
  if (!value) return 'Never';
  return formatDateTime(value);
}
