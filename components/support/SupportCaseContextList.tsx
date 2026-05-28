'use client';

import type { PublicSupportCaseContext } from '@/lib/support/intake/supportCaseReadModel';

const PROVIDER_LABELS: Record<string, string> = {
  gorgias: 'Gorgias',
  zendesk: 'Zendesk',
  intercom: 'Intercom',
  freshdesk: 'Freshdesk',
};

function formatTags(tags: unknown[]): string {
  const values = tags
    .map((tag) => {
      if (typeof tag === 'string') return tag;
      if (tag && typeof tag === 'object' && 'name' in tag) {
        return String((tag as { name: unknown }).name);
      }
      return null;
    })
    .filter((value): value is string => !!value);
  return values.length > 0 ? values.join(', ') : '—';
}

function SupportCaseCards({ cases }: { cases: PublicSupportCaseContext[] }) {
  return (
    <div className="space-y-3">
      {cases.map((supportCase) => (
          <div
            key={supportCase.id}
            className="rounded-md border p-3 text-sm"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="font-semibold" style={{ color: 'var(--text)' }}>
                {PROVIDER_LABELS[supportCase.provider] ?? supportCase.provider} ·{' '}
                {supportCase.external_case_id}
              </p>
              {supportCase.external_url ? (
                <a
                  href={supportCase.external_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline"
                  style={{ color: 'var(--accent)' }}
                >
                  Open in helpdesk
                </a>
              ) : null}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Status: </span>
                <span style={{ color: 'var(--text)' }}>{supportCase.case_status ?? '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Link: </span>
                <span style={{ color: 'var(--text)' }}>{supportCase.link_status}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Claim reason: </span>
                <span style={{ color: 'var(--text)' }}>{supportCase.claim_reason ?? '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Order ref: </span>
                <span style={{ color: 'var(--text)' }}>{supportCase.order_ref ?? supportCase.shopify_order_id ?? '—'}</span>
              </div>
            </div>
            {supportCase.customer_message_summary ? (
              <p className="mt-2 text-xs" style={{ color: 'var(--text)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Customer: </span>
                {supportCase.customer_message_summary}
              </p>
            ) : null}
            {supportCase.agent_notes_summary ? (
              <p className="mt-1 text-xs" style={{ color: 'var(--text)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Agent notes: </span>
                {supportCase.agent_notes_summary}
              </p>
            ) : null}
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Tags: {formatTags(supportCase.tags)}
              {supportCase.claim_candidate ? ' · Claim candidate (review only)' : ''}
            </p>
          </div>
        ))}
    </div>
  );
}

export default function SupportCaseContextList({
  cases,
  title = 'Support ticket context',
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
      return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{emptyMessage}</p>;
    }
    return null;
  }

  if (bare) {
    return <SupportCaseCards cases={cases} />;
  }

  return (
    <section
      className="rounded-xl p-4 border"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
    >
      {title ? (
        <p className="text-caption font-semibold mb-3" style={{ color: 'var(--ink-secondary)' }}>
          {title}
        </p>
      ) : null}
      <SupportCaseCards cases={cases} />
    </section>
  );
}
