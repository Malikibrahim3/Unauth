import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PanelCard, uiTokens } from '@/components/ui';

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
    <PanelCard variant="app" className="flex flex-col justify-between p-4">
      <div className="flex items-start justify-between gap-2">
        <p className={uiTokens.app.eyebrow}>{label}</p>
        {Icon ? <Icon className="h-4 w-4 shrink-0" style={{ color: 'var(--text-tertiary)' }} /> : null}
      </div>
      <div>
        <p
          className="text-xl font-semibold tabular-nums mt-2"
          style={{ color: incomplete ? 'var(--text-tertiary)' : 'var(--text-primary)' }}
        >
          {value}
        </p>
        {hint ? (
          <p className="text-xs mt-1.5 leading-snug" style={{ color: incomplete ? 'var(--warning)' : 'var(--text-tertiary)' }}>
            {hint}
          </p>
        ) : null}
      </div>
    </PanelCard>
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
    <PanelCard as="section" variant="app" className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{title}</p>
        </div>
        {href ? (
          <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
            {linkLabel ?? 'View'} <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <div className="px-4 py-3">{children}</div>
    </PanelCard>
  );
}
