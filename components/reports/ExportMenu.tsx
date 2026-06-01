'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';

interface ExportMenuProps {
  range: string;
}

export default function ExportMenu({ range }: ExportMenuProps) {
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
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
        >
          <p
            className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--ink-tertiary)' }}
          >
            Live reports — Shopify + helpdesk
          </p>
          <a
            role="menuitem"
            href={`/api/reports/claims?range=${range}`}
            className="block px-3 py-2 text-xs hover:bg-[var(--surface-overlay)]"
            style={{ color: 'var(--text)' }}
            onClick={() => setOpen(false)}
          >
            Claims CSV
            <span className="ml-1 opacity-60">— status, amounts, SLA</span>
          </a>
          <a
            role="menuitem"
            href={`/api/reports/claims?range=${range}&view=outcomes`}
            className="block px-3 py-2 text-xs hover:bg-[var(--surface-overlay)]"
            style={{ color: 'var(--text)' }}
            onClick={() => setOpen(false)}
          >
            Outcomes CSV
            <span className="ml-1 opacity-60">— decisions, refunds</span>
          </a>

          <div className="my-1 border-t" style={{ borderColor: 'var(--surface-border)' }} />
          <p
            className="px-3 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--ink-tertiary)' }}
          >
            Activity log
          </p>
          <a
            role="menuitem"
            href="/api/audit-trail?format=csv&limit=200"
            className="block px-3 py-2 text-xs hover:bg-[var(--surface-overlay)]"
            style={{ color: 'var(--text)' }}
            onClick={() => setOpen(false)}
          >
            Audit trail CSV
            <span className="ml-1 opacity-60">— all actions, actors</span>
          </a>
        </div>
      )}
    </div>
  );
}
