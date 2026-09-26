"use client";

import Link from "next/link";
import { SuppliedSecurityDialog as DialogFrame } from "@/components/visual-authority/SuppliedSecurityDialog";
import {
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";
import {
  apiIntegrationsReducer,
  initialApiIntegrationsState,
} from "@/components/settings/apiIntegrationsReducer";
import type { ApiKeyRow } from "@/components/settings/apiIntegrationsTypes";
import {
  API_RATE_LIMITS_PER_MINUTE,
  API_SCOPE_LABELS,
  API_SCOPES,
  type ApiScope,
} from "@/lib/api/accessPolicy";
import { useFetchJson } from "@/lib/react/useFetchJson";
import { formatDayMonthInTimeZone } from "@/lib/utils/format";

const card: CSSProperties = {
  background: "#ffffff",
  borderRadius: 10,
  boxShadow: "0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)",
};

const quietButton: CSSProperties = {
  appearance: "none",
  border: 0,
  padding: "6px 10px",
  borderRadius: 9,
  boxShadow: "inset 0 0 0 1px rgba(28,27,25,.11)",
  background: "#fff",
  color: "#40454a",
  font: "400 12.5px/1 'Inter',sans-serif",
  cursor: "pointer",
};

const primaryButton: CSSProperties = {
  appearance: "none",
  border: 0,
  padding: "6px 11px",
  borderRadius: 9,
  background: "#1c1f23",
  color: "#fff",
  font: "500 12.5px/1 'Inter',sans-serif",
  cursor: "pointer",
};

function formatLastUsed(value: string | null) {
  if (!value) return "never";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "unavailable";
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 60) return `${minutes || 1} min ago`;
  if (minutes < 1_440) return `${Math.round(minutes / 60)} hr ago`;
  if (minutes < 2_880) return "yesterday";
  return formatDayMonthInTimeZone(new Date(value), "UTC");
}





