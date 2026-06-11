import Link from 'next/link';
import { AlertTriangle, ArrowRight, Info } from 'lucide-react';
import type { Tone } from '@/app/(app)/dashboard/dashboardPageTypes';

export function DashboardCompletenessBanner({
  banner,
  primaryCta,
}: {
  banner: { tone: Tone; title: string; body: string };
  primaryCta: { label: string; href: string };
}) {
  const isAlarm = banner.tone === 'incomplete';
  const accentBorder = isAlarm
    ? 'color-mix(in srgb, var(--warning) 35%, var(--border))'
    : 'var(--border)';
  const bg = isAlarm
    ? 'color-mix(in srgb, var(--warning) 7%, var(--surface))'
    : 'var(--surface)';
  const iconColor = isAlarm ? 'var(--warning)' : 'var(--text-tertiary)';
  const iconBg = isAlarm
    ? 'color-mix(in srgb, var(--warning) 14%, transparent)'
    : 'var(--surface-sunken)';
  const BannerIcon = isAlarm ? AlertTriangle : Info;
  return (
    <section
      className="flex flex-wrap items-center justify-between gap-4 rounded-md border px-4 py-3.5"
      style={{ background: bg, borderColor: accentBorder }}
    >
      <div className="flex items-start gap-3 min-w-0">
        <span
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{ background: iconBg }}
        >
          <BannerIcon className="h-4 w-4" style={{ color: iconColor }} />
        </span>
        <div className="min-w-0">
          <p className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{banner.title}</p>
          <p className="text-caption mt-0.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>{banner.body}</p>
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
