'use client';

import { useEffect, useMemo, useState } from 'react';
import { replaceHistoryUrlIfChanged } from '@/lib/navigation/history';

import { HELP_INDEX_GROUPS, HELP_INDEX_INTRO, HelpArticleGroups } from './HelpArticleGroups';

export function HelpCentre({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const groups = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return HELP_INDEX_GROUPS;
    return HELP_INDEX_GROUPS.map((group) => ({
      ...group,
      articles: group.articles.filter((article) => `${group.label} ${article.title} ${article.note} ${article.keywords}`.toLocaleLowerCase().includes(term)),
    })).filter((group) => group.articles.length > 0);
  }, [query]);

  useEffect(() => {
    const term = query.trim();
    const url = new URL(window.location.href);
    if (term) url.searchParams.set('q', term);
    else url.searchParams.delete('q');
    replaceHistoryUrlIfChanged(`${url.pathname}${url.search}${url.hash}`);
  }, [query]);

  return (
    <div
      data-surface-id="help-index"
      role="region"
      aria-label="Help content"
      tabIndex={0}
      data-operations-surface="help"
      data-state-id={groups.length === 0 ? 'help-empty' : undefined}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', justifyContent: 'center', padding: '34px 22px 20px' }}
    >
      <div style={{ width: '100%', maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <div style={{ font: "500 25px/1.25 'Inter',sans-serif", letterSpacing: '-.015em', color: '#1c1f23' }}>How this product wants to be used</div>
          <div style={{ font: "400 13.5px/1.6 'Inter',sans-serif", color: '#64686d', marginTop: 9, maxWidth: 640 }}>{HELP_INDEX_INTRO}</div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 13px', borderRadius: 10, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', maxWidth: 400 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><circle cx="6.2" cy="6.2" r="4.2"/><path d="M9.4 9.4 12 12"/></svg>
          <span className="sr-only">Search the articles</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the articles"
            style={{ flex: 1, minWidth: 0, padding: 0, border: 0, outline: 0, background: 'transparent', font: "400 13px/1.2 'Inter',sans-serif", color: '#1c1f23' }}
          />
        </label>
        {groups.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 30px' }}>
            <HelpArticleGroups groups={groups} />
          </div>
        ) : (
          <div role="status" style={{ display: 'flex', minHeight: 360, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ font: "500 16px/1.35 'Inter',sans-serif", color: '#1c1f23' }}>No article matches “{query}”</div>
            <button type="button" onClick={() => setQuery('')} style={{ marginTop: 12, padding: '7px 11px', border: 0, borderRadius: 8, background: '#f4f2ef', color: '#40454a', font: "400 12px/1 'Inter',sans-serif", cursor: 'pointer' }}>Clear search</button>
          </div>
        )}
        <div style={{ borderTop: '1px solid #ece9e4', paddingTop: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ flex: 1, font: "400 12.5px/1.6 'Inter',sans-serif", color: '#64686d' }}>Nothing here answers your question? The people who built this read every message, and the reply usually contains the answer rather than a link back to this page.</span>
          <a href="mailto:support@unauth.app" style={{ flex: 'none', padding: '8px 13px', borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>Ask a person</a>
        </div>
      </div>
    </div>
  );
}

export function ArticleFeedback({ articleSlug = 'general' }: { articleSlug?: string }) {
  const [answer, setAnswer] = useState<'yes' | 'no' | null>(null);

  function recordAnswer(next: 'yes' | 'no') {
    setAnswer(next);
    try { window.localStorage.setItem(`unauth.help.${articleSlug}.feedback`, next); } catch { /* Keep feedback usable when browser storage is unavailable. */ }
  }

  return (
    <div role="group" aria-label="Was this article useful?" style={{ display: 'flex', gap: 8 }}>
      <button type="button" aria-pressed={answer === 'yes'} onClick={() => recordAnswer('yes')} style={{ padding: '6px 12px', border: 0, borderRadius: 8, background: answer === 'yes' ? '#f4f2ef' : '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', font: "400 12px/1 'Inter',sans-serif", color: '#40454a', cursor: 'pointer' }}>Yes</button>
      <button type="button" aria-pressed={answer === 'no'} onClick={() => recordAnswer('no')} style={{ padding: '6px 12px', border: 0, borderRadius: 8, background: answer === 'no' ? '#f4f2ef' : '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', font: "400 12px/1 'Inter',sans-serif", color: '#40454a', cursor: 'pointer' }}>Not really</button>
    </div>
  );
}

export function PrintButton() {
  return <button type="button" onClick={() => window.print()} style={{ padding: '7px 10px', border: 0, borderRadius: 8, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "500 11.5px/1 'Inter',sans-serif", cursor: 'pointer' }}>Print</button>;
}
