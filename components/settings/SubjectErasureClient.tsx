"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";

type ErasureStatus = {
  receipt: { id: string; effective_at: string; recorded_at: string; scope_counts: unknown };
  steps: Array<{ key: string; state: "completed" | "queued" | "blocked" | "unavailable"; detail: string }>;
  storageCleanup: {
    totalJobs: number;
    counts: { pending: number; processing: number; failed: number; completed: number; deadLetter: number; unknown: number };
    retryable: boolean;
    nextAttemptAt: string | null;
    lastError: string | null;
  };
};

const input: CSSProperties = { width: "100%", height: 32, border: 0, borderRadius: 8, padding: "0 9px", background: "#fff", boxShadow: "inset 0 0 0 1px rgba(28,27,25,.11)", color: "#1c1f23", outline: "none", font: "400 12px/1.3 'Inter',sans-serif" };
const button = (danger = false, disabled = false): CSSProperties => ({ appearance: "none", border: 0, padding: "6px 11px", borderRadius: 9, background: danger ? "#fff" : "#fff", boxShadow: danger ? "inset 0 0 0 1px rgba(176,67,26,.35)" : "inset 0 0 0 1px rgba(28,27,25,.11)", color: danger ? "#b0431a" : "#40454a", opacity: disabled ? .45 : 1, cursor: disabled ? "not-allowed" : "pointer", font: "500 12px/1 'Inter',sans-serif" });

export default function SubjectErasureClient() {
  const [subjectId, setSubjectId] = useState("");
  const requestVersion = useRef(0);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [status, setStatus] = useState<ErasureStatus | null>(null);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const value = subjectInputRef.current?.value.trim();
    if (value) setSubjectId((current) => current || value);
    return () => { requestVersion.current += 1; };
  }, []);

  async function loadStatus(subject = subjectId.trim()) {
    if (!subject) return;
    const version = requestVersion.current;
    setResult(null);
    setStatus(null);
    setStatusLoading(true);
    try {
      const response = await fetch(`/api/settings/data-subject-erasure?subjectId=${encodeURIComponent(subject)}`, { headers: { Accept: "application/json" }, cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as ErasureStatus & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Erasure status could not be read.");
      if (version === requestVersion.current) setStatus(body);
    } catch (caught) {
      if (version === requestVersion.current) setResult({ type: "error", message: caught instanceof Error ? caught.message : "Erasure status could not be read." });
    } finally {
      if (version === requestVersion.current) setStatusLoading(false);
    }
  }

  async function downloadSubjectAccess() {
    if (!subjectId.trim()) return;
    setResult(null);
    const requestedSubject = subjectId.trim();
    const version = requestVersion.current;
    setAccessLoading(true);
    try {
      const response = await fetch(`/api/settings/data-subject-access?subjectId=${encodeURIComponent(requestedSubject)}`, { headers: { Accept: "application/json" } });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Subject access export could not be created.");
      }
      if (version !== requestVersion.current) return;
      const blob = await response.blob();
      if (version !== requestVersion.current) return;
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `subject-access-${requestedSubject}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      setResult({ type: "success", message: "Subject access JSON downloaded. The file is not retained by Unauth after this response." });
    } catch (caught) {
      if (version === requestVersion.current) setResult({ type: "error", message: caught instanceof Error ? caught.message : "Subject access export could not be created." });
    } finally {
      if (version === requestVersion.current) setAccessLoading(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}><div style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: ".09em", color: "#64686d" }}>REVIEW A CUSTOMER’S DATA</div><span style={{ flex: 1 }} /><span style={{ padding: "2px 7px", borderRadius: 5, background: status ? "#fff3e9" : "#f4f3f1", color: status ? "#7a5310" : "#64686d", font: "500 10px/1.5 'Inter',sans-serif" }}>{status ? "RECEIPT LOADED" : "LOOKUP"}</span></div>
      <p style={{ margin: "0 0 11px", color: "#64686d", font: "400 11.5px/1.5 'Inter',sans-serif" }}>Find the customer in Customers, then copy their canonical record ID to download a scoped access file or inspect an existing erasure receipt. This does not delete the workspace or your account.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
        <label style={{ display: "grid", gap: 5, color: "#64686d", font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".05em" }}>CANONICAL CUSTOMER ID<input ref={subjectInputRef} value={subjectId} onChange={(event) => { requestVersion.current += 1; setSubjectId(event.target.value); setResult(null); setStatus(null); setStatusLoading(false); setAccessLoading(false); }} placeholder="Customer record UUID" autoComplete="off" style={input} /></label>

      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}><button type="button" disabled={!subjectId.trim() || accessLoading} onClick={() => void downloadSubjectAccess()} style={button(false, !subjectId.trim() || accessLoading)}>{accessLoading ? "Preparing…" : "Download subject JSON"}</button><button type="button" disabled={!subjectId.trim() || statusLoading} onClick={() => void loadStatus()} style={button(false, !subjectId.trim() || statusLoading)}>{statusLoading ? "Checking…" : "Check status"}</button></div>
      {status ? <section aria-label="Erasure status" aria-live="polite" style={{ marginTop: 11, paddingTop: 10, borderTop: "1px solid #f4f2ef" }}><div style={{ display: "flex", gap: 8, marginBottom: 8 }}><strong style={{ flex: 1, color: "#40454a", font: "500 11.5px/1.4 'Inter',sans-serif" }}>Durable erasure receipt</strong><code style={{ color: "#64686d", font: "400 10px/1.4 'IBM Plex Mono',monospace" }}>{status.receipt.id}</code></div><div style={{ display: "grid", gap: 7 }}>{status.steps.map((step) => <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 9 }}><span style={{ width: 13, height: 13, flex: "none", borderRadius: "50%", background: step.state === "completed" ? "#1a6b43" : "#fff", boxShadow: step.state === "completed" ? "none" : step.state === "unavailable" ? "inset 0 0 0 1.5px #ddd8d1" : "inset 0 0 0 2px #ff7a30", display: "grid", placeItems: "center" }}>{step.state === "completed" ? <svg width="7" height="7" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M2.2 5.2 4.2 7.2 7.8 3" /></svg> : null}</span><span style={{ flex: 1, color: step.state === "unavailable" ? "#64686d" : "#1c1f23", font: "400 11.5px/1.4 'Inter',sans-serif" }}>{step.detail}</span><span style={{ color: "#64686d", font: "400 10px/1.4 'IBM Plex Mono',monospace" }}>{step.state}</span></div>)}</div><p style={{ margin: "9px 0 0", color: "#64686d", font: "400 10.5px/1.45 'Inter',sans-serif" }}>Backup-cycle status is not exposed by the current retention store and remains unavailable.</p></section> : null}
      {result ? <p role={result.type === "error" ? "alert" : "status"} style={{ margin: "10px 0 0", padding: "8px 9px", borderRadius: 8, background: result.type === "error" ? "#fdf0e6" : "#eef6f1", color: result.type === "error" ? "#b0431a" : "#1a6b43", font: "400 11px/1.5 'Inter',sans-serif" }}>{result.message}</p> : null}

      <p role="status" style={{ marginTop: 12, color: "#7a5310", fontSize: 12 }}>Erasure preview is unavailable. No verified deletion scope is available, so customer erasure cannot be confirmed here.</p>
      <Link href="/customers" style={{ color: "#9b470d", fontSize: 12 }}>Find the customer record</Link>
    </>
  );
}
