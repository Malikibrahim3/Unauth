import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Surface } from '@/components/ui/Surface';

/**
 * Canonical Instrument Grade builder / configuration shell.
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
    <div className={cn('ua-builder', className)}>
      <Surface structure="working" pad="dense" as="header" className="ua-builder__header">
        <div className="ua-builder__header-lead">
          {statusBadge}
          <div className="ua-builder__header-identity">
            <div className="ua-builder__header-title">{title}</div>
            {meta ? <div className="ua-builder__header-meta">{meta}</div> : null}
          </div>
        </div>
        {actions ? <div className="ua-builder__header-actions">{actions}</div> : null}
      </Surface>
      {validation}
      <div className="ua-builder__grid">
        <div className="ua-builder__main">{children}</div>
        {preview ? (
          <aside className="ua-builder__aside" aria-label="Live preview">
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
        'ua-builder__validation',
        tone === 'blocking' && 'ua-builder__validation--blocking',
        tone === 'ready' && 'ua-builder__validation--ready',
        className,
      )}
      role={tone === 'blocking' ? 'alert' : 'status'}
    >
      <p className="ua-builder__validation-title">{title}</p>
      {items && items.length > 0 ? (
        <ul className="ua-builder__validation-list">
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
    <ol className={cn('ua-builder__sequence', className)} aria-label={ariaLabel}>
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
    <li className="ua-builder__step">
      <span className="ua-builder__step-marker" aria-hidden="true" />
      <div className="ua-builder__step-body">
        <p className="ua-builder__step-label">{label}</p>
        {detail ? <p className="ua-builder__step-detail">{detail}</p> : null}
        {children}
      </div>
    </li>
  );
}
