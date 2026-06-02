import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { Tone } from '@/app/(app)/dashboard/dashboardPageTypes';

export function DashboardCompletenessBanner({
  banner,
  primaryCta,
}: {
  banner: { tone: Tone; title: string; body: string };
  primaryCta: { label: string; href: string };
}) {
  const accentBorder =
    banner.tone === 'stale'
      ? 'var(--border-default)'
      : 'color-mix(in srgb, var(--warning) 35%, var(--border-default))';
  const bg =
    banner.tone === 'stale'
      ? 'var(--bg-surface)'
      : 'color-mix(in srgb, var(--warning) 7%, var(--bg-surface))';
  return (
    <section
      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border px-4 py-3.5"
      style={{ background: bg, borderColor: accentBorder }}
    >
      <div className="flex items-start gap-3 min-w-0">
        <span
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{ background: 'color-mix(in srgb, var(--warning) 14%, transparent)' }}
        >
          <AlertTriangle className="h-4 w-4" style={{ color: 'var(--warning)' }} />
        </span>
        <div className="min-w-0">
          <p className="text-body-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>{banner.title}</p>
          <p className="text-caption mt-0.5 leading-snug" style={{ color: 'var(--ink-secondary)' }}>{banner.body}</p>
        </div>
      </div>
      <Link
        href={primaryCta.href}
        className="btn-accent shrink-0 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-caption font-semibold"
      >
        {primaryCta.label}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
