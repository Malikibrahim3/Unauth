import type { CSSProperties } from 'react';
import type { LandingArtifactSpec } from './neutralLandingViewModel';
import styles from './neutralLanding.module.css';

type NeutralArtifactProps = {
  spec: LandingArtifactSpec;
  dominant?: boolean;
};

export function NeutralArtifact({ spec, dominant = false }: NeutralArtifactProps) {
  const style = {
    '--artifact-ratio': `${spec.width} / ${spec.height}`,
    '--artifact-mobile-ratio': `${spec.mobileWidth ?? spec.width} / ${spec.mobileHeight ?? spec.height}`,
  } as CSSProperties;

  return (
    <figure
      className={`${styles.artifactFrame} ${dominant ? styles.artifactDominant : ''}`}
      data-artifact-slot={spec.id}
      data-artifact-state={spec.src ? 'ready' : 'truthful-fallback'}
      data-desktop-width={spec.width}
      data-desktop-height={spec.height}
      data-mobile-width={spec.mobileWidth ?? ''}
      data-mobile-height={spec.mobileHeight ?? ''}
      style={style}
    >
      <div className={styles.artifactCanvas}>
        {spec.src ? (
          <picture>
            {spec.mobileSrc ? <source media="(max-width: 639px)" srcSet={spec.mobileSrc} /> : null}
            <img
              className={styles.artifactImage}
              src={spec.src}
              alt={spec.alt}
              width={spec.width}
              height={spec.height}
              loading={spec.priority ? 'eager' : 'lazy'}
              fetchPriority={spec.priority ? 'high' : 'auto'}
              decoding="async"
            />
          </picture>
        ) : (
          <div
            className={styles.artifactPlaceholder}
            role="img"
            aria-label={`${spec.alt} Product explanation: ${spec.requiredContent.join('; ')}`}
            data-artifact-visual-type={spec.visualType}
          >
            <div className={styles.placeholderHeader}>
              <strong>Product boundary</strong>
              <span>Fictional case · explanatory view</span>
            </div>
            <div className={styles.placeholderBrief}>
              <div className={styles.placeholderSummary}>
                <strong className={styles.fallbackTitle}>{spec.caption ?? 'How the product keeps this boundary explicit'}</strong>
                <p className={styles.placeholderObjective}>{spec.objective}</p>
              </div>
              <div className={styles.placeholderRequirements}>
                <strong>What remains distinct</strong>
                <ul>
                  {spec.requiredContent.map((requirement) => <li key={requirement}>{requirement}</li>)}
                </ul>
              </div>
            </div>
            <p className={styles.placeholderAvoid}>
              <strong>Truth guardrail</strong>
              <span>{spec.prohibitedTreatments.join(' ')}</span>
            </p>
          </div>
        )}
      </div>
      {spec.caption ? <figcaption className={styles.artifactCaption}>{spec.caption}</figcaption> : null}
    </figure>
  );
}
