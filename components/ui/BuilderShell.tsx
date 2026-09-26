import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Surface } from '@/components/ui/Surface';

/**
 * Canonical Evidence Operations builder / configuration shell.
 *
 * Rules and Flows both grew the same layout by copy-paste: a header card
 * (status badge + version + readable summary + simulate/edit/publish actions)
 * above a `minmax(0, 1fr) 340px` grid whose main column is the readable
 * configuration and whose side column is a draft-impact/preview panel. This
 * shell is that shared structure, so a configuration route keeps its domain
 * behaviour while its anatomy stops diverging.
 *
 * §8.5 rules the shell encodes:
 *  - one persistent validation summary (`BuilderValidationSummary`), not
 *    scattered inline errors as the only signal;
 *  - a live preview aside that never competes with the dominant work surface
 *    (Phase 05 gate: action rails never out-weigh the primary surface);
 *  - causal sequences expressed as numbered steps (`BuilderSequence` /
 *    `BuilderStep`) with a quiet connecting rule, not decorative flowchart
 *    nodes and arrows.
 */
export interface BuilderShellProps {
  /** Status pill for the draft/published state. */
  statusBadge?: ReactNode;
  /** Human-readable identity — never a raw rule/flow ID. */
  title: ReactNode;
  /** Version and one-line readable summary under the title. */
  meta?: ReactNode;
  /** Primary actions: simulate/test, edit draft, review publish. */
  actions?: ReactNode;
  /** Persistent validation summary (§8.5) — usually a `BuilderValidationSummary`. */
  validation?: ReactNode;
  /** The readable configuration — the dominant column. */
  children: ReactNode;
  /** Live preview / draft-impact aside (§8.5). Rendered at 340px; never dominant. */
  preview?: ReactNode;
  className?: string;
}

export function BuilderShell({
  statusBadge,
  title,
  meta,
  actions,
  validation,
  children,
  preview,
  className,
}: BuilderShellProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <Surface structure="working" pad="dense" as="header" className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          {statusBadge}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">{title}</div>
            {meta ? <div className="flex items-center gap-3">{meta}</div> : null}
          </div>
        </div>
        {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
      </Surface>
      {validation}
      <div className={cn('grid gap-4', preview && 'lg:grid-cols-[minmax(0,1fr)_340px]')}>
        <div className="min-w-0">{children}</div>
        {preview ? (
          <aside className="min-w-0 rounded-xl border border-[#e4e3e0] bg-[#ffffff] p-4" aria-label="Live preview">
            {preview}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export type BuilderValidationTone = 'neutral' | 'blocking' | 'ready';

export interface BuilderValidationSummaryProps {
  /** `blocking` announces as an alert; `ready`/`neutral` announce politely. */
  tone?: BuilderValidationTone;
  title: ReactNode;
  /** The outstanding requirements/conflicts, or the ready confirmation. */
  items?: ReactNode[];
  className?: string;
}

/**
 * The one persistent validation summary (§8.5). Tone carries state — a blocking
 * summary is a semantic-critical `role="alert"`; a ready summary is a polite
 * success `role="status"`. Selection/accent never stands in for these.
 */
export function BuilderValidationSummary({
  tone = 'neutral',
  title,
  items,
  className,
}: BuilderValidationSummaryProps) {
  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3 text-[11px]',
        tone === 'neutral' && 'border-[#e4e3e0] bg-[#f4f3f1] text-[#64686d]',
        tone === 'blocking' && 'border-[#efc8b6] bg-[#fdf0e6] text-[#b0431a]',
        tone === 'ready' && 'border-[#bedac9] bg-[#eaf5ef] text-[#1a6b43]',
        className,
      )}
      role={tone === 'blocking' ? 'alert' : 'status'}
    >
      <p className="font-semibold text-[#1c1f23]">{title}</p>
      {items && items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export interface BuilderSequenceProps {
  children: ReactNode;
  'aria-label'?: string;
  className?: string;
}

/** An ordered causal sequence (§8.5). Numbering is presentational; the step
 * labels carry the meaning, and the list order carries the sequence. */
export function BuilderSequence({ children, 'aria-label': ariaLabel, className }: BuilderSequenceProps) {
  return (
    <ol className={cn('m-0 flex list-none flex-col gap-3', className)} aria-label={ariaLabel}>
      {children}
    </ol>
  );
}

export interface BuilderStepProps {
  label: ReactNode;
  detail?: ReactNode;
  /** Optional inline controls/config for this step. */
  children?: ReactNode;
}

export function BuilderStep({ label, detail, children }: BuilderStepProps) {
  return (
    <li className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-3 before:absolute before:bottom-full before:left-3 before:h-3 before:w-px before:bg-[#d8d4cf] first:before:hidden">
      <span className="relative grid h-6 w-6 place-items-center rounded-full bg-[#1c1f23] text-[10px] text-white" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-[#e4e3e0] bg-white p-3">
        <p className="text-[11px] leading-[1.45] text-[#64686d]">{label}</p>
        {detail ? <p className="text-[11px] leading-[1.45] text-[#64686d]">{detail}</p> : null}
        {children}
      </div>
    </li>
  );
}
