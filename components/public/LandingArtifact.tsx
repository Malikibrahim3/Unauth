'use client';

import { useRef, useState, type ReactNode } from 'react';
import styles from './public.module.css';
import { LandingDetailModal } from './LandingDetailModal';

/** Scripted interaction opens a modal; native disclosure remains the no-JS fallback. */
export function LandingArtifact({
  id, title, subtitle, children, details, caption, className = '',
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  details: ReactNode;
  caption?: ReactNode;
  className?: string;
}) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  return <div className={`${styles.artifactCard} ${className}`} data-landing-artifact={id}>
    <details ref={disclosure} className={styles.artifactDisclosure} onKeyDown={event => {
      if (event.key === 'Escape' && disclosure.current?.open) {
        event.preventDefault();
        disclosure.current.open = false;
        disclosure.current.querySelector('summary')?.focus();
      }
    }}>
      <summary aria-label={`Details: ${title}`} aria-haspopup="dialog" onClick={event => {
        event.preventDefault();
        event.currentTarget.focus();
        setDialogOpen(true);
      }}>
        <h3 className={styles.artifactTitle}>{title}{subtitle && <span> {subtitle}</span>}</h3>
        <span className={styles.artifactArrow} aria-hidden="true">
          <svg className={styles.artifactOpenIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18 18 6M6 6h12v12"/></svg>
          <svg className={styles.artifactCloseIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </span>
      </summary>
      <div className={styles.artifactDetails}>{details}</div>
    </details>
    <div className={styles.artifactCanvas}>{children}</div>
    {caption && <p className={styles.artifactCaption}>{caption}</p>}
    <LandingDetailModal open={dialogOpen} onClose={() => setDialogOpen(false)} title={title} subtitle={subtitle}>
      <div className={styles.artifactDetails}>{details}</div>
    </LandingDetailModal>
  </div>;
}
