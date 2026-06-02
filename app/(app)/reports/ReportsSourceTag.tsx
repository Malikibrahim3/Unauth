import { FileSpreadsheet, Radio } from 'lucide-react';
import { Badge } from '@/components/ui';

/** Source tag shown on every report section so the two data lineages never blur together. */
export function ReportsSourceTag({ source }: { source: 'csv' | 'live' }) {
  return source === 'csv' ? (
    <Badge tone="neutral" size="sm" className="gap-1">
      <FileSpreadsheet className="h-3 w-3" /> CSV import
    </Badge>
  ) : (
    <Badge tone="accent" size="sm" className="gap-1">
      <Radio className="h-3 w-3" /> Live source
    </Badge>
  );
}
