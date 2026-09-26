'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReportRunScope } from '@/lib/reporting/reportRuns';
import type { NamedReportId } from '@/lib/reporting/namedReportContracts';

export function ReportRunRecorder({ reportId, scope, compact = false }: { reportId: NamedReportId; scope: ReportRunScope; compact?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function save() {
    setState('saving');
    setMessage('');
    try {
      const response = await fetch('/api/reports/runs', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
        body: JSON.stringify({ reportId, ...scope }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'The run was not recorded.');
      setState('saved');
      setMessage('Immutable run recorded. No report was scheduled or sent.');
      router.refresh();
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'The run was not recorded.');
    }
  }

  return (
    <div style={{ position: compact ? 'relative' : undefined }}>
      <button type="button" onClick={save} disabled={state === 'saving'} style={{ padding: '6px 10px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', cursor: state === 'saving' ? 'wait' : 'pointer', font: "400 12.5px/1 'Inter',sans-serif" }}>
        {state === 'saving' ? 'Re-running…' : compact ? 'Re-run' : 'Record immutable run'}
      </button>
      {message ? <p style={{ position: compact ? 'absolute' : undefined, right: compact ? 0 : undefined, top: compact ? 30 : undefined, zIndex: 5, width: compact ? 260 : undefined, margin: compact ? 0 : '8px 0 0', padding: compact ? '8px 10px' : 0, borderRadius: compact ? 8 : undefined, background: compact ? '#fff' : undefined, boxShadow: compact ? '0 4px 18px rgba(28,27,25,.16)' : undefined, color: state === 'error' ? '#b0431a' : '#64686d', font: "400 11px/1.45 'Inter',sans-serif" }} role={state === 'error' ? 'alert' : 'status'}>{message}</p> : null}
    </div>
  );
}
