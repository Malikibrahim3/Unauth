/**
 * Text wordmark with the lime full stop — set in the display face so the
 * logo is typography, not an asset. `tone` flips ink for dark sections.
 */
export default function Wordmark({
  tone = 'light',
  className = '',
}: {
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const ink = tone === 'dark' ? 'text-[var(--ink-inverse)]' : 'text-[var(--ink-primary)]';
  return (
    <span
      className={`inline-flex items-baseline font-semibold tracking-[-0.02em] [font-family:var(--ua-font-display)] ${ink} ${className}`}
    >
      unauth
      <span aria-hidden className="ml-[0.08em] inline-block h-[0.18em] w-[0.18em] rounded-full bg-[var(--lime)]" />
    </span>
  );
}
