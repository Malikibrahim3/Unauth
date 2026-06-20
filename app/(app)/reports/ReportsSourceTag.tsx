import { FileSpreadsheet, FlaskConical, Radio } from 'lucide-react';
import { Badge } from '@/components/ui';

/**
 * Source tag shown on every report section so the data lineages never blur.
 * - 'live'   → a real integration is connected and feeding this section.
 * - 'sample' → existing/demo data with no live connection (never claim "Live").
 * - 'csv'    → legacy CSV import lineage.
 */
export function ReportsSourceTag({ source }: { source: 'csv' | 'live' | 'sample' }) {
  if (source === 'csv') {
    return (
      <Badge tone="neutral" size="sm" className="gap-1">
        <FileSpreadsheet className="h-3 w-3" /> Legacy import
      </Badge>
    );
  }
  if (source === 'sample') {
    return (
      <Badge tone="neutral" size="sm" className="gap-1">
        <FlaskConical className="h-3 w-3" /> Sample data
      </Badge>
    );
  }
  return (
    <Badge tone="accent" size="sm" className="gap-1">
      <Radio className="h-3 w-3" /> Live source
    </Badge>
  );
}
