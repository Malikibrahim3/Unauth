import { Check, Minus, X } from 'lucide-react';

type IndicatorValue = 'yes' | 'partial' | 'no';

export function LandingComparisonIndicator({
  value,
  highlight = false,
}: {
  value: IndicatorValue;
  highlight?: boolean;
}) {
  if (value === 'yes') {
    return (
      <span
        className={
          highlight
            ? 'ua-landing-comparison-indicator ua-landing-comparison-indicator--yes-highlight'
            : 'ua-landing-comparison-indicator ua-landing-comparison-indicator--yes'
        }
      >
        <Check size={15} strokeWidth={2.5} aria-label="Included" />
      </span>
    );
  }

  if (value === 'partial') {
    return (
      <span className="ua-landing-comparison-indicator ua-landing-comparison-indicator--partial">
        <Minus size={15} strokeWidth={2.5} aria-label="Partial" />
      </span>
    );
  }

  return (
    <span className="ua-landing-comparison-indicator ua-landing-comparison-indicator--no">
      <X size={13} strokeWidth={2} aria-label="Not included" />
    </span>
  );
}
