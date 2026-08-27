"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, Input, Modal } from "@/components/ui";
import styles from '@/components/settings/OperationsSettings.module.css';

export default function SubjectErasureClient() {
  const [subjectId, setSubjectId] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function eraseSubject() {
    setResult(null);
    if (confirmation !== "ERASE") return;
    setLoading(true);
    try {
      const response = await fetch("/api/settings/data-subject-erasure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: subjectId.trim(), idempotencyKey: `privacy-ui:${crypto.randomUUID()}`, confirm: "ERASE" }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; receiptId?: string; storageCleanupError?: string | null };
      if (!response.ok) throw new Error(body.error ?? "Customer erasure could not be completed.");
      setResult({ type: "success", message: body.storageCleanupError ? `Database erasure recorded under receipt ${body.receiptId}. Storage cleanup is queued for retry.` : `Customer erasure completed and recorded under receipt ${body.receiptId}.` });
      setConfirmation("");
      setReviewOpen(false);
    } catch (error) {
      setResult({ type: "error", message: error instanceof Error ? error.message : "Customer erasure could not be completed." });
    } finally {
      setLoading(false);
    }
  }

  async function downloadSubjectAccess() {
    if (!subjectId.trim()) return;
    setResult(null);
    setAccessLoading(true);
    try {
      const response = await fetch(`/api/settings/data-subject-access?subjectId=${encodeURIComponent(subjectId.trim())}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'Subject access export could not be created.');
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `subject-access-${subjectId.trim()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
      setResult({ type: 'success', message: 'Subject access JSON downloaded. The file is not retained by Unauth after this response.' });
    } catch (error) {
      setResult({ type: 'error', message: error instanceof Error ? error.message : 'Subject access export could not be created.' });
    } finally {
      setAccessLoading(false);
    }
  }

  return (
    <div className={styles.erasureBody}>
      <label><span>Canonical customer ID</span><Input value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setResult(null); }} placeholder="Customer record UUID" autoComplete="off" /></label>
      <div className={styles.erasureScope}><strong>Scope of this erasure</strong><p><b>Removed:</b> name, email, phone, addresses and retained ticket message bodies</p><p><b>Kept:</b> orders, cases, ledger entries and every audit event, with the customer shown as erased</p><p><b>Not possible:</b> removing a ledger entry — the financial event happened and reconciliation depends on it</p></div>
      <p className={styles.erasureFootnote}>Erasure is irreversible and is itself an audit event. Reconnecting a source will not re-import the erased fields.</p>
      <label><span>Type ERASE to confirm</span><Input value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setResult(null); }} placeholder="ERASE" autoComplete="off" /></label>
      <div className={styles.erasureActions}><Button variant="danger" disabled={!subjectId.trim() || confirmation !== "ERASE"} onClick={() => { setResult(null); setReviewOpen(true); }}>Erase this customer</Button><Button variant="secondary" loading={accessLoading} disabled={!subjectId.trim() || loading} onClick={() => void downloadSubjectAccess()}>Download subject JSON</Button><Button variant="secondary" disabled={!subjectId.trim()} onClick={() => { setResult(null); setReviewOpen(true); }}>Preview erasure</Button></div>
      {result?.type === "success" ? <p role="status" className={styles.message} data-tone="success">{result.message}</p> : null}
      {result?.type === "error" && !reviewOpen ? <p role="alert" className={styles.message} data-tone="error">{result.message}</p> : null}
      <Modal open={reviewOpen} onClose={() => { if (loading) return; setReviewOpen(false); setResult(null); }} title="Erase this customer’s data?" description="This is an irreversible, merchant-scoped privacy action." size="sm" overlayId="customer-erasure-confirmation" closeOnBackdrop={!loading} closeOnEscape={!loading} showCloseButton={!loading}>
        <div className="grid gap-5"><div className="flex items-start gap-3 rounded-[var(--uo-route-radius-surface)] bg-[var(--uo-route-critical-bg)] p-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--uo-route-critical)]" aria-hidden="true" /><p className="ua-text-body">Identifiers and linked evidence for <strong className="break-all">{subjectId.trim()}</strong> will be redacted. This cannot be undone.</p></div><dl className="grid gap-3"><div><dt className="ua-text-metadata">Retained</dt><dd className="ua-text-body mt-1">Non-PII receipt, financial entries, and audit history</dd></div><div><dt className="ua-text-metadata">Recovery path</dt><dd className="ua-text-body mt-1">None for erased identifiers; failed storage cleanup remains queued and observable</dd></div></dl>{confirmation !== "ERASE" ? <p className="ua-text-caption-role text-[var(--uo-route-text-secondary)]">Type ERASE on the page before confirming this destructive action.</p> : null}{result?.type === "error" ? <p role="alert" className="rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-critical-border)] bg-[var(--uo-route-critical-bg)] px-3 py-2 text-[length:var(--uo-route-text-caption-size)] text-[var(--uo-route-critical)]">{result.message}</p> : null}<div className="flex justify-end gap-2"><Button variant="secondary" disabled={loading} onClick={() => { setReviewOpen(false); setResult(null); }}>Go back</Button><Button variant="danger" disabled={confirmation !== "ERASE"} loading={loading} onClick={() => void eraseSubject()}>Erase customer data</Button></div></div>
      </Modal>
    </div>
  );
}
