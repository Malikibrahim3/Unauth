"use client";

import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { useOverlayPresence } from "@/lib/design/useOverlayPresence";
import { useCallback, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";
import { formatDateAbsolute } from "@/lib/utils/format";

export type AgreementSummary = {
  id: string;
  agreement_type: string;
  counterparty_name: string | null;
  service_name: string | null;
  document_name: string | null;
  source_url?: string | null;
  file_mime_type?: string | null;
  file_size_bytes?: number | null;
  status: string;
  effective_from: string | null;
  effective_to: string | null;
  version_label: string | null;
  created_at: string;
};

type UploadState = { status: "idle" | "saving" } | { status: "success"; agreementId: string } | { status: "error"; message: string };
type RuleState = { status: "idle" | "saving" | "success" } | { status: "error"; message: string };
type PendingRule = Record<string, string | number | string[] | null>;
const AGREEMENT_TYPES = [["COURIER", "Carrier"], ["WAREHOUSE_3PL", "Warehouse"], ["PAYMENT_PROVIDER", "Payments"], ["INSURANCE", "Insurer"], ["RETURNS_PLATFORM", "Returns platform"], ["MARKETPLACE", "Marketplace"], ["INTERNAL_POLICY", "Internal policy"], ["OTHER", "Other"]] as const;
const shadow = "0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)";
const input: CSSProperties = { width: "100%", height: 33, border: 0, borderRadius: 8, padding: "0 9px", background: "#fff", boxShadow: "inset 0 0 0 1px rgba(28,27,25,.12)", color: "#1c1f23", outline: "none", font: "400 12px/1.3 'Inter',sans-serif" };
const button = (primary = false, disabled = false): CSSProperties => ({ appearance: "none", border: 0, padding: "6px 11px", borderRadius: 9, background: primary ? "#1c1f23" : "#fff", boxShadow: primary ? "none" : "inset 0 0 0 1px rgba(28,27,25,.11)", color: primary ? "#fff" : "#40454a", opacity: disabled ? .45 : 1, cursor: disabled ? "not-allowed" : "pointer", font: "500 12.5px/1 'Inter',sans-serif" });

function humanize(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function approved(item: AgreementSummary) { return item.status === "active" || item.status === "approved"; }
function stateLabel(item: AgreementSummary) { return approved(item) ? "Verified" : item.status === "needs_review" || item.status === "draft" ? "Needs review" : humanize(item.status); }
function stateTone(item: AgreementSummary) { return approved(item) ? { background: "#eef6f1", color: "#1a6b43" } : { background: "#fff3e9", color: "#7a5310" }; }
function fileSize(value?: number | null) { if (value == null) return "size unavailable"; return value < 1_048_576 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / 1_048_576).toFixed(1)} MB`; }

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label style={{ display: "grid", gap: 5, color: "#64686d", font: "500 10.5px/1.3 'Inter',sans-serif" }}>{label}{children}</label>;
}

function Overlay({ title, label, description, busy, onClose, children }: { title: string; label: string; description: string; busy: boolean; onClose: () => void; children: ReactNode }) {
  const close = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  const { containerRef } = useOverlayPresence({ open: true, onClose: close, trapFocus: true, restoreFocus: true, lockBodyScroll: true, exitDurationMs: 0 });
  return <OverlayPortal><div data-overlay-id="agreement-upload-and-review-overlays" style={{ position: "fixed", inset: 0, zIndex: 120, pointerEvents: "auto", display: "grid", placeItems: "center", padding: 24, background: "rgba(28,27,25,.32)" }} onMouseDown={(event) => { if (!busy && event.target === event.currentTarget) onClose(); }}><section ref={containerRef} tabIndex={-1} aria-busy={busy || undefined} role="dialog" aria-modal="true" aria-label={label} style={{ width: "min(650px,100%)", maxHeight: "calc(100vh - 48px)", overflowY: "auto", borderRadius: 14, background: "#fff", boxShadow: "0 24px 70px rgba(28,27,25,.24)" }}><header style={{ padding: "18px 21px 16px", borderBottom: "1px solid #eae8e5" }}><h2 style={{ margin: 0, color: "#1c1f23", font: "500 19px/1.3 'Inter',sans-serif" }}>{title}</h2><p style={{ margin: "5px 0 0", color: "#64686d", font: "400 12px/1.5 'Inter',sans-serif" }}>{description}</p><button type="button" aria-label="Close dialog" disabled={busy} onClick={close} style={button()}>Close</button></header>{children}{busy ? <p role="status">Saving. Keep this dialog open.</p> : null}</section></div></OverlayPortal>;
}

export function AgreementSettingsClient({ initialAgreements }: { initialAgreements: AgreementSummary[] }) {
  const [agreements, setAgreements] = useState(initialAgreements);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });
  const [rule, setRule] = useState<RuleState>({ status: "idle" });
  const [pendingRule, setPendingRule] = useState<PendingRule | null>(null);
  const [selectedOverride, setSelectedOverride] = useState<string | null>(null);
  const uploadForm = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedSelectedId = searchParams.get("selected");
  const selectedId = selectedOverride && agreements.some((item) => item.id === selectedOverride) ? selectedOverride : agreements.some((item) => item.id === requestedSelectedId) ? requestedSelectedId : agreements[0]?.id ?? null;
  const selected = useMemo(() => agreements.find((item) => item.id === selectedId) ?? null, [agreements, selectedId]);
  const needsReview = agreements.filter((item) => !approved(item));

  function choose(item: AgreementSummary) {
    setSelectedOverride(item.id);
    setRule({ status: "idle" });
  }

  async function uploadAgreement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUpload({ status: "saving" });
    try {
      const response = await fetch("/api/agreements/upload", { method: "POST", body: new FormData(event.currentTarget) });
      const body = await response.json().catch(() => ({})) as { error?: string; agreement?: AgreementSummary };
      if (!response.ok || !body.agreement?.id) throw new Error(body.error ?? "Agreement upload failed.");
      const nextAgreement = { ...body.agreement, status: body.agreement.status ?? "needs_review" };
      setAgreements((current) => [nextAgreement, ...current.filter((item) => item.id !== nextAgreement.id)]);
      setSelectedOverride(nextAgreement.id);
      setUpload({ status: "success", agreementId: nextAgreement.id });
      setUploadOpen(false);
      setRule({ status: "idle" });
      uploadForm.current?.reset();
    } catch (caught) {
      setUpload({ status: "error", message: caught instanceof Error ? caught.message : "Agreement upload failed." });
    }
  }

  function reviewTerms(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const deadline = String(values.get("deadline_days") ?? "").trim();
    setPendingRule({
      rule_name: String(values.get("rule_name") ?? ""),
      rule_type: String(values.get("rule_type") ?? ""),
      applies_to_claim_type: String(values.get("applies_to_claim_type") ?? ""),
      recovery_eligible: String(values.get("recovery_eligible") ?? ""),
      recovery_route: String(values.get("recovery_route") ?? ""),
      reason: String(values.get("reason") ?? ""),
      deadline_days: deadline ? Number(deadline) : null,
      required_evidence: String(values.get("required_evidence") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      priority: 100,
    });
  }

  async function approveTerms() {
    if (!selected || !pendingRule) return;
    setRule({ status: "saving" });
    try {
      const response = await fetch(`/api/agreements/${selected.id}/rules`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pendingRule) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Agreement terms could not be approved.");
      setRule({ status: "success" });
      setPendingRule(null);
      setAgreements((current) => current.map((item) => item.id === selected.id ? { ...item, status: "active" } : item));
      const next = new URLSearchParams(searchParams.toString());
      next.set("selected", selected.id);
      next.delete("status");
      next.delete("type");
      router.replace(`${pathname}?${next}`, { scroll: false });
    } catch (caught) {
      setRule({ status: "error", message: caught instanceof Error ? caught.message : "Agreement terms could not be approved." });
    }
  }

  const toolbar = <div style={{ height: 54, flex: 'none', display: "flex", alignItems: "center", gap: 14, padding: "0 22px", borderBottom: "1px solid #eae8e5" }}><Metric value={agreements.length} label="documents" /><Divider /><Metric value={needsReview.length} label="not verified by a person" tone="#7a5310" /><Divider /><Metric value="—" label="partners with no document unavailable" tone="#b0431a" /><span style={{ flex: 1 }} /><button type="button" aria-label="Upload an agreement" onClick={() => { setUpload({ status: "idle" }); setUploadOpen(true); }} style={button()}>Upload a document</button><button type="button" disabled={!selected || approved(selected)} onClick={() => document.querySelector<HTMLInputElement>('input[name="rule_name"]')?.focus()} style={button(true, !selected || approved(selected))}>Approve the selected terms</button></div>;

  return <SettingsPageShell title="Agreements" surfaceId="agreements" layout="wide" toolbar={toolbar} truth={{ access: "Members with Manage settings permission", currentState: "Stored source documents and separately approved recovery terms", saveBehavior: "Upload stores a source only; each verified term needs a separate approval", impact: "Only approved terms can guide future recovery work; existing submitted claims retain their version" }}>
    <div data-operations-surface="agreements" data-state-id={agreements.length === 0 ? "agreements-empty" : undefined} style={{ flex: 1, minHeight: 0, display: "flex", gap: 12 }}>
      <aside style={{ width: 288, flex: "none", display: "flex", flexDirection: "column", gap: 11 }}>
        <div style={{ color: "#64686d", letterSpacing: ".09em", font: "600 10.5px/1 'Inter',sans-serif" }}>DOCUMENTS</div>
        <section aria-label="Stored agreements" style={{ padding: "4px 13px 9px", borderRadius: 10, background: "#fff", boxShadow: shadow, display: "flex", flexDirection: "column" }}>{agreements.length ? agreements.map((item, index) => <button type="button" key={item.id} onClick={() => choose(item)} style={{ appearance: "none", border: 0, borderTop: index ? "1px solid #f4f2ef" : undefined, margin: "0 -13px", padding: "10px 13px", background: item.id === selectedId ? "#ffffff" : "#fff", boxShadow: item.id === selectedId ? "inset 2px 0 0 #ff7a30" : "none", color: "#1c1f23", textAlign: "left", cursor: "pointer" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", font: `${item.id === selectedId ? 500 : 400} 12px/1.35 'Inter',sans-serif` }}>{item.counterparty_name ?? item.document_name ?? "Untitled agreement"}</span><span style={{ padding: "2px 7px", borderRadius: 5, ...stateTone(item), font: "500 10px/1.5 'Inter',sans-serif" }}>{stateLabel(item)}</span></div><div style={{ marginTop: 5, color: "#64686d", font: "400 10.5px/1.5 'IBM Plex Mono',monospace" }}>{item.version_label ?? "no version"} · {item.effective_from ? `effective ${formatDateAbsolute(item.effective_from)}` : "not in force"}</div></button>) : <div style={{ padding: "16px 0", color: "#64686d", font: "400 11.5px/1.5 'Inter',sans-serif" }}>No agreement documents on file. Uploading a document never activates extracted terms.</div>}</section>
        <section style={{ padding: "12px 13px", borderRadius: 10, background: "#fff", boxShadow: shadow, color: "#64686d", font: "400 11.5px/1.5 'Inter',sans-serif" }}>A missing document leaves every dependent recovery term explicitly unverified. Unauth never substitutes a remembered deadline or cap.</section>
      </aside>

      <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 11 }}>
        {upload.status === "success" ? <p role="status" style={{ margin: 0, padding: "8px 10px", borderRadius: 8, background: "#eef6f1", color: "#1a6b43", font: "400 11.5px/1.4 'Inter',sans-serif" }}>Document uploaded. Review its source facts before approving a term.</p> : null}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}><span style={{ color: "#64686d", letterSpacing: ".09em", font: "600 10.5px/1 'Inter',sans-serif" }}>{selected ? `${(selected.counterparty_name ?? selected.document_name ?? "SELECTED AGREEMENT").toUpperCase()} · EXTRACTED TERMS` : "EXTRACTED TERMS"}</span><span style={{ flex: 1 }} /><span style={{ color: "#64686d", font: "400 10.5px/1 'IBM Plex Mono',monospace" }}>{selected ? `${selected.document_name ?? "document"} · ${fileSize(selected.file_size_bytes)}` : "no document selected"}</span></div>
        {selected ? <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 12 }}>
          <section style={{ width: 232, flex: "none", padding: 11, borderRadius: 10, background: "#fff", boxShadow: shadow, display: "flex", flexDirection: "column", gap: 9 }}><div style={{ flex: 1, minHeight: 220, borderRadius: 8, padding: "14px 13px", background: "#f4f3f1", boxShadow: "inset 0 0 0 1px rgba(28,27,25,.06)", display: "flex", flexDirection: "column", gap: 7, overflow: "hidden" }}>{[60,100,100,80,100,70,100,90,40].map((width, index) => <span key={index} style={{ height: index ? 5 : 7, width: `${width}%`, borderRadius: 2, background: index === 4 || index === 5 ? "#f7e6cf" : index === 0 ? "#d9d4cd" : "#e4e3e0", marginTop: index === 4 || index === 6 ? 6 : 0 }} />)}<span style={{ flex: 1 }} /><span style={{ color: "#64686d", font: "400 9.5px/1.4 'IBM Plex Mono',monospace" }}>source PDF · clause locations unavailable until verified</span></div><div style={{ display: "flex", gap: 7 }}>{selected.source_url ? <a href={selected.source_url} target="_blank" rel="noreferrer" style={{ flex: 1, padding: "6px 0", borderRadius: 7, boxShadow: "inset 0 0 0 1px rgba(28,27,25,.1)", color: "#40454a", textAlign: "center", textDecoration: "none", font: "400 11.5px/1 'Inter',sans-serif" }}>Open PDF</a> : <span style={{ flex: 1, padding: "6px 0", color: "#64686d", textAlign: "center", font: "400 11.5px/1 'Inter',sans-serif" }}>PDF unavailable</span>}</div></section>
          <section style={{ flex: 1, minWidth: 0, padding: "12px 15px 11px", borderRadius: 10, background: "#fff", boxShadow: shadow, display: "flex", flexDirection: "column", overflowY: "auto" }}>{approved(selected) ? <ApprovedTermsUnavailable item={selected} /> : <TermsForm onSubmit={reviewTerms} rule={rule} />}</section>
        </div> : <section style={{ flex: 1, borderRadius: 10, background: "#fff", boxShadow: shadow, display: "grid", placeItems: "center", color: "#64686d", font: "400 12px/1.5 'Inter',sans-serif" }}>Upload a source document to begin person-verified extraction.</section>}
      </section>
    </div>

    {uploadOpen ? <Overlay title="Upload an agreement" label="Upload an agreement" description="PDF only, up to 10 MB. Choose the provider, service, version and effective dates, then review these fields before Upload agreement. The PDF and metadata are retained as a source document awaiting human review; no term is activated. Keep the original: retrying an upload creates a separate document. Retention follows the workspace data policy, with no automatic expiry promised here." busy={upload.status === "saving"} onClose={() => setUploadOpen(false)}><form ref={uploadForm} onSubmit={uploadAgreement}><div style={{ padding: 21, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="Agreement type"><select name="agreement_type" required defaultValue="COURIER" style={input}>{AGREEMENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Counterparty"><input name="counterparty_name" placeholder="Carrier or provider" style={input} /></Field><Field label="Service"><input name="service_name" placeholder="Service covered" style={input} /></Field><Field label="Version"><input name="version_label" placeholder="Agreement version" style={input} /></Field><Field label="Effective from"><input name="effective_from" type="date" style={input} /></Field><Field label="Effective to"><input name="effective_to" type="date" style={input} /></Field><label style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 10, border: "1px dashed #d8d4cf", background: "#ffffff", color: "#40454a", font: "400 11.5px/1.4 'Inter',sans-serif" }}><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#64686d" strokeWidth="1.4"><path d="M4 2.8h7l5 5V17H4Z"/><path d="M11 2.8v5h5M7 12h6"/></svg><span style={{ flex: 1 }}>Choose a PDF<br /><small style={{ color: "#64686d" }}>Source document, maximum 10 MB</small></span><input name="file" type="file" required accept=".pdf,application/pdf" style={{ fontSize: 11 }} /></label>{upload.status === "error" ? <p role="alert" style={{ gridColumn: "1 / -1", margin: 0, color: "#b0431a", fontSize: 11.5 }}>{upload.message}</p> : null}</div><div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "13px 21px", borderTop: "1px solid #eae8e5" }}><button type="button" disabled={upload.status === "saving"} onClick={() => setUploadOpen(false)} style={button()}>Cancel</button><button type="submit" disabled={upload.status === "saving"} style={button(true, upload.status === "saving")}>{upload.status === "saving" ? "Uploading…" : "Upload agreement"}</button></div></form></Overlay> : null}

    {pendingRule ? <Overlay title="Approve verified agreement term?" label="Approve verified agreement term?" description="This activates a merchant policy used during future recovery review." busy={rule.status === "saving"} onClose={() => setPendingRule(null)}><div style={{ padding: 21 }}><dl style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "9px 12px", margin: 0 }}><dt style={{ color: "#64686d", fontSize: 11 }}>Source document</dt><dd style={{ margin: 0, color: "#40454a", fontSize: 12 }}>{selected?.document_name ?? "Source PDF unavailable"}</dd><dt style={{ color: "#64686d", fontSize: 11 }}>Rule</dt><dd style={{ margin: 0, color: "#40454a", fontSize: 12 }}>{String(pendingRule.rule_name)}</dd><dt style={{ color: "#64686d", fontSize: 11 }}>Audit consequence</dt><dd style={{ margin: 0, color: "#40454a", fontSize: 12 }}>A new active agreement rule is appended and attributed to this merchant approval.</dd></dl>{rule.status === "error" ? <p role="alert" style={{ color: "#b0431a", fontSize: 11.5 }}>{rule.message}</p> : null}</div><div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "13px 21px", borderTop: "1px solid #eae8e5" }}><button type="button" disabled={rule.status === "saving"} onClick={() => setPendingRule(null)} style={button()}>Cancel</button><button type="button" disabled={rule.status === "saving"} onClick={() => void approveTerms()} style={button(true, rule.status === "saving")}>{rule.status === "saving" ? "Approving…" : "Approve term"}</button></div></Overlay> : null}
  </SettingsPageShell>;
}

function Metric({ value, label, tone = "#1c1f23" }: { value: number | string; label: string; tone?: string }) { return <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ color: tone, font: "400 17px/1 'IBM Plex Mono',monospace" }}>{value}</span><span style={{ color: "#64686d", font: "400 11.5px/1 'Inter',sans-serif" }}>{label}</span></div>; }
function Divider() { return <div style={{ width: 1, height: 22, background: "#eae8e5" }} />; }

function TermsForm({ onSubmit, rule }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; rule: RuleState }) {
  return <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Field label="Rule name"><input name="rule_name" required maxLength={160} placeholder="Lost parcel recovery eligibility" style={input} /></Field><Field label="Recovery route"><input name="recovery_route" required maxLength={120} placeholder="Carrier claim" style={input} /></Field><Field label="Claim type"><select name="applies_to_claim_type" defaultValue="LOST_PARCEL" style={input}><option value="LOST_PARCEL">Lost parcel</option><option value="DAMAGED_ITEM">Damaged item</option><option value="ANY">Any claim</option></select></Field><Field label="Rule effect"><select name="rule_type" defaultValue="RECOVERY_ELIGIBILITY" style={input}><option value="RECOVERY_ELIGIBILITY">Recovery eligibility</option><option value="EVIDENCE_REQUIREMENT">Evidence requirement</option><option value="DEADLINE">Deadline</option></select></Field><Field label="Recovery status"><select name="recovery_eligible" defaultValue="eligible" style={input}><option value="eligible">Eligible</option><option value="not_eligible">Not eligible</option><option value="pending_evidence">Pending evidence</option></select></Field><Field label="Deadline days"><input name="deadline_days" type="number" min={1} max={3650} style={input} /></Field><Field label="Required evidence"><input name="required_evidence" placeholder="Tracking scan, invoice" style={input} /></Field><Field label="Verified reason"><textarea name="reason" required maxLength={1000} rows={2} placeholder="Describe the exact verified agreement term." style={{ ...input, height: 54, paddingTop: 8, resize: "vertical" }} /></Field></div><p style={{ margin: 0, padding: "9px 10px", borderRadius: 9, background: "#f4f3f1", color: "#64686d", font: "400 11px/1.5 'Inter',sans-serif" }}>Extracted terms become claimable only after a person reads the source and approves this exact rule.</p>{rule.status === "error" ? <p role="alert" style={{ margin: 0, color: "#b0431a", fontSize: 11.5 }}>{rule.message}</p> : null}<div style={{ display: "flex", alignItems: "center", gap: 11, borderTop: "1px solid #e4e3e0", paddingTop: 11 }}><span style={{ flex: 1, color: "#64686d", font: "400 11px/1.5 'Inter',sans-serif" }}>Approval writes this term into the recovery rulebook and stamps it with your identity.</span><button type="submit" style={button(true)}>Review approval</button></div></form>;
}

function ApprovedTermsUnavailable({ item }: { item: AgreementSummary }) {
  const rows = [["Document", `${item.document_name ?? "Not retained"} · ${fileSize(item.file_size_bytes)}`], ["Uploaded", formatDateAbsolute(item.created_at)], ["Effective period", item.effective_from ? `${formatDateAbsolute(item.effective_from)}${item.effective_to ? ` – ${formatDateAbsolute(item.effective_to)}` : ""}` : "Not in force"], ["Claim window", "Approved term values unavailable from this read model"], ["Recoverable value", "Approved term values unavailable from this read model"], ["Evidence required", "Approved term values unavailable from this read model"]];
  return <>{rows.map(([label, value], index) => <div key={label} style={{ display: "flex", gap: 12, padding: "10px 0", borderTop: index ? "1px solid #f4f2ef" : undefined }}><div style={{ width: 132, flex: "none", color: "#1c1f23", font: "500 11.5px/1.4 'Inter',sans-serif" }}>{label}</div><span style={{ flex: 1, minWidth: 0, color: "#40454a", font: "400 12px/1.45 'Inter',sans-serif" }}>{value}</span><span style={{ width: 92, flex: "none", textAlign: "right" }}><span style={{ padding: "2px 7px", borderRadius: 5, background: index < 3 ? "#eef6f1" : "#f4f3f1", color: index < 3 ? "#1a6b43" : "#64686d", font: "500 10px/1.5 'Inter',sans-serif" }}>{index < 3 ? "VERIFIED" : "UNAVAILABLE"}</span></span></div>)}<span style={{ flex: 1 }} /><div style={{ marginTop: 11, padding: "11px 13px", borderRadius: 10, background: "#f4f3f1", color: "#64686d", font: "400 11.5px/1.5 'Inter',sans-serif" }}>This agreement is active. Its source metadata is available here; the current agreements read model does not expose individual approved rule values, so none are reconstructed.</div></>;
}
