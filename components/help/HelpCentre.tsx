'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { HELP_ARTICLES } from '@/lib/help/registry';
import styles from './HelpOperations.module.css';

const CATEGORY_ORDER = ['Activate', 'Operate', 'Recover', 'Administer'] as const;

export function HelpCentre({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const articles = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return HELP_ARTICLES;
    return HELP_ARTICLES.filter((article) => [article.category, article.title, article.summary, article.lead, ...article.keywords].join(' ').toLowerCase().includes(term));
  }, [query]);

  useEffect(() => {
    const term = query.trim();
    window.history.replaceState(null, '', term ? `/help?q=${encodeURIComponent(term)}` : '/help');
  }, [query]);

  return (
    <div className={styles.help} data-surface-id="help-index" data-operations-surface="help">
      <section className={styles.searchCard}>
        <div className={styles.searchRow}>
          <label><span className="sr-only">Search the guides</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={'Search the guides — try "unavailable", "write off" or "chargeback"'} /></label>
          <a href="mailto:support@unauth.app" className={styles.button}>Contact support</a>
        </div>
        <div className={styles.common}><span>Common:</span><Link href="/help/activation">Complete activation</Link><Link href="/help/source-repair">Repair a source</Link><Link href="/help/case-investigation">Investigate a Case</Link><Link href="/help/privacy-requests">Handle a privacy request</Link></div>
      </section>
      {articles.length ? <div className={styles.groupGrid}>{CATEGORY_ORDER.map((category) => {
        const categoryArticles = articles.filter((article) => article.category === category);
        if (!categoryArticles.length) return null;
        return <section className={styles.guideCard} key={category}><div className={styles.guideTitle}><h2 className="ua-text-working-title">{category}</h2><span>{categoryArticles.length} {categoryArticles.length === 1 ? 'guide' : 'guides'}</span></div><nav aria-label={category}>{categoryArticles.map((article) => <Link href={`/help/${article.slug}`} key={article.slug}><span><strong>{article.title}</strong><small>{article.summary}</small></span><i>›</i></Link>)}</nav></section>;
      })}</div> : <section className={styles.empty}><h2>No guide matches “{query}”</h2><p>Try activation, source, Work, Case, recovery, reconciliation, roles, privacy, or API.</p><button type="button" onClick={() => setQuery('')}>Clear search</button></section>}
      <section className={styles.supportCard}><div><h2>Still stuck?</h2><p>Include the workspace name, object reference, error code, and time. Do not email secrets, customer contact details, addresses, or ticket bodies.</p></div><span /><a href="mailto:support@unauth.app" className={styles.button}>Contact support</a><Link href="/sources/connected" className={styles.primary}>Check source health</Link></section>
    </div>
  );
}

export function PrintButton() {
  return <button type="button" className="ua-button ua-button--secondary ua-button--sm" onClick={() => window.print()}>Print</button>;
}

export function ArticleFeedback({ articleSlug = 'general' }: { articleSlug?: string }) {
  const [answer, setAnswer] = useState<'yes' | 'no' | null>(null);

  function recordAnswer(next: 'yes' | 'no') {
    setAnswer(next);
    window.localStorage.setItem(`unauth.help.${articleSlug}.feedback`, next);
  }

  return (
    <>
      <div role="group" aria-label="Was this article useful?">
        <button type="button" aria-pressed={answer === 'yes'} onClick={() => recordAnswer('yes')}>Yes</button>
        <button type="button" aria-pressed={answer === 'no'} onClick={() => recordAnswer('no')}>No</button>
      </div>
      <p role="status" aria-live="polite">
        {answer ? 'Thanks — your response was saved in this browser.' : 'Feedback is not attached to your workspace data.'}
      </p>
    </>
  );
}
