import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicNav, PublicFooter, PublicLink } from '@/components/public/PublicUI';
import styles from '@/components/public/public.module.css';

export const metadata: Metadata = {
  title: 'Claims, costs and customer friction | Unauth',
  description: 'Published industry statistics on US claims abuse, the wider cost of retail fraud and the customer impact of anti-fraud measures.',
};

const appriss = 'https://apprissretail.com/news/appriss-retail-research-35b-lost-in-online-sales-due-to-claims-and-appeasements-fraud/';
const lexis = 'https://risk.lexisnexis.com/insights-resources/research/US-CA-true-cost-of-fraud-study';

export default function MerchantDataPage() {
  return <div data-surface-id="merchant-financial-data" data-screen-label="Merchant financial data">
    <PublicNav />
    <main id="public-content" className={styles.container + ' ' + styles.dataPage}>
      <Link href="/landing" className={styles.dataLink}>← Back to Unauth</Link>
      <header className={styles.dataIntro}>
        <h1 className={styles.display}>Claims. Costs.<br />Customer friction.</h1>
        <p className={styles.lead}>Claims abuse costs billions. The impact extends beyond direct losses—and anti-fraud measures can cost retailers customers, too.</p>
      </header>

      <section aria-label="Published industry statistics" className={styles.dataExamples}>
        <p className={styles.fine}>US-focused retail research · Published 2024–2026</p>
        <div className={styles.dataHighlights}>
          <article><p className={styles.dataAmount}>$21–35B</p><h2>Lost to claims abuse.</h2><p>Estimated US online retail losses from fraudulent claims and appeasements.</p><a href={appriss} className={styles.dataSource}>Appriss · 2023 data, published 2024 ↗</a></article>
          <article><p className={styles.dataAmount}>$5+</p><h2>Total cost per $1 lost to fraud.</h2><p>Retail and ecommerce in the US and Canada. Covers fraud broadly.</p><a href={lexis} className={styles.dataSource}>LexisNexis · 2026 ↗</a></article>
          <article><p className={styles.dataAmount}>50%+</p><h2>Saw customer churn increase.</h2><p>Of US retailers and ecommerce firms, due to anti-fraud measures.</p><a href={lexis} className={styles.dataSource}>LexisNexis · 2026 ↗</a></article>
        </div>
      </section>

      <div className={styles.actions}><PublicLink href="/demo?case=legitimate&step=inspect">See Unauth in action <span aria-hidden="true">→</span></PublicLink><span className={styles.fine}>Interactive sample · Desktop required</span></div>

      <section aria-label="Research methodology" className={styles.dataSources}>
        <details><summary>Sources & methodology</summary><div>
          <p><a href={appriss}>Appriss Retail, 2024 Claims and Appeasements research</a> — published May 30, 2024; analysis of leading US retailers’ 2023 activity. The $21–35 billion range is the publisher’s estimate. Its public release does not disclose the sample size.</p>
          <p><a href={lexis}>LexisNexis, 2026 True Cost of Fraud: Retail and Ecommerce</a> — survey of 513 fraud and risk executives across the US and Canada. Total fraud costs exceed $5 per $1 of direct fraud loss in both countries. This is not a claims-only multiplier. The publisher also reports that more than half of US retailers and ecommerce companies experienced increased customer churn due to anti-fraud measures; that is a share of businesses, not the percentage of customers lost.</p>
          <p>Vendor-published research, reviewed September 2026. The populations and years differ; do not combine the figures or treat them as Unauth performance.</p>

          <p>A customer claim alone is not evidence of fraud. These studies do not establish any individual merchant’s losses, recoverability or potential savings.</p>
        </div></details>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
