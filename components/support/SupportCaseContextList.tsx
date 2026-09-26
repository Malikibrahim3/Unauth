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
            className="text-[12px] leading-[1.45] text-[#40454a] rounded-md border p-3"
            style={{ borderColor: '#eae8e5', background: '#f4f3f1' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="font-medium text-[13px] leading-5 text-[#1c1f23]" style={{ color: '#1c1f23' }}>
                {providerLabel(supportCase.provider)} ·{' '}
                {supportCase.external_case_id}
              </p>
              {helpdeskUrl ? (
                <a
                  href={helpdeskUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-medium leading-4 text-[#64686d] underline"
                  style={{ color: '#9f4f08' }}
                >
                  Open in {providerLabel(supportCase.provider)}
                </a>
              ) : null}
            </div>
            <div className="text-[10.5px] leading-4 text-[#6f6a63] grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <span style={{ color: '#64686d' }}>Status: </span>
                <span style={{ color: '#1c1f23' }}>{supportCase.case_status ?? '—'}</span>
              </div>
              <div>
                <span style={{ color: '#64686d' }}>Link: </span>
                <span style={{ color: '#1c1f23' }}>{supportCase.link_status}</span>
              </div>
              <div>
                <span style={{ color: '#64686d' }}>Case reason: </span>
                <span style={{ color: '#1c1f23' }}>{supportCase.claim_reason ?? '—'}</span>
              </div>
              <div>
                <span style={{ color: '#64686d' }}>Order ref: </span>
                <span style={{ color: '#1c1f23' }}>{shortRef(supportCase.order_ref ?? supportCase.shopify_order_id, supportCase.id)}</span>
              </div>
            </div>
            {supportCase.customer_message_summary ? (
              <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-2" style={{ color: '#1c1f23' }}>
                <span style={{ color: '#64686d' }}>Customer message: </span>
                {supportCase.customer_message_summary}
              </p>
            ) : null}
            {supportCase.agent_notes_summary ? (
              <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-1" style={{ color: '#1c1f23' }}>
                <span style={{ color: '#64686d' }}>Outcome notes: </span>
                {supportCase.agent_notes_summary}
              </p>
            ) : null}
            <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-1">
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
      return <p className="text-[13px] leading-5 text-[#40454a]" style={{ color: '#64686d' }}>{emptyMessage}</p>;
    }
    return null;
  }

  if (bare) {
    return <SupportCaseCards cases={cases} />;
  }

  return (
    <section
      className="rounded-md p-4 border"
      style={{ borderColor: '#eae8e5', background: '#fff' }}
    >
      {title ? (
        <p className="text-[11px] font-medium leading-4 text-[#64686d] mb-3" style={{ color: '#64686d' }}>
          {title}
        </p>
      ) : null}
      <SupportCaseCards cases={cases} />
    </section>
  );
}
