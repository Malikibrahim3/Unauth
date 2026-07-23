'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';

interface ExportMenuProps {
  range: string;
  timezone?: string;
  currency?: string | null;
}

export default function ExportMenu({ range, timezone = 'UTC', currency = null }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const exportParams = new URLSearchParams({ range, timezone });
  if (currency) exportParams.set('currency', currency);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-[var(--accent)]"
      >
        Export
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[220px] rounded-md border py-1 shadow-lg"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <p
            className="px-3 pb-1 pt-1.5 text-xs font-bold uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Payout reports
          </p>
          <a
            role="menuitem"
            href={`/api/reports/claims?${exportParams.toString()}`}
            className="block px-3 py-2 text-xs hover:bg-[var(--surface)]"
            style={{ color: 'var(--text)' }}
            onClick={() => setOpen(false)}
          >
            Financial bridge CSV
            <span className="ml-1 opacity-60">- canonical metric, currency, value, case count</span>
          </a>
          <a
            role="menuitem"
            href={`/api/reports/claims?${exportParams.toString()}&view=outcomes`}
            className="block px-3 py-2 text-xs hover:bg-[var(--surface)]"
            style={{ color: 'var(--text)' }}
            onClick={() => setOpen(false)}
          >
            Loss causes CSV
            <span className="ml-1 opacity-60">- category, currency, records, realised loss</span>
          </a>

          <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />
          <p
            className="px-3 pb-1 pt-0.5 text-xs font-bold uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Activity log
          </p>
          <Link
            role="menuitem"
            href="/api/audit-trail?format=csv&limit=200"
            prefetch={false}
            className="block px-3 py-2 text-xs hover:bg-[var(--surface)]"
            style={{ color: 'var(--text)' }}
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
