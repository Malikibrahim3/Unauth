'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { RelatedRecordsPanel } from '@/components/relationships/RelatedRecordsPanel';
import type { TimelineItem } from '@/lib/cases/timeline';
import type { RelatedRecord } from '@/lib/relationships/relatedRecords';

type CaseContext = {
  case: { id: string; status: string; amount_at_risk: number | null; currency: string | null; next_action: string | null; next_action_reason: string | null };
  relatedRecords: RelatedRecord[];
  timeline: TimelineItem[];
  financialSummaries: Array<Record<string, unknown>>;
};

function title(value: string | null | undefined) {
  return value ? value.replaceAll('_', ' ') : 'Not set';
}

export function CaseContextDrawer({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const [data, setData] = useState<CaseContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/cases/${caseId}/context`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? 'Unable to load case context');
        setData(body as CaseContext);
      })
      .catch((reason: unknown) => {
        if ((reason as { name?: string }).name !== 'AbortError') setError(reason instanceof Error ? reason.message : 'Unable to load case context');
      });
    return () => controller.abort();
  }, [caseId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" role="dialog" aria-modal="true" aria-label="Case context" onMouseDown={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Case context</p>
            <h2 className="mt-1 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Payout case {caseId.slice(0, 8)}</h2>
          </div>
          <button type="button" aria-label="Close case context" onClick={onClose} className="rounded p-1" style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
        </div>
        {error ? <p role="alert" className="mt-6 text-sm" style={{ color: 'var(--danger)' }}>{error}</p> : null}
        {!data && !error ? <p className="mt-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading case context…</p> : null}
        {data ? <div className="mt-6 space-y-6">
          <section className="grid grid-cols-2 gap-4 rounded-lg p-4" style={{ background: 'var(--surface-muted, #f7f7f6)' }}>
            <div><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Status</p><p className="text-sm font-medium">{title(data.case.status)}</p></div>
            <div><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Exposure</p><p className="text-sm font-medium">{data.case.amount_at_risk == null ? 'Not available' : `${data.case.amount_at_risk.toFixed(2)} ${data.case.currency ?? ''}`}</p></div>
            <div className="col-span-2"><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Next action</p><p className="text-sm">{title(data.case.next_action)}{data.case.next_action_reason ? ` · ${data.case.next_action_reason}` : ''}</p></div>
          </section>
          <section><h3 className="mb-2 text-sm font-semibold">Related records</h3><RelatedRecordsPanel records={data.relatedRecords} /></section>
          <section><h3 className="mb-2 text-sm font-semibold">Activity</h3>{data.timeline.length ? <ul className="space-y-2">{data.timeline.slice(-12).reverse().map((item) => <li key={item.id} className="rounded border p-3 text-sm"><p className="font-medium">{item.title}</p><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.occurredAt.slice(0, 10)} · {item.sourceSystem}</p>{item.summary ? <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{item.summary}</p> : null}</li>)}</ul> : <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No activity yet.</p>}</section>
          <a href={`/claims/${caseId}`} className="inline-block rounded-md px-3 py-2 text-sm font-medium no-underline" style={{ background: 'var(--accent)', color: 'white' }}>Open full case</a>
        </div> : null}
      </aside>
    </div>
  );
}
