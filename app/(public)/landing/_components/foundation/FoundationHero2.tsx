import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Check, Database, GitBranch, ShieldCheck } from 'lucide-react';
import { FL_PRODUCT_PROOF, FL_ROUTES } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

const proofIcons = [Database, GitBranch, ShieldCheck] as const;

export default function FoundationHero2() {
  return (
    <section
      id="what-you-recover"
      className={`${styles.hero2Field} scroll-mt-20`}
      data-nav-theme="light"
      aria-labelledby="product-proof-heading"
    >
      <div className={styles.productProofLayout}>
        <div className={styles.productProofCopy}>
          <h2 id="product-proof-heading" className={styles.hero2Headline}>
            {FL_PRODUCT_PROOF.headline}
          </h2>
          <p className={`${styles.heroSubtitle} ${styles.hero2Subtitle}`}>
            {FL_PRODUCT_PROOF.lead}
          </p>
          <Link href={FL_ROUTES.demo} prefetch={false} className={styles.productProofLink}>
            Open the interactive case
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <figure className={styles.productProofFigure}>
          <div className={styles.productProofTopline}>
            <span>Case recommendation</span>
            <span>Captured from /demo?step=recommendation</span>
          </div>
          <Image
            src="/product-proof/case-recommendation.webp"
            width={1240}
            height={776}
            sizes="(min-width: 1024px) 58vw, 94vw"
            className={styles.productProofImage}
            alt="Unauth case recommendation showing the matched merchant rule, evidence gap, confidence, and a hold-for-evidence recommendation"
          />
          <figcaption className={styles.productProofCaption}>
            The recommendation explains the rule and missing evidence. It does not
            execute a refund, denial, or recovery action.
          </figcaption>
        </figure>
      </div>

      <div id="how-it-works" className={`${styles.productProofBand} scroll-mt-20`}>
        <div className={styles.productProofBandInner}>
          <div>
            <h2 className={styles.productProofBandTitle}>
              One evidence spine from source fact to merchant outcome.
            </h2>
          </div>
          <ol className={styles.productProofSteps}>
            {FL_PRODUCT_PROOF.steps.map((step, index) => {
              const Icon = proofIcons[index];
              return (
                <li key={step.title}>
                  <Icon size={18} aria-hidden="true" />
                  <p>{step.title}</p>
                  <span>{step.body}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div id="integrations" className={`${styles.integrationProof} scroll-mt-20`}>
        <div>
          <h2 className={styles.integrationProofTitle}>
            Provider records feed one case model.
          </h2>
          <p className={styles.integrationProofBody}>
            Commerce, support, fulfilment, payment, and imported records retain
            their provenance. No provider creates a separate case lifecycle.
          </p>
        </div>
        <ul className={styles.integrationProofList} aria-label="Supported integration examples">
          {FL_PRODUCT_PROOF.integrations.map((integration) => (
            <li key={integration}>
              <Check size={15} aria-hidden="true" />
              {integration}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
