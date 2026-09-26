"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { useOverlayPresence } from "@/lib/design/useOverlayPresence";
import { useRouter } from "next/navigation";

const inputStyle: CSSProperties = { width: "100%", height: 32, border: 0, borderRadius: 8, padding: "0 9px", background: "#fff", boxShadow: "inset 0 0 0 1px rgba(28,27,25,.11)", color: "#1c1f23", outline: "none", font: "400 12px/1.3 'Inter',sans-serif" };
const buttonStyle = (danger = false, disabled = false): CSSProperties => ({ appearance: "none", border: 0, padding: "6px 11px", borderRadius: 9, background: danger ? "#fff" : "#fff", boxShadow: danger ? "inset 0 0 0 1px rgba(176,67,26,.35)" : "inset 0 0 0 1px rgba(28,27,25,.11)", color: danger ? "#b0431a" : "#40454a", opacity: disabled ? .45 : 1, cursor: disabled ? "not-allowed" : "pointer", font: "500 12px/1 'Inter',sans-serif" });

export default function BulkDeleteClient({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<{ jobId: string; idempotencyKey: string; stage?: string; status?: string } | null>(null);
  const expected = `DELETE ${workspaceName.toUpperCase()}`;
  const storageKey = `unauth.workspace-deletion-job.v2:${workspaceId}`;
  const actionKey = useRef<string | null>(null);
  const reviewOpener = useRef<HTMLElement | null>(null);
  const overlay = useOverlayPresence({ open: reviewOpen, onClose: () => { if (!loading) setReviewOpen(false); }, closeOnEscape: !loading, trapFocus: true, lockBodyScroll: true, restoreFocusTarget: reviewOpener });

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { jobId?: string; idempotencyKey?: string; stage?: string; status?: string };
      if (parsed.jobId && parsed.idempotencyKey) setJob({ ...parsed, jobId: parsed.jobId, idempotencyKey: parsed.idempotencyKey });
    } catch {
      try { window.localStorage.removeItem(storageKey); } catch { /* Storage may be unavailable. */ }
    }
  }, [storageKey]);

  function rememberJob(next: { jobId: string; idempotencyKey: string; stage?: string; status?: string }) {
    setJob(next);
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep the same job and key in this mounted review. */ }
  }

  async function deleteWorkspace() {
    if (confirmation !== expected) return;
    setLoading(true);
    setError(null);
    try {
      const idempotencyKey = job?.idempotencyKey ?? actionKey.current ?? crypto.randomUUID();
      actionKey.current = idempotencyKey;
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE", idempotencyKey, ...(job?.jobId ? { jobId: job.jobId } : {}) }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string; jobId?: string; stage?: string; status?: string; receiptId?: string | null };
      if (body.jobId) rememberJob({ jobId: body.jobId, idempotencyKey, stage: body.stage, status: body.status });
      if (!response.ok) throw new Error(body.error ?? "Workspace deletion failed.");
      try { window.localStorage.removeItem(storageKey); } catch { /* Storage may be unavailable. */ }
      router.push(`/onboarding?workspaceDeleted=1&receipt=${encodeURIComponent(body.receiptId ?? "")}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Workspace deletion failed.");
      setLoading(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}><div style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: ".09em", color: "#64686d" }}>DELETE THIS WORKSPACE</div><span style={{ flex: 1 }} /><span style={{ padding: "2px 7px", borderRadius: 5, background: "#fdf0e6", color: "#b0431a", font: "500 10px/1.5 'Inter',sans-serif" }}>OWNER ONLY</span></div>
      <p style={{ margin: 0, color: "#64686d", font: "400 11.5px/1.5 'Inter',sans-serif" }}>Removes <strong>{workspaceName}</strong>, its members, cases, ledger entries, source connections and merchant-scoped audit history. Your sign-in identity is retained. Nothing inside the workspace can be recovered afterwards.</p>
      <label style={{ display: "grid", gap: 6, marginTop: 11, padding: "10px 12px", borderRadius: 9, background: "#f4f3f1", color: "#64686d", font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".05em" }}>TYPE THE WORKSPACE NAME TO CONFIRM<input value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError(null); }} placeholder={expected} autoComplete="off" style={inputStyle} /></label>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 11 }}><button type="button" disabled={confirmation !== expected || loading} onClick={(event) => { reviewOpener.current = event.currentTarget; setReviewOpen(true); }} style={buttonStyle(true, confirmation !== expected || loading)}>{job ? "Resume workspace deletion" : "Delete workspace"}</button><span style={{ flex: 1, color: "#64686d", font: "400 10.5px/1.5 'IBM Plex Mono',monospace" }}>durable, resumable, irreversible</span></div>
      {job ? <p role="status" style={{ margin: "10px 0 0", color: "#7a5310", font: "400 10.5px/1.45 'Inter',sans-serif" }}>Deletion job {job.jobId.slice(0, 8)} is {job.status ?? "paused"} at {job.stage?.replaceAll("_", " ") ?? "its last recorded stage"}. Retrying does not repeat completed stages.</p> : null}
      {error ? <p role="alert" style={{ margin: "10px 0 0", padding: "8px 9px", borderRadius: 8, background: "#fdf0e6", color: "#b0431a", font: "400 11px/1.5 'Inter',sans-serif" }}>{error}</p> : null}

      {overlay.mounted ? <OverlayPortal><div data-overlay-id="data-erasure-and-account-deletion-modals" style={{ position: "fixed", inset: 0, zIndex: 120, pointerEvents: "auto", display: "grid", placeItems: "center", padding: 24, background: "rgba(28,27,25,.32)" }} onMouseDown={(event) => { if (!loading && event.target === event.currentTarget) setReviewOpen(false); }}><section ref={overlay.containerRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Delete this workspace?" style={{ width: "min(560px,100%)", maxHeight: "calc(100vh - 48px)", overflowY: "auto", borderRadius: 14, background: "#fff", boxShadow: "0 24px 70px rgba(28,27,25,.24)" }}><div style={{ padding: "19px 21px 16px", borderBottom: "1px solid #eae8e5" }}><div style={{ color: "#b0431a", font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: ".09em" }}>IRREVERSIBLE</div><h2 style={{ margin: "8px 0 5px", font: "500 19px/1.3 'Inter',sans-serif" }}>Delete this workspace?</h2><p style={{ margin: 0, color: "#64686d", font: "400 12px/1.5 'Inter',sans-serif" }}>This permanently removes the workspace and its merchant-scoped records.</p></div><div style={{ padding: 21 }}><p style={{ margin: 0, padding: 12, borderRadius: 10, background: "#fdf0e6", color: "#40454a", font: "400 12px/1.55 'Inter',sans-serif" }}><strong>{workspaceName}</strong> cannot be restored. Manifested workspace storage is verified before the workspace row is removed. Your authentication identity remains available for another workspace.</p>{error ? <p role="alert" style={{ color: "#b0431a", fontSize: 11.5 }}>{error}</p> : null}</div><div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "13px 21px", borderTop: "1px solid #eae8e5" }}><button type="button" disabled={loading} onClick={() => setReviewOpen(false)} style={buttonStyle()}>Cancel</button><button type="button" disabled={loading} onClick={() => void deleteWorkspace()} style={buttonStyle(true, loading)}>{loading ? "Deleting…" : job ? "Resume deletion job" : "Delete workspace permanently"}</button></div></section></div></OverlayPortal> : null}
    </>
  );
}
