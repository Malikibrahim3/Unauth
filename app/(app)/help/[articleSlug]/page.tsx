import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageFrame } from '@/components/ui';
import { ArticleFeedback, PrintButton } from '@/components/help/HelpCentre';
import { getHelpArticle, HELP_ARTICLES } from '@/lib/help/registry';
import styles from '@/components/help/HelpOperations.module.css';

export function generateStaticParams() {
  return HELP_ARTICLES.map((article) => ({ articleSlug: article.slug }));
}

export default async function HelpArticlePage({ params }: { params: Promise<{ articleSlug: string }> }) {
  const { articleSlug } = await params;
  const article = getHelpArticle(articleSlug);
  if (!article) notFound();

  return (
    <PageFrame
      title={article.title}
      subtitle={article.summary}
      breadcrumbs={[{ label: 'Help', href: '/help' }, { label: article.category, href: `/help?q=${encodeURIComponent(article.category)}` }, { label: article.title }]}
      showCurrentBreadcrumb
      actions={<><PrintButton /><Link href="mailto:support@unauth.app" className="ua-button ua-button--secondary ua-button--sm">Contact support</Link></>}
      surfaceId="help-article"
    >
      <div className={styles.articleLayout} data-operations-surface="help-article" data-help-article={article.slug}>
        <article className={styles.article}>
          <div className={styles.articleEyebrow}>{article.category}</div>
          <h1>{article.title}</h1>
          <p className={styles.articleLead}>{article.lead}</p>
          <div className={styles.articleMeta}><span>Current MR5 product contract</span><span>·</span><span>Updated 23 Aug 2026</span><span>·</span><span>{article.appliesTo}</span></div>
          {article.sections.map((section) => (
            <section id={section.id} key={section.id}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.steps ? <ol className={styles.articleSteps}>{section.steps.map((step) => <li key={step}>{step}</li>)}</ol> : null}
            </section>
          ))}
          <section id="related"><h2>Open the related product surface</h2><div className={styles.relatedLinks}>{article.related.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}</div></section>
        </article>
        <aside className={styles.articleRail}>
          <section><h2>On this page</h2><nav>{article.sections.map((section) => <a href={`#${section.id}`} key={section.id}>{section.title}</a>)}<a href="#related">Related surfaces</a></nav></section>
          <section><strong>Was this useful?</strong><ArticleFeedback articleSlug={article.slug} /></section>
          <section><strong>Related guides</strong><nav>{HELP_ARTICLES.filter((candidate) => candidate.category === article.category && candidate.slug !== article.slug).slice(0, 3).map((candidate) => <Link href={`/help/${candidate.slug}`} key={candidate.slug}>{candidate.title}</Link>)}</nav></section>
        </aside>
      </div>
    </PageFrame>
  );
}
