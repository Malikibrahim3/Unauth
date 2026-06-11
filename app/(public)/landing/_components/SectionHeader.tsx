/**
 * Consistent section opener: mono eyebrow, display headline, measured body.
 * `tone="dark"` variant is used on graphite sections (privacy, final CTA).
 */
export default function SectionHeader({
  eyebrow,
  headline,
  body,
  tone = 'light',
  align = 'left',
}: {
  eyebrow: string;
  headline: string;
  body?: string;
  tone?: 'light' | 'dark';
  align?: 'left' | 'center';
}) {
  const dark = tone === 'dark';
  const alignCls = align === 'center' ? 'mx-auto text-center' : '';
  return (
    <div className={`max-w-[40rem] ${alignCls}`}>
      <p
        className={`font-mono text-xs uppercase tracking-[0.14em] ${
          dark ? 'text-[var(--lime)]' : 'text-[var(--ink-secondary)]'
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-4 text-[1.75rem] font-semibold leading-[1.12] tracking-[-0.02em] [font-family:var(--ua-font-display)] md:text-[2.375rem] ${
          dark ? 'text-[var(--ink-inverse)]' : 'text-[var(--ink-primary)]'
        }`}
      >
        {headline}
      </h2>
      {body ? (
        <p
          className={`mt-5 text-[1.0625rem] leading-[1.65] ${
            dark
              ? 'text-[color-mix(in_srgb,var(--ink-inverse)_72%,transparent)]'
              : 'text-[var(--ink-secondary)]'
          }`}
        >
          {body}
        </p>
      ) : null}
    </div>
  );
}
