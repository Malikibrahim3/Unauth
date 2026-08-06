'use client';

import Link from 'next/link';
import { CheckCircle2, CircleAlert, Clock3, Database, GitCompareArrows, ShieldCheck } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import { cn } from '@/lib/utils';

interface DataHealthDrawerProps {
  open: boolean;
  onClose: () => void;
  connectionState?: ConnectionState | null;
}

type HealthTone = 'neutral' | 'info' | 'attention' | 'confirmed';

const toneClass: Record<HealthTone, string> = {
  neutral: 'bg-[var(--ua-surface-muted)] text-[var(--ua-text-secondary)]',
  info: 'bg-[var(--ua-info-bg)] text-[var(--ua-info)]',
  attention: 'bg-[var(--ua-warning-bg)] text-[var(--ua-warning)]',
  confirmed: 'bg-[var(--ua-ledger-confirmed-bg)] text-[var(--ua-ledger-confirmed)]',
};

function HealthRow({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  detail: string;
  tone: HealthTone;
}) {
  return (
    <div className="flex gap-3 border-b border-[var(--ua-border-hairline)] py-4 last:border-b-0">
      <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', toneClass[tone])}>
        <Icon size={15} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-label text-[var(--ua-text-tertiary)]">{label}</p>
        <p className="mt-0.5 text-body font-medium text-[var(--ua-text-primary)]">{value}</p>
        <p className="mt-1 text-caption text-[var(--ua-text-secondary)]">{detail}</p>
      </div>
    </div>
  );
}

export default function DataHealthDrawer({ open, onClose, connectionState }: DataHealthDrawerProps) {
  const hasOrderSource = connectionState?.orderSourceConnected === true;
  const hasHelpdesk = connectionState?.helpdesk === true;
  const sourceCount = Number(hasOrderSource) + Number(hasHelpdesk);

  return (
    <Drawer open={open} onClose={onClose} width={420} title="Data health" aria-label="Data health">
      <div className="px-5 py-5">
        <div className="border-b border-[var(--ua-border-subtle)] pb-5">
          <p className="text-body text-[var(--ua-text-secondary)]">
            A compact view of coverage, freshness, reconciliation, and the scope that is safe to use for decisions.
          </p>
          <div className="mt-4 flex items-center gap-2 text-caption text-[var(--ua-text-tertiary)]">
            <span className="inline-flex h-2 w-2 rounded-full bg-[var(--ua-action-700)]" aria-hidden="true" />
            <span>{sourceCount} of 2 operating sources connected</span>
          </div>
        </div>

        <div>
          <HealthRow
            icon={Database}
            label="Source coverage"
            value={hasOrderSource ? 'Order source connected' : 'Order source needs attention'}
            detail={hasHelpdesk ? 'Helpdesk evidence is also available.' : 'Connect a source before treating the ledger as complete.'}
            tone={hasOrderSource ? 'info' : 'attention'}
          />
          <HealthRow
            icon={Clock3}
            label="Freshness"
            value="Freshness is source-scoped"
            detail="Open Sources to inspect the last successful sync and any stale records."
            tone="neutral"
          />
          <HealthRow
            icon={GitCompareArrows}
            label="Reconciliation"
            value="Exceptions remain visible"
            detail="Confirmed ledger outcomes are kept separate from estimated or modelled values."
            tone="neutral"
          />
          <HealthRow
            icon={hasOrderSource ? CheckCircle2 : CircleAlert}
            label="Decision-safe scope"
            value={hasOrderSource ? 'Safe to review connected evidence' : 'Repair source coverage first'}
            detail={hasOrderSource ? 'Recommendations remain advisory and auditable.' : 'Do not interpret missing source coverage as zero exposure.'}
            tone={hasOrderSource ? 'confirmed' : 'attention'}
          />
        </div>

        <div className="mt-5 border-t border-[var(--ua-border-subtle)] pt-5">
          <Link
            href="/sources/connected"
            onClick={onClose}
            className="inline-flex h-10 items-center gap-2 rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface)] px-3 text-body font-medium text-[var(--ua-text-primary)] transition-colors hover:bg-[var(--ua-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2"
          >
            <ShieldCheck size={15} aria-hidden="true" />
            Open source health
          </Link>
        </div>
      </div>
    </Drawer>
  );
}
