'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Modal } from '@/components/ui';
import styles from '@/components/settings/OperationsSettings.module.css';

export default function BulkDeleteClient({ workspaceName }: { workspaceName: string }) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<{ jobId: string; idempotencyKey: string; stage?: string; status?: string } | null>(null);
  const expected = `DELETE ${workspaceName.toUpperCase()}`;
  const storageKey = 'unauth.workspace-deletion-job.v1';

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { jobId?: string; idempotencyKey?: string; stage?: string; status?: string };
      if (parsed.jobId && parsed.idempotencyKey) setJob({ ...parsed, jobId: parsed.jobId, idempotencyKey: parsed.idempotencyKey });
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  function rememberJob(next: { jobId: string; idempotencyKey: string; stage?: string; status?: string }) {
    setJob(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  async function deleteWorkspace() {
    if (confirmation !== expected) return;
    setLoading(true);
    setError(null);
    try {
      const idempotencyKey = job?.idempotencyKey ?? crypto.randomUUID();
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: 'DELETE',
          idempotencyKey,
          ...(job?.jobId ? { jobId: job.jobId } : {}),
        }),
      });
      const body = await response.json().catch(() => ({})) as {
        error?: string;
        jobId?: string;
        stage?: string;
        status?: string;
        receiptId?: string | null;
      };
      if (body.jobId) rememberJob({ jobId: body.jobId, idempotencyKey, stage: body.stage, status: body.status });
      if (!response.ok) throw new Error(body.error ?? 'Workspace deletion failed.');
      window.localStorage.removeItem(storageKey);
      router.push(`/onboarding?workspaceDeleted=1&receipt=${encodeURIComponent(body.receiptId ?? '')}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Workspace deletion failed.');
      setLoading(false);
    }
  }

  return (
    <div className={styles.workspaceDelete} data-overlay-id="workspace-deletion">
      <div className={styles.workspaceDeleteMain}>
        <h2>Delete this workspace</h2>
        <p>Deletes <strong>{workspaceName}</strong>, its members, cases, ledger entries, source connections and merchant-scoped audit history. A durable job and verification receipt remain outside the workspace so a failed stage can resume safely. Your sign-in identity is retained.</p>
        <strong>There is no restore. Support cannot undo it.</strong>
        <label><span>Type {expected}</span><Input value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError(null); }} placeholder={expected} autoComplete="off" /></label>
        <Button variant="danger" disabled={confirmation !== expected || loading} onClick={() => setReviewOpen(true)}>{job ? 'Resume workspace deletion' : 'Delete workspace'}</Button>
        {job ? <p role="status" className={styles.message}>Deletion job {job.jobId.slice(0, 8)} is {job.status ?? 'paused'} at {job.stage?.replaceAll('_', ' ') ?? 'its last recorded stage'}. Retrying does not repeat completed stages.</p> : null}
        {error ? <p role="alert" className={styles.message} data-tone="error">{error}</p> : null}
      </div>
      <aside className={styles.beforeDelete}>
        <h3>Before you delete, consider</h3>
        <Link href="/financials/reports/records"><strong>Export the ledger</strong><span>Keep the supporting records you need</span></Link>
        <Link href="/settings/governance/audit-trail"><strong>Export the audit trail</strong><span>Keep the actor and object history you need</span></Link>
        <Link href="/settings/workspace/team"><strong>Transfer ownership</strong><span>If you are leaving rather than closing</span></Link>
      </aside>
      <Modal open={reviewOpen} onClose={() => { if (!loading) setReviewOpen(false); }} title="Delete this workspace?" description="This permanently removes the workspace and its merchant-scoped records." size="sm" overlayId="workspace-delete-confirmation" closeOnBackdrop={!loading} closeOnEscape={!loading} showCloseButton={!loading}>
        <div className="grid gap-5"><div className="rounded-[var(--uo-route-radius-surface)] bg-[var(--uo-route-critical-bg)] p-3 text-[var(--uo-route-critical)]"><p className="ua-text-body"><strong>{workspaceName}</strong> cannot be restored after deletion. Manifested workspace storage is verified before the workspace row is removed. Your authentication identity remains available for another workspace.</p></div>{error ? <p role="alert" className="ua-form-message ua-form-message--error">{error}</p> : null}<div className="flex justify-end gap-2"><Button variant="secondary" disabled={loading} onClick={() => setReviewOpen(false)}>Go back</Button><Button variant="danger" loading={loading} onClick={() => void deleteWorkspace()}>{job ? 'Resume deletion job' : 'Delete workspace permanently'}</Button></div></div>
      </Modal>
    </div>
  );
}
