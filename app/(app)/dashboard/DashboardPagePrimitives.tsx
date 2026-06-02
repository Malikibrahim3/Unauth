import Link from 'next/link';

export function MetricCard({
  label,
  value,
  hint,
  incomplete = false,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  incomplete?: boolean;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <div
      className="flex flex-col justify-between rounded-lg border p-4"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)', minHeight: 116 }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="t-label" style={{ color: 'var(--ink-tertiary)' }}>{label}</p>
        {Icon ? <Icon className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-tertiary)' }} /> : null}
      </div>
      <div>
        <p
          className="num mt-2 font-semibold"
          style={{ fontSize: 28, lineHeight: 1.1, color: incomplete ? 'var(--ink-tertiary)' : 'var(--data-score)' }}
        >
          {value}
        </p>
        {hint ? (
          <p className="t-caption mt-1.5 leading-snug" style={{ color: incomplete ? 'var(--warning)' : 'var(--ink-tertiary)' }}>
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ModuleCard({
  title,
  href,
  linkLabel,
  icon: Icon,
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
      <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: 'var(--border-default)' }}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: 'var(--ink-tertiary)' }} />
          <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>{title}</p>
        </div>
        {href ? (
          <Link href={href} className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
            {linkLabel ?? 'View'} →
          </Link>
        ) : null}
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}
