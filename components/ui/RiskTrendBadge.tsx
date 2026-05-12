/**
 * RiskTrendBadge
 *
 * Reads the last N risk_score snapshots from a customer's profile history
 * (passed in as a prop — data is fetched server-side and threaded through the
 * WatchlistTableClient so this component stays purely presentational).
 *
 * Trend classification:
 *   worsening  → critical  (mean of second half > mean of first half by >5 pts)
 *   improving  → success   (mean of first half > mean of second half by >5 pts)
 *   stable     → neutral
 */

import { Badge } from '@/components/ui/Badge';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

export type RiskTrend = 'worsening' | 'improving' | 'stable';

export function classifyTrend(scores: number[]): RiskTrend {
  if (scores.length < 2) return 'stable';
  const mid = Math.floor(scores.length / 2);
  const first = scores.slice(0, mid);
  const second = scores.slice(mid);
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const diff = avg(second) - avg(first); // positive → getting worse (higher score = higher risk)
  if (diff > 5) return 'worsening';
  if (diff < -5) return 'improving';
  return 'stable';
}

interface RiskTrendBadgeProps {
  /** Last N risk_score values in chronological order (oldest first). */
  scores: number[];
}

export function RiskTrendBadge({ scores }: RiskTrendBadgeProps) {
  const trend = classifyTrend(scores);

  if (trend === 'worsening') {
    return (
      <Badge tone="critical" variant="subtle" size="sm" dot={false}>
        <TrendingUp className="h-3 w-3 mr-1" aria-hidden="true" />
        Worsening
      </Badge>
    );
  }

  if (trend === 'improving') {
    return (
      <Badge tone="success" variant="subtle" size="sm" dot={false}>
        <TrendingDown className="h-3 w-3 mr-1" aria-hidden="true" />
        Improving
      </Badge>
    );
  }

  return (
    <Badge tone="neutral" variant="subtle" size="sm" dot={false}>
      <Minus className="h-3 w-3 mr-1" aria-hidden="true" />
      Stable
    </Badge>
  );
}
