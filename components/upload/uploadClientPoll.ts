import type { AuditProgressJob } from '@/components/upload/uploadClientTypes';

const DEFAULT_INTERVAL_MS = 5000;

export function startAuditProgressPolling(
  runId: string,
  onJob: (job: AuditProgressJob) => 'continue' | 'complete' | 'failed',
  intervalMs = DEFAULT_INTERVAL_MS,
): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = async () => {
    if (cancelled) return;
    try {
      const res = await fetch(`/api/audit/${runId}/progress`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const job = (await res.json()) as AuditProgressJob;
      const outcome = onJob(job);
      if (outcome !== 'continue' || cancelled) return;
    } catch {
      /* swallow poll errors */
    }
    if (!cancelled) timer = setTimeout(tick, intervalMs);
  };

  void tick();

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}
