import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleFeedback } from '@/components/help/HelpCentre';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import { getHelpArticle, HELP_ARTICLES } from '@/lib/help/registry';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';
import { ExactHelpArticle } from '@/components/help/ExactHelpArticle';

export function generateStaticParams() {
  return HELP_ARTICLES.map((article) => ({ articleSlug: article.slug }));
}

const CATEGORY_LABELS = {
  Activate: 'GETTING THE EVIDENCE RIGHT',
  Operate: 'DECIDING A CASE',
  Recover: 'GETTING THE MONEY BACK',
  Administer: 'RUNNING THE DESK',
} as const;

const CREDIT_LINK_NOTES = [
  'stage counts use these four words exactly',
  'where matching happens',
  'reports approved and received separately',
  'will not close over an unmatched receipt',
] as const;

export default async function HelpArticlePage({ params }: { params: Promise<{ articleSlug: string }> }) {
  await throwForAcceptanceScenario('help-article-error');
  const { articleSlug } = await params;
  const article = getHelpArticle(articleSlug);
  if (!article) notFound();

  const exactMoneyArticle = article.slug === 'credit-reconciliation';

  if (exactMoneyArticle) return <ExactHelpArticle />;

  return (
    <div
      data-surface-id="help-article"
      role="region"
      aria-label="Help content"
      tabIndex={0}
      data-operations-surface="help-article"
      data-help-article={article.slug}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', justifyContent: 'center', padding: '34px 22px 20px', gap: 34 }}
    >
      <SetBreadcrumbLabel label={article.title} />
      <div style={{ width: '100%', maxWidth: 620, flex: 'none' }}>
        <div style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.07em', color: '#64686d', marginBottom: 11 }}>{CATEGORY_LABELS[article.category]}</div>
        <div style={{ font: "500 26px/1.25 'Inter',sans-serif", letterSpacing: '-.018em', color: '#1c1f23', marginBottom: 16 }}>{article.title}</div>
        <p style={{ font: "400 14px/1.7 'Inter',sans-serif", color: '#3d3a36', margin: '0 0 16px' }}>{article.lead}</p>
        {article.sections.map((section) => (
          <section id={section.id} key={section.id}>
            <h2 style={{ font: "500 16px/1.35 'Inter',sans-serif", color: '#1c1f23', margin: '26px 0 11px', letterSpacing: '-.008em' }}>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph} style={{ font: "400 14px/1.7 'Inter',sans-serif", color: '#3d3a36', margin: '0 0 16px' }}>{paragraph}</p>)}
            {section.steps ? <ol style={{ margin: '0 0 16px', paddingLeft: 22, color: '#3d3a36', font: "400 14px/1.7 'Inter',sans-serif" }}>{section.steps.map((step) => <li key={step}>{step}</li>)}</ol> : null}
          </section>
        ))}
      </div>
      <aside style={{ width: 250, flex: 'none', display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 38 }}>
        <div style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>WHERE THIS APPLIES</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {article.related.map((related, index) => (
            <div key={`${related.href}-${related.label}`} style={{ paddingBottom: 9, borderBottom: '1px solid #ece9e4' }}>
              <Link href={related.href} style={{ font: "500 12.5px/1.4 'Inter',sans-serif", color: '#9b470d', textDecoration: 'none' }}>{related.label}</Link>
              <div style={{ font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d', marginTop: 3 }}>{exactMoneyArticle ? CREDIT_LINK_NOTES[index] : article.appliesTo.toLocaleLowerCase()}</div>
            </div>
          ))}
        </div>
        <div style={{ font: "400 11.5px/1.6 'Inter',sans-serif", color: '#64686d' }}>Was this useful?</div>
        <ArticleFeedback articleSlug={article.slug} />
      </aside>
    </div>
  );
}
