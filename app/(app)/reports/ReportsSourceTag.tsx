import { FileSpreadsheet, FlaskConical, Radio } from 'lucide-react';
import { StatusBadge } from '@/components/ui';

/**
 * Source tag shown on every report section so the data lineages never blur.
 * - 'live'   → a real integration is connected and feeding this section.
 * - 'sample' → existing/demo data with no live connection (never claim "Live").
 * - 'csv'    → legacy CSV import lineage.
 */
export function ReportsSourceTag({ source }: { source: 'csv' | 'live' | 'sample' }) {
  if (source === 'csv') {
    return (
      <StatusBadge variant="held" className="gap-1" dot={false}>
        <FileSpreadsheet className="h-3 w-3" /> Legacy import
      </StatusBadge>
    );
  }
  if (source === 'sample') {
    return (
      <StatusBadge variant="held" className="gap-1" dot={false}>
        <FlaskConical className="h-3 w-3" /> Sample data
      </StatusBadge>
    );
  }
  return (
    <StatusBadge variant="cleared" className="gap-1">
      <Radio className="h-3 w-3" /> Live source
    </StatusBadge>
  );
}
