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
        aria-hidden="true"
        className={
          highlight
            ? 'ua-landing-comparison-indicator ua-landing-comparison-indicator--yes-highlight'
            : 'ua-landing-comparison-indicator ua-landing-comparison-indicator--yes'
        }
      >
        ●
      </span>
    );
  }

  if (value === 'partial') {
    return (
      <span
        aria-hidden="true"
        className="ua-landing-comparison-indicator ua-landing-comparison-indicator--partial"
      >
        −
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="ua-landing-comparison-indicator ua-landing-comparison-indicator--no"
    >
      ○
    </span>
  );
}
