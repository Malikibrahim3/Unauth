import Link from 'next/link';
import { NeutralArtifact } from './NeutralArtifact';
import { NeutralChapter } from './NeutralChapter';
import { NeutralLandingFooter } from './NeutralLandingFooter';
import { NeutralLandingNav } from './NeutralLandingNav';
import { neutralLandingViewModel } from './neutralLandingViewModel';
import styles from './neutralLanding.module.css';

export function NeutralLanding() {
  const { artifacts, hero, routes, story } = neutralLandingViewModel;

  return (
    <div className={styles.page} data-surface-id="marketing-landing" data-landing-page="true" data-landing-visual-system="neutral">
      <NeutralLandingNav />
      <main>
        <section id="gate" className={styles.hero} data-landing-section="gate">
          <div className={styles.shell}>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <h1>
                  {hero.headlineLines.map((line, index) => (
                    <span key={line} className={styles.heroHeadlineLine}>
                      {line}{index < hero.headlineLines.length - 1 ? ' ' : ''}
                    </span>
                  ))}
                </h1>
                <p>{hero.subtitle}</p>
                <div className={styles.heroActions}>
                  <Link href={routes.gateInAction} className={styles.inverseButton} prefetch={false}>{hero.primaryCta}</Link>
                  <Link href={routes.demo} className={styles.secondaryButton} prefetch={false}>View the demo</Link>
                </div>
              </div>
              <div className={styles.heroProvenance} aria-label="Demonstration provenance">
                <span>Fictional case</span>
                <strong>{story.caseId}</strong>
                <p>One request followed from source evidence to financial outcome.</p>
              </div>
            </div>
            <NeutralArtifact spec={artifacts['hero-gate-overview']} dominant />
          </div>
        </section>

        <NeutralChapter id="evidence" title="Inside the gate" statement={story.gate.headline} body={story.gate.body}>
          <div className={styles.evidenceGrid}>
            <div className={styles.evidenceList} aria-label="Case evidence sources">
              {story.evidence.rows.map((row) => (
                <div key={row.title} className={styles.evidenceRow}>
                  <div><strong>{row.title}</strong><span>{row.detail}</span></div>
                  <div><span>{row.source}</span><time>{row.timestamp}</time></div>
                </div>
              ))}
            </div>

            <div id="decision" className={styles.decisionBlock}>
              <h3>{story.decision.headline}</h3>
              <p>{story.decision.body}</p>
              <div className={styles.decisionStates}>
                {[story.decision.ready, story.decision.review].map((state) => (
                  <div key={state.label} className={styles.decisionState}>
                    <div><strong>{state.label}</strong><span>{state.detail}</span></div>
                    <p>{state.rule}</p>
                    <span>{state.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <NeutralArtifact spec={artifacts['gate-evidence-to-decision']} />
        </NeutralChapter>

        <NeutralChapter id="features" title="Workspace around the gate" statement={story.features.headline} body={story.features.body}>
          <div className={styles.capabilityRows}>
            {story.features.cards.map((card, index) => (
              <article key={card.id} className={styles.capabilityRow} data-capability={card.id}>
                <span className={styles.capabilityIndex}>{String(index + 1).padStart(2, '0')}</span>
                <div><h3>{card.title}</h3><p>{card.body}</p></div>
                <p className={styles.capabilitySurfaces}>{card.surfaces.join(' · ')}</p>
              </article>
            ))}
          </div>
          <NeutralArtifact spec={artifacts['workspace-around-the-gate']} />
          <Link href={routes.demo} className={styles.textLink} prefetch={false}>{story.features.cta}<span aria-hidden="true"> →</span></Link>
        </NeutralChapter>

        <NeutralChapter id="recovery" title="The decision is not the end" statement={story.recovery.headline} body={story.recovery.body}>
          <div className={styles.detailRail}>
            <div><span>Responsibility</span><strong>{story.recovery.responsibility}</strong></div>
            <div><span>Recovery</span><strong>{story.recovery.amount}</strong></div>
            <div><span>Deadline</span><strong>{story.recovery.deadline}</strong></div>
          </div>
          <NeutralArtifact spec={artifacts['recovery-follow-through']} />
        </NeutralChapter>

        <NeutralChapter id="outcome" title="From decision to financial outcome" statement={story.outcome.headline} body={story.outcome.body}>
          <div className={styles.metrics} aria-label="Fictional financial outcome summary">
            {story.outcome.metrics.map((metric) => (
              <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>
            ))}
          </div>
          <NeutralArtifact spec={artifacts['financial-case-to-ledger']} />
        </NeutralChapter>

        <section id="integrations" className={styles.integrations} data-landing-section="integrations">
          <div className={styles.shell}>
            <div className={styles.integrationsCopy}>
              <h2>{story.integrations.headline}</h2>
              <p>{story.integrations.body}</p>
            </div>
            <ul aria-label="Source categories">
              {story.integrations.sources.map((source) => <li key={source}>{source}</li>)}
            </ul>
          </div>
        </section>

        <section id="close-loop" className={styles.closeLoop} data-landing-section="close-loop">
          <div className={styles.shell}>
            <div className={styles.closeLoopInner}>
              <h2>{story.closing.headline}</h2>
              <p>{story.closing.body}</p>
              <div className={styles.heroActions}>
                <Link href={routes.gateInAction} className={styles.inverseButton} prefetch={false}>{hero.primaryCta}</Link>
                <Link href={routes.signup} className={styles.secondaryButton} prefetch={false}>Create workspace</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <NeutralLandingFooter />
    </div>
  );
}
