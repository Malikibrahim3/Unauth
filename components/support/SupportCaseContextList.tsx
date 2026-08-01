'use client';

import type { PublicSupportCaseContext } from '@/lib/support/intake/supportCaseReadModel';
import { shortRef } from '@/lib/ui/displayRef';
import { providerLabel } from '@/lib/ui/merchantCopy';

function formatTags(tags: unknown[]): string {
  const values = tags
    .map((tag) => {
      if (typeof tag === 'string') return tag;
      if (tag && typeof tag === 'object' && 'name' in tag) {
        return String((tag as { name: unknown }).name);
      }
      return null;
    })
    .filter((value): value is string => !!value)
    .map((value) => value.replace(/_/g, ' '));
  return values.length > 0 ? values.join(', ') : '—';
}

function safeHelpdeskUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function SupportCaseCards({ cases }: { cases: PublicSupportCaseContext[] }) {
  return (
    <div className="space-y-3">
      {cases.map((supportCase) => {
        const helpdeskUrl = safeHelpdeskUrl(supportCase.external_url);
        return (
          <div
            key={supportCase.id}
            className="rounded-md border p-3 text-sm"
            style={{ borderColor: 'var(--ua-border-subtle)', background: 'var(--ua-surface-secondary)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="font-semibold" style={{ color: 'var(--ua-text-primary)' }}>
                {providerLabel(supportCase.provider)} ·{' '}
                {supportCase.external_case_id}
              </p>
              {helpdeskUrl ? (
                <a
                  href={helpdeskUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline"
                  style={{ color: 'var(--ua-action-primary)' }}
                >
                  Open in {providerLabel(supportCase.provider)}
                </a>
              ) : null}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div>
                <span style={{ color: 'var(--ua-text-secondary)' }}>Status: </span>
                <span style={{ color: 'var(--ua-text-primary)' }}>{supportCase.case_status ?? '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--ua-text-secondary)' }}>Link: </span>
                <span style={{ color: 'var(--ua-text-primary)' }}>{supportCase.link_status}</span>
              </div>
              <div>
                <span style={{ color: 'var(--ua-text-secondary)' }}>Case reason: </span>
                <span style={{ color: 'var(--ua-text-primary)' }}>{supportCase.claim_reason ?? '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--ua-text-secondary)' }}>Order ref: </span>
                <span style={{ color: 'var(--ua-text-primary)' }}>{shortRef(supportCase.order_ref ?? supportCase.shopify_order_id, supportCase.id)}</span>
              </div>
            </div>
            {supportCase.customer_message_summary ? (
              <p className="mt-2 text-xs" style={{ color: 'var(--ua-text-primary)' }}>
                <span style={{ color: 'var(--ua-text-secondary)' }}>Customer message: </span>
                {supportCase.customer_message_summary}
              </p>
            ) : null}
            {supportCase.agent_notes_summary ? (
              <p className="mt-1 text-xs" style={{ color: 'var(--ua-text-primary)' }}>
                <span style={{ color: 'var(--ua-text-secondary)' }}>Outcome notes: </span>
                {supportCase.agent_notes_summary}
              </p>
            ) : null}
            <p className="mt-1 text-xs" style={{ color: 'var(--ua-text-secondary)' }}>
              Tags: {formatTags(supportCase.tags)}
              {supportCase.claim_candidate ? ' · Case candidate (review only)' : ''}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function SupportCaseContextList({
  cases,
  title = 'Helpdesk source record',
  bare = false,
  emptyMessage,
}: {
  cases: PublicSupportCaseContext[];
  title?: string;
  bare?: boolean;
  emptyMessage?: string;
}) {
  if (cases.length === 0) {
    if (bare && emptyMessage) {
      return <p className="text-sm" style={{ color: 'var(--ua-text-secondary)' }}>{emptyMessage}</p>;
    }
    return null;
  }

  if (bare) {
    return <SupportCaseCards cases={cases} />;
  }

  return (
    <section
      className="rounded-md p-4 border"
      style={{ borderColor: 'var(--ua-border-subtle)', background: 'var(--ua-surface-primary)' }}
    >
      {title ? (
        <p className="text-caption font-semibold mb-3" style={{ color: 'var(--ua-text-secondary)' }}>
          {title}
        </p>
      ) : null}
      <SupportCaseCards cases={cases} />
    </section>
  );
}
