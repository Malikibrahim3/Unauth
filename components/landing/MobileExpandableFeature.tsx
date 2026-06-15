'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2, X } from 'lucide-react';
import styles from './MobileExpandableFeature.module.css';

type MobileExpandableFeatureProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  summary?: ReactNode;
  preview: ReactNode;
  children: ReactNode;
  expandLabel?: string;
  sheetTitle?: ReactNode;
  className?: string;
  previewClassName?: string;
  actions?: ReactNode;
};

export function MobileExpandableFeature({
  eyebrow,
  title,
  summary,
  preview,
  children,
  expandLabel = 'Expand details',
  sheetTitle,
  className = '',
  previewClassName = '',
  actions,
}: MobileExpandableFeatureProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = open;
  }, [open]);

  return (
    <div className={`${styles.root} ${className}`}>
      <article className={`${styles.previewCard} ${previewClassName}`}>
        <button
          ref={triggerRef}
          type="button"
          aria-label={expandLabel}
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className={styles.expandButton}
        >
          <Maximize2 size={18} />
        </button>

        <div className="px-5 pb-5 pt-6">
          {eyebrow ? (
            <p className="font-mono text-[14px] tracking-[0.12em] text-black/42">{eyebrow}</p>
          ) : null}
          <h2 className="mt-4 max-w-[280px] text-[24px] font-semibold leading-[1.04] tracking-[-0.04em] text-[#111111]">
            {title}
          </h2>
          {summary ? (
            <p className="mt-4 max-w-[310px] text-[14px] leading-[1.5] text-black/58">{summary}</p>
          ) : null}
          {actions ? <div className="mt-5">{actions}</div> : null}
        </div>

        <div className="px-5 pb-5">{preview}</div>
      </article>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <>
                  <motion.button
                    key="overlay"
                    type="button"
                    aria-label="Close details"
                    className={styles.overlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    onClick={() => setOpen(false)}
                  />
                  <div className={styles.sheetWrap}>
                    <motion.section
                      key="sheet"
                      role="dialog"
                      aria-modal="true"
                      aria-label={typeof sheetTitle === 'string' ? sheetTitle : expandLabel}
                      className={styles.sheet}
                      initial={{ y: 36, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 36, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className={styles.handle} />
                      <div className={styles.sheetScroller}>
                        <div className="mb-6 flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            {eyebrow ? (
                              <p className="font-mono text-[14px] tracking-[0.12em] text-black/42">{eyebrow}</p>
                            ) : null}
                            <h3 className="mt-4 max-w-[310px] text-[24px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#111111]">
                              {sheetTitle ?? title}
                            </h3>
                          </div>
                          <button
                            type="button"
                            aria-label="Close details"
                            onClick={() => setOpen(false)}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-[#f8f7f4] text-[#111111] shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                          >
                            <X size={18} />
                          </button>
                        </div>
                        {children}
                      </div>
                    </motion.section>
                  </div>
                </>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}
