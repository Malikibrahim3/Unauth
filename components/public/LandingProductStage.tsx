import Image from 'next/image';
import styles from './public.module.css';

const capture = '/landing/asterlane-overview-live-2026-09-23.jpg';

/** Fresh live UI capture from the authorised fictional Asterlane workspace. */
export function LandingProductStage() {
  return <figure className={styles.productStage} data-story-artifact="hero-live-capture">
    <div className={styles.liveCaptureFrame}>
      <Image
        src={capture}
        alt="Asterlane Unauth Overview showing its financial position, recovery stages, work needing attention and evidence coverage."
        width={1920}
        height={1080}
        unoptimized
        loading="eager"
      />
    </div>
    <figcaption className={styles.stageCaption}>
      <a href={capture} target="_blank" rel="noreferrer">View full-size image <span aria-hidden="true">↗</span></a>
    </figcaption>
  </figure>;
}
