'use client';

import Link from 'next/link';
import { useState, type RefObject } from 'react';
import { Button, type ButtonVariant } from '@/components/ui';
import { DURATION } from '@/lib/design/motion';
import { useOverlayPresence } from '@/lib/design/useOverlayPresence';
import type { FinancialReportMetric } from '@/lib/reporting/intelligence';

interface ExportMenuProps {
  range: string;
  timezone?: string;
  currency?: string | null;
  metric?: FinancialReportMetric | null;
  category?: string | null;
  triggerLabel?: string;
  reportsHref?: string | null;
  triggerVariant?: ButtonVariant;
}

export default function ExportMenu({
  range,
  timezone = 'UTC',
  currency = null,
  metric = null,
  category = null,
  triggerLabel = 'Export',
  reportsHref = null,
  triggerVariant = 'secondary',
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const { mounted, phase, containerRef, motionAllowed } = useOverlayPresence({
    open,
    onClose: () => setOpen(false),
    exitDurationMs: DURATION.fast,
    closeOnOutsideClick: true,
    restoreFocus: true,
    transient: true,
  });

  const exportParams = new URLSearchParams({ range, timezone });
  if (currency) exportParams.set('currency', currency);
  if (metric) exportParams.set('metric', metric);
  if (category) exportParams.set('category', category);
  const hasScopedMetric = Boolean(metric);
  const hasScopedCategory = Boolean(category);
  const outcomesParams = new URLSearchParams(exportParams);
  outcomesParams.set('view', 'outcomes');
  const recordParams = new URLSearchParams(exportParams);
  recordParams.set('view', 'records');

  const isOpen = phase === 'open';

  return (
    <div className="relative" ref={containerRef as RefObject<HTMLDivElement>}>
      <Button
        variant={triggerVariant}
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-[var(--uo-route-action-primary)]"
      >
        {triggerLabel}
      </Button>
      {mounted && (
        <div
          role="menu"
          aria-hidden={phase === 'exiting' ? true : undefined}
          className="absolute right-0 z-20 mt-1 min-w-[220px] rounded-md border py-1 shadow-lg"
          style={{
            borderColor: 'var(--uo-route-border-default)',
            background: 'var(--uo-route-surface-primary)',
            opacity: isOpen ? 1 : 0,
            transform: `translateY(${isOpen ? 0 : 2}px)`,
            transition: motionAllowed ? `opacity ${DURATION.fast}ms var(--uo-route-ease-standard), transform ${DURATION.fast}ms var(--uo-route-ease-standard)` : 'none',
            pointerEvents: phase === 'exiting' ? 'none' : undefined,
          }}
        >
          {reportsHref ? (
            <>
              <Link
                role="menuitem"
                href={reportsHref}
                className="ua-text-dense block px-3 py-2 hover:bg-[var(--uo-route-surface-secondary)]"
                style={{ color: 'var(--uo-route-text-primary)' }}
                onClick={() => setOpen(false)}
              >
                Open full reports
                <span className="ml-1 opacity-60">- complete reporting workspace</span>
              </Link>
              <div className="my-1 border-t" style={{ borderColor: 'var(--uo-route-border-default)' }} />
            </>
          ) : null}
          <p
            className="px-3 pb-1 pt-1.5 text-[length:var(--uo-route-text-metadata-size)] font-bold"
            style={{ color: 'var(--uo-route-text-tertiary)' }}
          >
            Case reports
          </p>
          {!hasScopedCategory ? (
            <a
              role="menuitem"
              href={`/api/reports/claims?${exportParams.toString()}`}
              className="ua-text-dense block px-3 py-2 hover:bg-[var(--uo-route-surface-primary)]"
              style={{ color: 'var(--uo-route-text-primary)' }}
              onClick={() => setOpen(false)}
            >
              {hasScopedMetric ? 'Selected metric CSV' : 'Financial bridge CSV'}
              <span className="ml-1 opacity-60">- canonical metric, currency, value, case count</span>
            </a>
          ) : null}
          {!hasScopedMetric ? (
            <a
              role="menuitem"
              href={`/api/reports/claims?${outcomesParams.toString()}`}
              className="ua-text-dense block px-3 py-2 hover:bg-[var(--uo-route-surface-primary)]"
              style={{ color: 'var(--uo-route-text-primary)' }}
              onClick={() => setOpen(false)}
            >
              {hasScopedCategory ? 'Selected loss cause CSV' : 'Loss causes CSV'}
              <span className="ml-1 opacity-60">- category, currency, records, realised loss</span>
            </a>
          ) : null}
          <a
            role="menuitem"
            href={`/api/reports/claims?${recordParams.toString()}`}
            className="ua-text-dense block px-3 py-2 hover:bg-[var(--uo-route-surface-primary)]"
            style={{ color: 'var(--uo-route-text-primary)' }}
            onClick={() => setOpen(false)}
          >
            Supporting records CSV
            <span className="ml-1 opacity-60">- scoped rows, audited, maximum 10,000</span>
          </a>

          <div className="my-1 border-t" style={{ borderColor: 'var(--uo-route-border-default)' }} />
          <p
            className="px-3 pb-1 pt-0.5 text-[length:var(--uo-route-text-metadata-size)] font-bold"
            style={{ color: 'var(--uo-route-text-tertiary)' }}
          >
            Activity log
          </p>
          <Link
            role="menuitem"
            href="/api/audit-trail?format=csv&limit=200"
            prefetch={false}
            className="ua-text-dense block px-3 py-2 hover:bg-[var(--uo-route-surface-primary)]"
            style={{ color: 'var(--uo-route-text-primary)' }}
            onClick={() => setOpen(false)}
          >
            Audit trail CSV
            <span className="ml-1 opacity-60">- all actions, actors</span>
          </Link>
        </div>
      )}
    </div>
  );
}
