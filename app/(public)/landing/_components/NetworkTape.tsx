import styles from './landing.module.css';
import { TAPE_ITEMS } from '../_lib/content';

/**
 * Live-network tape: a slow mono marquee of (representative) graph events.
 * Duplicated list + CSS keyframes — pauses on hover, becomes a static
 * wrapped list under prefers-reduced-motion.
 */

function TapeRun({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center motion-reduce:flex-wrap motion-reduce:gap-y-2"
    >
      {TAPE_ITEMS.map((item, i) => (
        <li
          key={`${item.k}-${i}`}
          className="flex shrink-0 items-center gap-2 whitespace-nowrap px-5 font-mono text-xs"
        >
          <span className="h-1 w-1 rounded-full bg-[var(--lime)]" aria-hidden />
          <span className="text-[var(--ink-tertiary)]">{item.k}</span>
          <span className="text-[var(--ink-secondary)]">{item.v}</span>
        </li>
      ))}
    </ul>
  );
}

export default function NetworkTape() {
  return (
    <div className="border-y border-[var(--border-subtle)] bg-[var(--surface-overlay)] py-3">
      <div className={styles.tape}>
        <div className={styles.tapeTrack}>
          <TapeRun />
          <div className="flex shrink-0 motion-reduce:hidden">
            <TapeRun hidden />
          </div>
        </div>
      </div>
    </div>
  );
}
