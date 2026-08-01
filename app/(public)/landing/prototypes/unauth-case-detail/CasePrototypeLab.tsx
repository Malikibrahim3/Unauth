'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { IncidentDesk } from './IncidentDesk';
import { Safelight } from './Safelight';
import { SignalTrace } from './SignalTrace';
import styles from './casePrototypeLab.module.css';

const VARIANTS = [
  { name: 'Incident Desk', render: IncidentDesk },
  { name: 'Signal Trace', render: SignalTrace },
  { name: 'Safelight', render: Safelight },
] as const;

function indexFromLocation() {
  if (typeof window === 'undefined') return 0;
  const requested = Number.parseInt(new URLSearchParams(window.location.search).get('v') ?? '1', 10);
  return Number.isInteger(requested) && requested >= 1 && requested <= VARIANTS.length
    ? requested - 1
    : 0;
}

export function CasePrototypeLab() {
  const [current, setCurrent] = useState(0);
  const [renderKey, setRenderKey] = useState(0);
  const pickerRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const moveHighlight = useCallback(() => {
    const highlight = highlightRef.current;
    const item = itemRefs.current[current];
    if (!highlight || !item) return;
    highlight.style.width = `${item.offsetWidth}px`;
    highlight.style.transform = `translateX(${item.offsetLeft}px)`;
  }, [current]);

  const setActive = useCallback((index: number) => {
    if (index < 0 || index >= VARIANTS.length) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setCurrent(index);
    setRenderKey((value) => value + 1);
    const url = new URL(window.location.href);
    url.searchParams.set('v', String(index + 1));
    window.history.replaceState(null, '', url);
  }, []);

  const replay = useCallback(() => {
    setRenderKey((value) => value + 1);
  }, []);

  useEffect(() => {
    const initial = indexFromLocation();
    setCurrent(initial);
    setRenderKey((value) => value + 1);
  }, []);

  useLayoutEffect(() => {
    moveHighlight();
  }, [current, moveHighlight]);

  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        pickerRef.current?.setAttribute('data-ready', '');
        moveHighlight();
      });
    });
    const handleResize = () => moveHighlight();
    window.addEventListener('resize', handleResize);
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.removeEventListener('resize', handleResize);
    };
  }, [moveHighlight]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const numeric = Number.parseInt(event.key, 10);
      if (numeric >= 1 && numeric <= VARIANTS.length) {
        setActive(numeric - 1);
      } else if (event.key === 'ArrowRight') {
        setActive((current + 1) % VARIANTS.length);
      } else if (event.key === 'ArrowLeft') {
        setActive((current - 1 + VARIANTS.length) % VARIANTS.length);
      } else if (event.key === 'r' || event.key === 'R') {
        replay();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [current, replay, setActive]);

  const ActiveVariant = VARIANTS[current].render;

  return (
    <main className={styles.lab}>
      <section
        id="stage"
        className={styles.stage}
        aria-label={`${VARIANTS[current].name} prototype`}
      >
        <ActiveVariant key={`${current}-${renderKey}`} />
      </section>

      <nav ref={pickerRef} className="proto-picker" aria-label="Prototype variants">
        <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
        {VARIANTS.map((variant, index) => (
          <button
            key={variant.name}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            className="proto-picker-item"
            data-active={current === index ? '' : undefined}
            aria-current={current === index ? 'true' : undefined}
            onClick={() => setActive(index)}
          >
            {variant.name}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        <button
          className="proto-picker-item proto-picker-replay"
          aria-label="Replay animation (R)"
          onClick={replay}
        >
          ↻
        </button>
      </nav>
    </main>
  );
}
