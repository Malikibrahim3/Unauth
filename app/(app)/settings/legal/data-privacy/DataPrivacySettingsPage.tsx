import { redirect } from "next/navigation";
import { getRequestUser, requirePagePermission } from "@/lib/auth/requestContext";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { createServiceClient } from "@/lib/supabase/server";
import { TABLES } from "@/lib/supabase/tables";
import BulkDeleteClient from "@/components/settings/BulkDeleteClient";
import SubjectErasureClient from "@/components/settings/SubjectErasureClient";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";

const shadow = "0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)";
const flow = [
  ["Source record", "Shopify, helpdesk, carrier", "What the provider holds"],
  ["Imported fact", "Unauth", "Copied, timestamped, never edited"],
  ["Evidence", "Attached to a case", "Read when a decision is made"],
  ["Decision", "Recorded against a person", "Retention period not approved"],
  ["Audit entry", "Append only", "Retention period not approved"],
] as const;
const retention = [
  ["Customer names, emails, addresses", "No approved period published", "Erasable"],
  ["Order, refund and shipment facts", "No pilot period published", "Identifiers erased; facts retained"],
  ["Ticket messages and attachments", "No pilot period published", "Supported personal content erased"],
  ["Decisions and who made them", "No pilot period published", "Customer identifier erased"],
  ["Audit entries", "No pilot period published", "Retained append-only"],
  ["Ledger amounts, customer removed", "No pilot period published", "Retained as an anonymous figure"],
] as const;

