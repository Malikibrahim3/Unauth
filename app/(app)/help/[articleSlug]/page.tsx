import Link from 'next/link';
import { ArrowLeft, BookOpen, CircleHelp } from 'lucide-react';
import { PageFrame, Surface } from '@/components/ui';

export const dynamic = 'force-dynamic';

const ARTICLES: Record<string, { title: string; summary: string; sections: Array<{ heading: string; body: string }> }> = {
  'reviewing-cases': {
    title: 'Reviewing cases',
    summary: 'Keep source evidence, recommendations, merchant decisions, and outcomes distinct while you work.',
    sections: [
      { heading: 'Start with the evidence spine', body: 'Review the source records and their timestamps before reading the recommendation. Missing or stale evidence is a visible state, not an invitation to infer a value.' },
      { heading: 'Record the merchant decision separately', body: 'A recommendation is advisory. The merchant decision is the auditable action that changes the case state and should remain attributable to a person.' },
    ],
  },
  'data-health': {
    title: 'Understanding data health',
    summary: 'Use coverage, freshness, and reconciliation status to decide which surfaces are safe to act on.',
    sections: [
      { heading: 'Coverage is not completeness', body: 'A connected source confirms an integration path; it does not guarantee every historical record is present. Check the source detail and import history for scope.' },
      { heading: 'Unknown is a valid state', body: 'When freshness or reconciliation cannot be verified, the product keeps the value qualified rather than displaying a misleading zero or success state.' },
    ],
  },
  'setting-up-a-source': {
    title: 'Setting up a source',
    summary: 'Connect a provider through explicit permissions, field mapping, historical scope, and a reviewable activation step.',
    sections: [
      { heading: 'Review before activation', body: 'Confirm the permission scope, field mapping, historical range, and schedule before activating. Secrets are never displayed or returned after submission.' },
      { heading: 'Repair from the source detail', body: 'If a sync is stale or partially complete, use the source detail and import history to inspect the last successful checkpoint and outstanding work.' },
    ],
  },
};

function humanize(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ articleSlug: string }>;
}) {
  const { articleSlug } = await params;
  const article = ARTICLES[articleSlug] ?? {
    title: humanize(articleSlug),
    summary: 'Practical guidance for operating the Unauth decision ledger.',
    sections: [{ heading: 'This article is being expanded', body: 'Use the Help index or Search to find a live operating surface. If the question is about a source, start with Data health and inspect the source detail before acting.' }],
  };

  return (
    <PageFrame title={article.title} subtitle={article.summary}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <Surface structure="working" className="overflow-hidden">
          <div className="border-b border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] px-5 py-4">
            <div className="flex items-center gap-2 text-caption text-[var(--ua-text-secondary)]">
              <BookOpen size={15} aria-hidden="true" />
              Help article
            </div>
          </div>
          <div className="space-y-7 p-5 sm:p-7">
            {article.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-h3 text-[var(--ua-text-primary)]">{section.heading}</h2>
                <p className="mt-2 max-w-2xl text-body leading-7 text-[var(--ua-text-secondary)]">{section.body}</p>
              </section>
            ))}
          </div>
        </Surface>

        <aside className="space-y-3">
          <Surface structure="inset" pad="standard">
            <CircleHelp size={16} className="text-[var(--ua-action-700)]" aria-hidden="true" />
            <p className="mt-3 text-body font-medium text-[var(--ua-text-primary)]">Need another answer?</p>
            <p className="mt-1 text-caption text-[var(--ua-text-secondary)]">Search the workspace or return to the Help index.</p>
            <div className="mt-4 flex flex-col gap-2">
              <Link href="/search" className="text-label font-medium text-[var(--ua-action-700)] hover:underline">Search workspace</Link>
              <Link href="/help" className="inline-flex items-center gap-1 text-label text-[var(--ua-text-secondary)] hover:text-[var(--ua-text-primary)]"><ArrowLeft size={13} aria-hidden="true" /> All help</Link>
            </div>
          </Surface>
        </aside>
      </div>
    </PageFrame>
  );
}
