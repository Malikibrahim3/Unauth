import { ClipboardList, Clock, CreditCard, Globe2 } from 'lucide-react';
import { FL_HERO } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

function IconCircle({ children }: { children: React.ReactNode }) {
  return <span className={styles.evidenceIcon}>{children}</span>;
}

export default function FoundationEvidenceCards() {
  return (
    <div className={styles.evidenceCardsLayer} aria-label="Suspicious claimant evidence trail">
      <article className={`${styles.evidenceCard} ${styles.evidenceOrderHistoryCard}`}>
        <IconCircle>
          <ClipboardList size={18} aria-hidden />
        </IconCircle>
        <div className="min-w-0">
          <h2 className={styles.evidenceCardTitle}>{FL_HERO.orderHistoryCard.title}</h2>
          <p className={styles.evidenceCardBody}>{FL_HERO.orderHistoryCard.status}</p>
          <p className={styles.evidenceCardMuted}>{FL_HERO.orderHistoryCard.meta}</p>
          <p className={styles.evidenceCardMuted}>{FL_HERO.orderHistoryCard.pattern}</p>
        </div>
      </article>

      <article className={`${styles.evidenceCard} ${styles.evidenceClaimCard}`}>
        <div className={styles.evidenceTitleRow}>
          <IconCircle>
            <Clock size={18} aria-hidden />
          </IconCircle>
          <h2 className={styles.evidenceCardTitle}>{FL_HERO.claimTimingCard.title}</h2>
        </div>
        <p className={styles.evidenceCardBody}>{FL_HERO.claimTimingCard.status}</p>
        <p className={styles.evidenceCardMuted}>{FL_HERO.claimTimingCard.meta}</p>
      </article>

      <article className={`${styles.evidenceCard} ${styles.evidenceCrossMerchantCard}`}>
        <IconCircle>
          <Globe2 size={18} aria-hidden />
        </IconCircle>
        <div>
          <h2 className={styles.evidenceCardTitle}>{FL_HERO.crossMerchantCard.title}</h2>
          <p className={styles.evidenceCardBody}>{FL_HERO.crossMerchantCard.status}</p>
          <p className={styles.evidenceCardMuted}>{FL_HERO.crossMerchantCard.meta}</p>
        </div>
        <svg className={styles.evidenceSparkline} viewBox="0 0 72 28" aria-hidden>
          <path d="M2 22 L18 14 L34 18 L52 8 L70 12" />
        </svg>
      </article>

      <article className={`${styles.evidenceCard} ${styles.evidenceChargebackCard}`}>
        <span className={styles.evidenceExternalDot} aria-hidden />
        <IconCircle>
          <CreditCard size={18} aria-hidden />
        </IconCircle>
        <div>
          <h2 className={styles.evidenceCardTitle}>{FL_HERO.chargebackCard.title}</h2>
          <p className={styles.evidenceCardBody}>{FL_HERO.chargebackCard.status}</p>
          <p className={styles.evidenceCardMuted}>{FL_HERO.chargebackCard.meta}</p>
        </div>
      </article>

      <span className={styles.evidenceConnector} aria-hidden />
    </div>
  );
}
