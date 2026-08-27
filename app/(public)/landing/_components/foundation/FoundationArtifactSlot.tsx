import type { ReactNode } from 'react';
import styles from './foundation.module.css';

type FoundationArtifactSlotProps = {
  slot: string;
  label: string;
  children: ReactNode;
  className?: string;
};

export function ArtifactHeader({ label, meta }: { label: string; meta: string }) {
  return (
    <div className={styles.artifactHeader}>
      <span>{label}</span>
      <span>{meta}</span>
    </div>
  );
}

export default function FoundationArtifactSlot({
  slot,
  label,
  children,
  className = '',
}: FoundationArtifactSlotProps) {
  return (
    <figure
      data-artifact-slot={slot}
      aria-label={label}
      className={`${styles.artifactSlot} ${className}`}
    >
      {children}
    </figure>
  );
}