export default async function DataPrivacySettingsPage() {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_AUDIT_TRAIL);
  if (!ctx) redirect("/settings");
  const service = createServiceClient();
  const [canEraseCustomer, canDeleteWorkspace, merchantResult] = await Promise.all([
    hasPermission(service, ctx, PERMISSIONS.BULK_DELETE),
    hasPermission(service, ctx, PERMISSIONS.GRANT_PERMISSIONS),
    service.from(TABLES.MERCHANTS).select("name").eq("id", ctx.merchantId).maybeSingle(),
  ]);
  const workspaceName = merchantResult.data?.name ?? "this workspace";
  const toolbar = <div style={{ height: 54, flex: 'none', display: "flex", alignItems: "center", gap: 14, padding: "0 22px", borderBottom: "1px solid #eae8e5" }}><span style={{ maxWidth: 700, color: "#64686d", font: "400 12.5px/1.5 'Inter',sans-serif" }}>Review a customer’s retained data first. Workspace deletion is a separate owner-only action; approved retention periods remain unavailable.</span><span style={{ flex: 1 }} /><button type="button" disabled title="A workspace-wide export is not available. Use scoped subject access or governed record exports." style={{ appearance: "none", border: 0, padding: "6px 10px", borderRadius: 9, background: "#fff", boxShadow: "inset 0 0 0 1px rgba(28,27,25,.11)", color: "#40454a", font: "400 12.5px/1 'Inter',sans-serif" }}>Export everything we hold</button></div>;

  return <SettingsPageShell title="Data privacy" surfaceId="data-privacy" layout="wide" toolbar={toolbar} workspaceName={workspaceName} truth={{ access: canDeleteWorkspace ? "Owner: workspace deletion; permitted operators: subject access and erasure" : canEraseCustomer ? "Bulk delete permission: subject access and erasure; workspace deletion: owner only" : "Review only; destructive privacy actions are permission-restricted", currentState: "Operational access and erasure controls; retention approval remains explicitly pending", saveBehavior: "Subject access creates a scoped download; erasure is blocked while preview is unavailable", impact: "Subject erasure preserves financial and audit truth; workspace deletion is irreversible and resumable" }}>
    <section data-operations-surface="data-privacy" style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minHeight: 0 }}>
      <section style={{ flex: "none", padding: "14px 18px 13px", borderRadius: 10, background: "#fff", boxShadow: shadow }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}><span style={{ color: "#64686d", letterSpacing: ".09em", font: "600 10.5px/1 'Inter',sans-serif" }}>HOW A CUSTOMER RECORD BECOMES AUDIT HISTORY</span><span style={{ flex: 1 }} /><span style={{ color: "#64686d", font: "400 10.5px/1 'IBM Plex Mono',monospace" }}>the last two steps are why erasure is not total</span></div>
        <div style={{ display: "flex", alignItems: "flex-start" }}>{flow.map(([title, meta, detail], index) => <div key={title} style={{ flex: 1, position: "relative", paddingRight: index === flow.length - 1 ? 0 : 18 }}>{index < flow.length - 1 ? <svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="#a7abad" strokeWidth="1.3" style={{ position: "absolute", right: 3, top: 14 }}><path d="M0 5h9M6.5 2 9.5 5 6.5 8" /></svg> : null}<div style={{ minHeight: 86, padding: "11px 12px", borderRadius: 10, background: index > 2 ? "#fff3e9" : "#f4f3f1" }}><div style={{ color: index > 2 ? "#b0431a" : "#1c1f23", font: "500 12px/1.3 'Inter',sans-serif" }}>{title}</div><div style={{ marginTop: 5, color: "#64686d", font: "400 10px/1.4 'IBM Plex Mono',monospace" }}>{meta}</div><div style={{ marginTop: 7, color: "#64686d", font: "400 10.5px/1.45 'Inter',sans-serif" }}>{detail}</div></div></div>)}</div>
      </section>

      <section role="table" aria-label="Data retention" tabIndex={0} style={{ flex: 1, minHeight: 0, padding: "12px 18px 10px", borderRadius: 10, background: "#fff", boxShadow: shadow, overflowY: "auto" }}>
        <div role="row" style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 8 }}><span role="columnheader" style={{ flex: 1, color: "#64686d", letterSpacing: ".09em", font: "600 10.5px/1 'Inter',sans-serif" }}>WHAT IS HELD, AND FOR HOW LONG</span><span role="columnheader" style={{ width: 150, flex: "none", color: "#64686d", letterSpacing: ".06em", font: "400 9.5px/1 'Inter',sans-serif" }}>RETENTION</span><span role="columnheader" style={{ width: 290, flex: "none", color: "#64686d", letterSpacing: ".06em", font: "400 9.5px/1 'Inter',sans-serif" }}>ON AN ERASURE REQUEST</span></div>
        {retention.map(([held, period, erasure]) => <div role="row" key={held} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderTop: "1px solid #f4f2ef" }}><span role="cell" style={{ flex: 1, minWidth: 0, color: "#1c1f23", font: "400 12px/1.4 'Inter',sans-serif" }}>{held}</span><span role="cell" style={{ width: 150, flex: "none", color: "#64686d", font: "400 11.5px/1.4 'IBM Plex Mono',monospace" }}>{period}</span><span role="cell" style={{ width: 290, flex: "none", color: /retained|fact/i.test(erasure) ? "#7a5310" : "#1a6b43", font: "400 11.5px/1.4 'Inter',sans-serif" }}>{erasure}</span></div>)}
        <div style={{ borderTop: "1px solid #e4e3e0", marginTop: 8, paddingTop: 10, color: "#64686d", font: "400 11.5px/1.5 'Inter',sans-serif" }}>Erasing a customer removes identifiers, not the financial or audit line. Reconciliation and any future dispute still need to see that the recorded event happened and who recorded it.</div>
      </section>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: "none" }}>
        <section style={{ flex: 1, minWidth: 0, padding: "13px 16px", borderRadius: 10, background: "#fff", boxShadow: shadow }}>{canEraseCustomer ? <SubjectErasureClient /> : <PermissionBoundary title="ERASE A CUSTOMER" copy="Bulk delete permission is required to request or confirm customer erasure." />}</section>
        <details id="workspace-deletion" style={{ padding: "13px 16px", borderRadius: 10, background: "#fff", boxShadow: shadow }}><summary style={{ cursor: "pointer", paddingBottom: 12 }}>Workspace deletion · irreversible owner action</summary>{canDeleteWorkspace ? <BulkDeleteClient key={ctx.merchantId} workspaceId={ctx.merchantId} workspaceName={workspaceName} /> : <PermissionBoundary title="DELETE THIS WORKSPACE" copy="Only the workspace owner can delete the workspace, its records and its audit history." ownerOnly />}</details>
      </div>
    </section>
  </SettingsPageShell>;
}

function PermissionBoundary({ title, copy, ownerOnly = false }: { title: string; copy: string; ownerOnly?: boolean }) {
  return <><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}><span style={{ color: "#64686d", letterSpacing: ".09em", font: "600 10.5px/1 'Inter',sans-serif" }}>{title}</span><span style={{ flex: 1 }} />{ownerOnly ? <span style={{ padding: "2px 7px", borderRadius: 5, background: "#fdf0e6", color: "#b0431a", font: "500 10px/1.5 'Inter',sans-serif" }}>OWNER ONLY</span> : null}</div><p style={{ margin: 0, color: "#64686d", font: "400 11.5px/1.5 'Inter',sans-serif" }}>{copy}</p></>;
}
