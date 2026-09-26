'use client';

import Link from 'next/link';
import { HELP_ARTICLES } from '@/lib/help/registry';

export type HelpIndexGroup = {
  label: string;
  articles: Array<{ title: string; note: string; slug: string; keywords: string }>;
};
const categories = [
  ['Activate', 'GETTING THE EVIDENCE RIGHT'],
  ['Operate', 'DECIDING AND OPERATING'],
  ['Recover', 'GETTING THE MONEY BACK'],
  ['Administer', 'RUNNING THE DESK'],
] as const;
export const HELP_INDEX_GROUPS: HelpIndexGroup[] = categories.map(([category, label]) => ({
  label,
  articles: HELP_ARTICLES.filter(article => article.category === category).map(article => ({ title: article.title, note: article.summary, slug: article.slug, keywords: article.keywords.join(' ') })),
})).filter(group => group.articles.length > 0);
export const HELP_INDEX_INTRO = `${HELP_ARTICLES.length} guides to the decisions and tasks in Unauth. Search by task or topic, or choose a guide below.`;

/** Shared authored guide index inside the supplied two-column group frame. */
export function HelpArticleGroups({ groups }: { groups: readonly HelpIndexGroup[] }) {
  return <>{groups.map(group => <div key={group.label}>
    <div style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d', paddingBottom: 4 }}>{group.label}</div>
    {group.articles.map(article => <div key={article.slug} style={{ padding: '11px 0', borderTop: '1px solid #ece9e4' }}>
      <Link href={`/help/${article.slug}`} style={{ font: "400 13.5px/1.4 'Inter',sans-serif", color: '#1c1f23', textDecoration: 'none' }}>{article.title}</Link>
      <div style={{ font: "400 11px/1.5 'IBM Plex Mono',monospace", color: '#64686d', marginTop: 4 }}>{article.note}</div>
    </div>)}
  </div>)}</>;
}
