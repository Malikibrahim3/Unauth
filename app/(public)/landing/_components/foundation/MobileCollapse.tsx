'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './foundation.module.css';

/**
 * Stripe-style mobile collapse wrapper.
 *
 * On mobile (≤768px) the section shows only its title + artifact, with a
 * chevron toggle at the bottom of the card. Tapping reveals the body content
 * (placed inside <div className={styles.collapseDetails}> by the caller) with
 * a smooth height transition. On desktop (≥769px) the toggle is hidden via CSS
 * and the details container renders as a normal block — the section keeps its
 * original layout untouched.
 *
 * Each instance owns its own state, so expanding one section never collapses
 * another.
 */
export default function MobileCollapse({
  children,
  className = '',
  collapsedLabel = 'See how it works',
  expandedLabel = 'Show less',
}: {
  children: ReactNode;
  className?: string;
  collapsedLabel?: string;
  expandedLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div data-collapse data-expanded={expanded} className={className}>
      {children}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        data-expand-toggle
        className={styles.collapseToggle}
      >
        <span>{expanded ? expandedLabel : collapsedLabel}</span>
        <ChevronDown size={18} strokeWidth={2} className={styles.collapseChevron} aria-hidden />
      </button>
    </div>
  );
}
