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
            className="ua-text-dense rounded-md border p-3"
            style={{ borderColor: 'var(--uo-route-border-subtle)', background: 'var(--uo-route-surface-secondary)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="ua-text-working-title" style={{ color: 'var(--uo-route-text-primary)' }}>
                {providerLabel(supportCase.provider)} ·{' '}
                {supportCase.external_case_id}
              </p>
              {helpdeskUrl ? (
                <a
                  href={helpdeskUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ua-text-label underline"
                  style={{ color: 'var(--uo-route-action-primary)' }}
                >
                  Open in {providerLabel(supportCase.provider)}
                </a>
              ) : null}
            </div>
            <div className="ua-text-metadata grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <span style={{ color: 'var(--uo-route-text-secondary)' }}>Status: </span>
                <span style={{ color: 'var(--uo-route-text-primary)' }}>{supportCase.case_status ?? '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--uo-route-text-secondary)' }}>Link: </span>
                <span style={{ color: 'var(--uo-route-text-primary)' }}>{supportCase.link_status}</span>
              </div>
              <div>
                <span style={{ color: 'var(--uo-route-text-secondary)' }}>Case reason: </span>
                <span style={{ color: 'var(--uo-route-text-primary)' }}>{supportCase.claim_reason ?? '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--uo-route-text-secondary)' }}>Order ref: </span>
                <span style={{ color: 'var(--uo-route-text-primary)' }}>{shortRef(supportCase.order_ref ?? supportCase.shopify_order_id, supportCase.id)}</span>
              </div>
            </div>
            {supportCase.customer_message_summary ? (
              <p className="ua-text-caption-role mt-2" style={{ color: 'var(--uo-route-text-primary)' }}>
                <span style={{ color: 'var(--uo-route-text-secondary)' }}>Customer message: </span>
                {supportCase.customer_message_summary}
              </p>
            ) : null}
            {supportCase.agent_notes_summary ? (
              <p className="ua-text-caption-role mt-1" style={{ color: 'var(--uo-route-text-primary)' }}>
                <span style={{ color: 'var(--uo-route-text-secondary)' }}>Outcome notes: </span>
                {supportCase.agent_notes_summary}
              </p>
            ) : null}
            <p className="ua-text-caption-role mt-1">
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
      return <p className="ua-text-body" style={{ color: 'var(--uo-route-text-secondary)' }}>{emptyMessage}</p>;
    }
    return null;
  }

  if (bare) {
    return <SupportCaseCards cases={cases} />;
  }

  return (
    <section
      className="rounded-md p-4 border"
      style={{ borderColor: 'var(--uo-route-border-subtle)', background: 'var(--uo-route-surface-primary)' }}
    >
      {title ? (
        <p className="ua-text-label mb-3" style={{ color: 'var(--uo-route-text-secondary)' }}>
          {title}
        </p>
      ) : null}
      <SupportCaseCards cases={cases} />
    </section>
  );
}