export default function ApiIntegrationsAdvancedSection({ machineAccessEnabled }: { machineAccessEnabled: boolean }) {
  const [state, dispatch] = useReducer(apiIntegrationsReducer, initialApiIntegrationsState);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const { data, loading, reload, error } = useFetchJson<{ keys?: ApiKeyRow[] }>("/api/settings/api-keys", {
    enabled: machineAccessEnabled,
    parse: async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to load API keys");
      return body;
    },
  });
  const keys = data?.keys ?? [];
  const liveKeys = keys.filter((key) => !key.revoked_at);
  const neverUsed = liveKeys.filter((key) => !key.last_used_at);



  function closeCreateModal() {
    setCreateModalOpen(false);
    dispatch({ type: "clearCreated" });
    window.setTimeout(() => createButtonRef.current?.focus(), 0);
  }

  function closeRevokeModal() {
    setRevokeError(null);
    setRevokeModalOpen(false);
    dispatch({ type: "patch", patch: { revokeTarget: null } });
  }

  function openRevokeModal(key: ApiKeyRow) {
    setRevokeError(null);
    dispatch({ type: "patch", patch: { revokeTarget: key } });
    setRevokeModalOpen(true);
  }

  function toggleScope(scope: ApiScope) {
    dispatch({
      type: "patch",
      patch: {
        scopes: state.scopes.includes(scope)
          ? state.scopes.filter((value) => value !== scope)
          : [...state.scopes, scope],
      },
    });
  }

  async function createKey(event: FormEvent) {
    event.preventDefault();
    if (!machineAccessEnabled || state.creating || !state.keyName.trim() || state.scopes.length === 0) return;
    dispatch({ type: "patch", patch: { creating: true, message: null } });
    try {
      const response = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: state.keyName.trim(), scopes: state.scopes, rateLimitPerMinute: state.rateLimitPerMinute }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to create key");
      dispatch({ type: "patch", patch: { createdSecret: body.key?.secret ?? null, createdWidgetToken: body.key?.widget_token ?? null, creating: false } });
      reload();
    } catch (caught) {
      dispatch({ type: "patch", patch: { creating: false, message: { type: "error", text: caught instanceof Error ? caught.message : "Failed to create key" } } });
    }
  }

  async function revokeKey(key: ApiKeyRow) {
    if (!machineAccessEnabled || state.busyId === key.id) return;
    dispatch({ type: "patch", patch: { busyId: key.id, message: null } });
    setRevokeError(null);
    try {
      const response = await fetch(`/api/settings/api-keys/${key.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to revoke key");
      dispatch({ type: "patch", patch: { message: { type: "success", text: `Revoked “${key.name}”.` }, busyId: null } });
      closeRevokeModal();
      reload();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to revoke key";
      setRevokeError(message);
      dispatch({ type: "patch", patch: { busyId: null, message: { type: "error", text: message } } });
    }
  }

  async function copyValue(value: string | null) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    dispatch({ type: "patch", patch: { copied: true } });
    window.setTimeout(() => dispatch({ type: "patch", patch: { copied: false } }), 2_000);
  }

  const toolbar = (
    <div style={{ height: 54, flex: 'none', display: "flex", alignItems: "center", gap: 14, padding: "0 22px", borderBottom: "1px solid #eae8e5" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ font: "400 17px/1 'IBM Plex Mono',monospace", color: "#1c1f23" }}>{machineAccessEnabled && !loading ? liveKeys.length : "—"}</span><span style={{ font: "400 11.5px/1 'Inter',sans-serif", color: "#64686d" }}>live keys</span></div>
      <div style={{ width: 1, height: 22, background: "#eae8e5" }} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ font: "400 17px/1 'IBM Plex Mono',monospace", color: neverUsed.length ? "#b0431a" : "#40454a" }}>{machineAccessEnabled && !loading ? neverUsed.length : "—"}</span><span style={{ font: "400 11.5px/1 'Inter',sans-serif", color: "#64686d" }}>never used</span></div>
      <div style={{ width: 1, height: 22, background: "#eae8e5" }} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ font: "400 17px/1 'IBM Plex Mono',monospace", color: "#40454a" }}>—</span><span style={{ font: "400 11.5px/1 'Inter',sans-serif", color: "#64686d" }}>calls this month unavailable</span></div>
      <div style={{ flex: 1 }} />
      <Link href="/help/api-access" style={{ ...quietButton, textDecoration: "none" }}>Read the API reference</Link>
      <button ref={createButtonRef} type="button" disabled={!machineAccessEnabled} onClick={() => { dispatch({ type: "patch", patch: { message: null } }); setCreateModalOpen(true); }} style={{ ...primaryButton, opacity: machineAccessEnabled ? 1 : .45 }}>Create a key</button>
    </div>
  );

  return (
    <SettingsPageShell
      title="API access"
      surfaceId="developer-api-access"
      layout="wide"
      toolbar={toolbar}
      truth={{
        access: "Manage settings permission and an eligible machine-access plan",
        currentState: machineAccessEnabled ? "Machine access enabled; key secrets remain reveal-once" : "Machine access unavailable for this workspace plan",
        saveBehavior: "Keys are created once; revocation is immediate after confirmation",
        impact: "Scopes allow approved reads and imports only; no merchant decision, publication, write-off, or deletion authority",
      }}
    >
      {state.message ? <p role={state.message.type === "error" ? "alert" : "status"} data-tone={state.message.type} style={{ margin: 0, padding: "9px 11px", borderRadius: 8, background: state.message.type === "error" ? "#fdf0e6" : "#eef6f1", color: state.message.type === "error" ? "#b0431a" : "#1a6b43", font: "400 11.5px/1.5 'Inter',sans-serif" }}>{state.message.text}</p> : null}
      <KeysCard
        enabled={machineAccessEnabled}
        loading={loading}
        error={error}
        keys={keys}
        onRevoke={openRevokeModal}
      />
      <div style={{ display: "flex", gap: 12, flex: 1, minHeight: 0 }}>
        <CapabilitiesCard />
        <RevealLifecycleCard />
      </div>
      {createModalOpen ? (
        <DialogFrame title={state.createdSecret ? "Save these API credentials" : "Create an API key"} description={state.createdSecret ? "Closing this reveal is final. Unauth stores hashes and cannot recover either value." : "Choose the smallest scope and rate limit the integration needs."} overlayId="create-reveal-and-revoke-api-key-modals" busy={state.creating} onClose={closeCreateModal} footer={state.createdSecret ? <><button type="button" onClick={closeCreateModal} style={primaryButton}>I saved these credentials</button></> : <><button type="button" disabled={state.creating} onClick={closeCreateModal} style={quietButton}>Cancel</button><button type="submit" form="source-api-create-form" disabled={!state.keyName.trim() || state.scopes.length === 0 || state.creating} style={{ ...primaryButton, opacity: !state.keyName.trim() || state.scopes.length === 0 || state.creating ? .45 : 1 }}>{state.creating ? "Creating…" : "Create key"}</button></>}>{state.createdSecret ? <div><div style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: ".09em", color: "#64686d" }}>SHOWN ONCE, THEN NEVER AGAIN</div>
{[{ label: "API key", value: state.createdSecret }, { label: "Widget token", value: state.createdWidgetToken }].map((item) => item.value ? <div key={item.label} style={{ marginTop: 10, padding: 14, borderRadius: 10, background: "#1c1f23" }}><div style={{ color: "#64686d", font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".06em" }}>{item.label.toUpperCase()}</div><code style={{ display: "block", marginTop: 9, color: "#f0ede8", font: "400 12px/1.5 'IBM Plex Mono',monospace", wordBreak: "break-all" }}>{item.value}</code><button type="button" onClick={() => void copyValue(item.value)} style={{ ...quietButton, marginTop: 10 }}>{state.copied ? "Copied" : `Copy ${item.label.toLowerCase()}`}</button></div> : null)}</div> : <form id="source-api-create-form" onSubmit={createKey}>
{state.message?.type === "error" ? <p role="alert" style={{ margin: "0 0 12px", color: "#b0431a", fontSize: 12 }}>{state.message.text}</p> : null}
<div style={{ padding: 0 }}>
                  <label style={{ display: "grid", gap: 7, color: "#40454a", font: "500 11.5px/1.3 'Inter',sans-serif" }}>Label<input value={state.keyName} onChange={(event) => dispatch({ type: "patch", patch: { keyName: event.target.value } })} style={{ height: 36, border: "1px solid #ddd8d1", borderRadius: 8, padding: "0 10px", color: "#1c1f23", background: "#fff", font: "400 12.5px/1 'Inter',sans-serif", outline: "none" }} /></label>
                  <fieldset style={{ margin: "17px 0 0", padding: 0, border: 0 }}><legend style={{ marginBottom: 7, color: "#40454a", font: "500 11.5px/1.3 'Inter',sans-serif" }}>Scopes</legend><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>{API_SCOPES.map((scope) => <label key={scope} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "9px 10px", borderRadius: 8, boxShadow: "inset 0 0 0 1px #e4e3e0", cursor: "pointer" }}><input type="checkbox" checked={state.scopes.includes(scope)} onChange={() => toggleScope(scope)} style={{ margin: "2px 0 0" }} /><span><span style={{ display: "block", color: "#1c1f23", font: "400 11px/1.4 'IBM Plex Mono',monospace" }}>{scope}</span><span style={{ display: "block", marginTop: 2, color: "#64686d", font: "400 10.5px/1.4 'Inter',sans-serif" }}>{API_SCOPE_LABELS[scope]}</span></span></label>)}</div></fieldset>
                  <label style={{ display: "grid", gap: 7, marginTop: 17, color: "#40454a", font: "500 11.5px/1.3 'Inter',sans-serif" }}>Rate limit<select value={state.rateLimitPerMinute} onChange={(event) => dispatch({ type: "patch", patch: { rateLimitPerMinute: Number(event.target.value) as typeof state.rateLimitPerMinute } })} style={{ height: 36, border: "1px solid #ddd8d1", borderRadius: 8, padding: "0 10px", color: "#1c1f23", background: "#fff", font: "400 12.5px/1 'Inter',sans-serif" }}>{API_RATE_LIMITS_PER_MINUTE.map((rate) => <option key={rate} value={rate}>{rate} requests per minute</option>)}</select></label>
                </div></form>}</DialogFrame>
      ) : null}
      {revokeModalOpen && state.revokeTarget ? (
        <DialogFrame title={`Revoke ${state.revokeTarget.name}`} description="Requests using this key will stop immediately. The key cannot be restored." overlayId="create-reveal-and-revoke-api-key-modals" busy={state.busyId === state.revokeTarget.id} onClose={closeRevokeModal} footer={<><button type="button" disabled={state.busyId === state.revokeTarget.id} onClick={closeRevokeModal} style={quietButton}>Cancel</button><button type="button" disabled={state.busyId === state.revokeTarget.id} onClick={() => void revokeKey(state.revokeTarget as ApiKeyRow)} style={{ ...primaryButton, background: "#b0431a", opacity: state.busyId === state.revokeTarget.id ? .45 : 1 }}>{state.busyId === state.revokeTarget.id ? "Revoking…" : "Revoke key"}</button></>}><div style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: ".09em", color: "#b0431a" }}>IRREVERSIBLE</div>
{revokeError ? <p role="alert" style={{ margin: "12px 0 0", color: "#b0431a", fontSize: 12 }}>{revokeError}</p> : null}</DialogFrame>
      ) : null}
    </SettingsPageShell>
  );
}

function KeysCard({ enabled, loading, error, keys, onRevoke }: { enabled: boolean; loading: boolean; error: string | null; keys: ApiKeyRow[]; onRevoke: (key: ApiKeyRow) => void }) {
  return (
    <section data-operations-surface="api-access" style={{ ...card, padding: "12px 18px 10px", flex: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 8 }}>
        <span style={{ flex: 1, font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: ".09em", color: "#64686d" }}>KEYS</span>
        <span style={{ width: 150, flex: "none", font: "400 9.5px/1 'Inter',sans-serif", letterSpacing: ".06em", color: "#64686d" }}>USE · 12 WEEKS · PEAK/DAY</span>
        <span style={{ width: 74, flex: "none", textAlign: "right", font: "400 9.5px/1 'Inter',sans-serif", letterSpacing: ".06em", color: "#64686d" }}>ERRORS</span>
        <span style={{ width: 80, flex: "none", textAlign: "right", font: "400 9.5px/1 'Inter',sans-serif", letterSpacing: ".06em", color: "#64686d" }}>RATE</span>
        <span style={{ width: 96, flex: "none", textAlign: "right", font: "400 9.5px/1 'Inter',sans-serif", letterSpacing: ".06em", color: "#64686d" }}>LAST USED</span>
        <span style={{ width: 88, flex: "none", textAlign: "right", font: "400 9.5px/1 'Inter',sans-serif", letterSpacing: ".06em", color: "#64686d" }}>STATE</span>
      </div>
      {!enabled ? <div data-state-id="api-access-unavailable" style={{ minHeight: 82, display: "flex", alignItems: "center", borderTop: "1px solid #f4f2ef", color: "#7a5310", font: "400 12px/1.5 'Inter',sans-serif" }}>Enterprise machine access is unavailable for the workspace’s provider-confirmed plan.</div>
        : loading ? <div role="status" aria-label="Loading API keys" style={{ height: 82, borderTop: "1px solid #f4f2ef", background: "linear-gradient(90deg,#fff,#f4f3f1,#fff)", backgroundSize: "220% 100%", animation: "om-shimmer 1.7s ease-in-out infinite" }} />
          : error ? <div role="alert" style={{ minHeight: 82, display: "flex", alignItems: "center", borderTop: "1px solid #f4f2ef", color: "#b0431a", font: "400 12px/1.5 'Inter',sans-serif" }}>{error}</div>
            : keys.length === 0 ? <div data-state-id="api-keys-empty" style={{ minHeight: 82, display: "flex", alignItems: "center", borderTop: "1px solid #f4f2ef", color: "#64686d", font: "400 12px/1.5 'Inter',sans-serif" }}>No API keys have been created for this workspace.</div>
              : keys.map((key) => <KeyRow key={key.id} item={key} onRevoke={onRevoke} />)}
    </section>
  );
}

function KeyRow({ item, onRevoke }: { item: ApiKeyRow; onRevoke: (key: ApiKeyRow) => void }) {
  const label = item.revoked_at ? "REVOKED" : item.last_used_at ? "LIVE" : "UNUSED";
  const tone = item.revoked_at ? { background: "#f4f3f1", color: "#64686d" } : item.last_used_at ? { background: "#eef6f1", color: "#1a6b43" } : { background: "#fff3e9", color: "#7a5310" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: "1px solid #f4f2ef", opacity: item.revoked_at ? .55 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: "flex", alignItems: "baseline", gap: 9 }}><span style={{ font: "500 12.5px/1.35 'Inter',sans-serif", color: "#1c1f23" }}>{item.name}</span><span style={{ font: "400 11px/1.4 'IBM Plex Mono',monospace", color: "#64686d" }}>{item.key_prefix}••••</span></div><div style={{ marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", font: "400 10.5px/1.5 'IBM Plex Mono',monospace", color: "#64686d" }}>{item.scopes.join(", ")}</div></div>
      <span aria-label="Usage metric unavailable" style={{ width: 150, height: 22, flex: "none", display: "flex", alignItems: "flex-end", gap: 2 }}>{Array.from({ length: 12 }, (_, index) => <span key={index} style={{ flex: 1, height: 2, borderRadius: 1, background: "#efece8", display: "block" }} />)}</span>
      <span style={{ width: 74, flex: "none", textAlign: "right", font: "400 10.5px/1.4 'IBM Plex Mono',monospace", color: "#64686d" }}>—</span>
      <span style={{ width: 80, flex: "none", textAlign: "right", font: "400 11px/1.4 'IBM Plex Mono',monospace", color: "#64686d" }}>{item.rate_limit_per_minute}/min</span>
      <span style={{ width: 96, flex: "none", textAlign: "right", font: "400 11px/1.4 'IBM Plex Mono',monospace", color: !item.last_used_at && !item.revoked_at ? "#b0431a" : "#64686d" }}>{formatLastUsed(item.last_used_at)}</span>
      <span style={{ width: 88, flex: "none", textAlign: "right" }}>{item.revoked_at ? <span style={{ padding: "2px 7px", borderRadius: 5, ...tone, font: "500 10px/1.5 'Inter',sans-serif" }}>{label}</span> : <button type="button" title={`Revoke ${item.name}`} onClick={() => onRevoke(item)} style={{ appearance: "none", border: 0, padding: "2px 7px", borderRadius: 5, ...tone, font: "500 10px/1.5 'Inter',sans-serif", cursor: "pointer" }}>{label}</button>}</span>
    </div>
  );
}

function CapabilitiesCard() {
  const unavailable = [{ scope: "write:decisions", label: "Record a merchant decision" }, { scope: "write:money", label: "Refund, claim, write off, close a period" }];
  return (
    <section style={{ ...card, padding: "13px 16px 12px", flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ paddingBottom: 9, font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: ".09em", color: "#64686d" }}>WHAT A KEY MAY DO</div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {API_SCOPES.map((scope, index) => <div key={scope} style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 0", borderTop: index ? "1px solid #f4f2ef" : undefined }}><span style={{ width: 118, flex: "none", font: "400 11.5px/1.4 'IBM Plex Mono',monospace", color: "#1c1f23" }}>{scope}</span><span style={{ flex: 1, minWidth: 0, font: "400 11.5px/1.4 'Inter',sans-serif", color: "#64686d" }}>{API_SCOPE_LABELS[scope]}</span><span style={{ width: 9, height: 9, borderRadius: "50%", background: "#1c1f23" }} /></div>)}
        {unavailable.map((item) => <div key={item.scope} style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 0", borderTop: "1px solid #f4f2ef" }}><span style={{ width: 118, flex: "none", font: "400 11.5px/1.4 'IBM Plex Mono',monospace", color: "#a7abad" }}>{item.scope}</span><span style={{ flex: 1, minWidth: 0, font: "400 11.5px/1.4 'Inter',sans-serif", color: "#64686d" }}>{item.label}</span><span style={{ width: 9, height: 1.5, background: "#ddd8d1" }} /></div>)}
      </div>
      <div style={{ borderTop: "1px solid #e4e3e0", marginTop: 8, paddingTop: 9, font: "400 11px/1.5 'Inter',sans-serif", color: "#64686d" }}>Scopes that make merchant decisions or move money are not offered to any key, at any rate limit, for any plan.</div>
    </section>
  );
}

function RevealLifecycleCard() {
  return (
    <section style={{ ...card, padding: "13px 16px 12px", flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ paddingBottom: 9, font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: ".09em", color: "#64686d" }}>WHEN A KEY IS CREATED</div>
      <div style={{ background: "#1c1f23", borderRadius: 10, padding: "13px 14px", display: "flex", flexDirection: "column", gap: 9 }}><span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".06em", color: "#64686d" }}>SHOWN ONCE, THEN NEVER AGAIN</span><span style={{ font: "400 12.5px/1.5 'IBM Plex Mono',monospace", color: "#f0ede8", wordBreak: "break-all" }}>No key is currently being revealed</span></div>
      <div style={{ marginTop: 12, font: "400 11.5px/1.5 'Inter',sans-serif", color: "#64686d" }}>Unauth stores a hash, not the key. If a secret is lost, revoke that key and create another. Existing secrets cannot be recovered.</div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", borderTop: "1px solid #e4e3e0", marginTop: 10, paddingTop: 11 }}><span style={{ font: "400 10.5px/1.5 'IBM Plex Mono',monospace", color: "#64686d" }}>revocation is immediate and cannot be undone</span></div>
    </section>
  );
}
