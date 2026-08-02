'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, LifeBuoy, Search } from 'lucide-react';
import { InsetGroup, Input, Surface } from '@/components/ui';

type HelpArticle = {
  id: string;
  title: string;
  summary: string;
  keywords: string;
  steps: string[];
  action: { href: string; label: string };
};

const ARTICLES: HelpArticle[] = [
  {
    id: 'review-a-case',
    title: 'Review a case',
    summary: 'Move from queue context to evidence, a merchant decision, and any recovery follow-up.',
    keywords: 'cases evidence recommendation decision work queue',
    steps: [
      'Open the case from Work or Cases and confirm the linked customer, order, and parcel context.',
      'Review source facts and evidence readiness before considering the recommendation.',
      'Record the merchant decision, then use the case timeline to follow resulting customer and recovery work.',
    ],
    action: { href: '/claims', label: 'Open cases' },
  },
  {
    id: 'configure-rules',
    title: 'Configure merchant rules',
    summary: 'Use transparent policy checks to guide recommendations without removing merchant control.',
    keywords: 'rules recommendations policy drafts publishing settings',
    steps: [
      'Create or update a rule using the visible When, If, and Recommend sequence.',
      'Review the draft and its explanation before publishing a new version.',
      'A published rule can guide a recommendation; it never makes the final customer or financial decision for you.',
    ],
    action: { href: '/rules', label: 'Open rules' },
  },
  {
    id: 'follow-a-recovery',
    title: 'Follow a recovery',
    summary: 'Track evidence, ownership, deadlines, correspondence, and reconciled recovery outcomes.',
    keywords: 'recovery losses deadlines correspondence outcomes',
    steps: [
      'Start from a source-backed loss and confirm the evidence required for the recovery route.',
      'Use the recovery board to find the current owner, deadline, and next action.',
      'Only a reconciled provider credit reduces net unrecovered loss; keep external correspondence in the record timeline.',
    ],
    action: { href: '/recoveries', label: 'Open recovery board' },
  },
  {
    id: 'connect-sources',
    title: 'Connect data sources',
    summary: 'Set up the approved commerce and support sources that supply operational context.',
    keywords: 'integrations shopify helpdesk source connection sync',
    steps: [
      'Open Integrations to review connected source status and freshness.',
      'Choose the provider setup task that matches the source you need to connect or repair.',
      'A disconnected source can make records incomplete; it does not prove that a missing value is zero.',
    ],
    action: { href: '/integrations', label: 'Open integrations' },
  },
];

export function HelpCentre() {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const articles = useMemo(
    () => ARTICLES.filter((article) => !normalizedQuery || `${article.title} ${article.summary} ${article.keywords}`.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery],
  );

  return (
    <Surface structure="working" className="overflow-hidden">
      <div className="border-b border-[var(--ua-border-subtle)] px-5 py-4">
        <label htmlFor="help-search" className="sr-only">Search help</label>
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ua-icon-secondary)]" aria-hidden="true" />
          <Input id="help-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search help" className="pl-9" />
        </div>
      </div>
      <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 divide-y divide-[var(--ua-border-subtle)]">
          <section className="px-5 py-4" aria-labelledby="help-guides">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[var(--ua-icon-secondary)]" aria-hidden="true" />
              <h2 id="help-guides" className="ua-text-working-title text-[var(--ua-text-primary)]">Guides</h2>
            </div>
            <p className="ua-text-body mt-1 text-[var(--ua-text-secondary)]">Choose a guide to jump to its anchored instructions.</p>
            {articles.length ? <ul className="mt-3 divide-y divide-[var(--ua-border-subtle)] border-y border-[var(--ua-border-subtle)]">
              {articles.map((article) => <li key={article.id}><a href={`#${article.id}`} className="flex items-center justify-between gap-3 px-1 py-3 text-left hover:text-[var(--ua-text-link)] focus-visible:outline-none focus-visible:shadow-[var(--ua-shadow-focus)]"><span><span className="ua-text-working-title block text-[var(--ua-text-primary)]">{article.title}</span><span className="ua-text-dense mt-0.5 block text-[var(--ua-text-secondary)]">{article.summary}</span></span><span className="ua-text-label shrink-0 text-[var(--ua-text-link)]">Read</span></a></li>)}
            </ul> : <p role="status" className="ua-text-body mt-3 text-[var(--ua-text-secondary)]">No guide matches “{query}”. Try cases, rules, recovery, or integrations.</p>}
          </section>
          <div>
            {articles.map((article) => <article id={article.id} key={article.id} className="scroll-mt-6 px-5 py-5" aria-labelledby={`${article.id}-title`}>
              <h2 id={`${article.id}-title`} className="ua-text-section-title text-[var(--ua-text-primary)]">{article.title}</h2>
              <p className="ua-text-body mt-1 text-[var(--ua-text-secondary)]">{article.summary}</p>
              <ol className="ua-text-body mt-3 list-decimal space-y-2 pl-5 leading-5 text-[var(--ua-text-secondary)]">{article.steps.map((step) => <li key={step}>{step}</li>)}</ol>
              <Link href={article.action.href} className="ua-text-working-title mt-4 inline-flex text-[var(--ua-text-link)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--ua-shadow-focus)]">{article.action.label}</Link>
            </article>)}
          </div>
        </div>
        <aside className="border-t border-[var(--ua-border-subtle)] p-5 lg:border-l lg:border-t-0" aria-labelledby="help-support">
          <InsetGroup className="p-4">
            <LifeBuoy className="h-5 w-5 text-[var(--ua-icon-secondary)]" aria-hidden="true" />
            <h2 id="help-support" className="ua-text-working-title mt-3 text-[var(--ua-text-primary)]">Need support?</h2>
            <p className="ua-text-body mt-1 leading-5 text-[var(--ua-text-secondary)]">For account-specific help, email the Unauth support team. Include the case or recovery link when it is safe to share.</p>
            <a href="mailto:support@unauth.app" className="ua-text-working-title mt-4 inline-flex text-[var(--ua-text-link)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--ua-shadow-focus)]">Email support</a>
          </InsetGroup>
        </aside>
      </div>
    </Surface>
  );
}
