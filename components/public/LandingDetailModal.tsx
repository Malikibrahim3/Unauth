'use client';

import type { ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import styles from './public.module.css';

/** One quiet, focused reading surface for the landing's case and artefact arrows. */
export function LandingDetailModal({ open, onClose, title, subtitle, eyebrow, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Legacy sample-case label; the landing's corner arrows let the title speak alone. */
  eyebrow?: string;
  children: ReactNode;
}) {
  return <Modal
    open={open}
    onClose={onClose}
    aria-label={`${title.replace(/[.?!]$/, '')} details`}
    showCloseButton={false}
    size="lg"
    panelClassName={styles.landingDialogPanel}
    overlayClassName={styles.landingDialogOverlay}
    style={{ maxWidth: 976, borderRadius: 14, borderColor: '#e4e3e0', boxShadow: '0 1px 3px rgb(28 31 35 / 6%), 0 32px 80px -12px rgb(28 31 35 / 24%)' }}
    overlayStyle={{ background: 'rgb(244 243 241 / 84%)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
  >
    <div className={`${styles.landing} ${styles.landingDialog}`}>
      <div className={styles.landingDialogHeader}>
        <div>
          {eyebrow && <p className={styles.landingDialogEyebrow}>{eyebrow}</p>}
          <h2>{title}{subtitle && <span> {subtitle}</span>}</h2>
        </div>
        <button type="button" className={styles.landingDialogClose} onClick={onClose}>
          <span>Close</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div className={styles.landingDialogBody}>{children}</div>
    </div>
  </Modal>;
}
