"use client";

import { useState, type FormEvent } from "react";
import { useFetchJson } from "@/lib/react/useFetchJson";
import { ConnectorSetupNotice } from "@/components/settings/ConnectorSetupShell";
import {
  ZENDESK_CONNECT_CREDENTIALS_ERROR,
  ZENDESK_CONNECT_CREDENTIALS_ERROR_CODE,
  type ZendeskSupportConnectionSettings,
} from "@/lib/support/zendesk/supportConnectionShared";
import { formatDateTime } from "@/lib/utils/format";

type Props = {
  canManage: boolean;
};

type Message = { type: "success" | "error"; text: string } | null;

export default function ZendeskSupportSyncClient({ canManage }: Props) {
  const {
    data: payload,
    loading,
    error: loadError,
    reload: reloadConnection,
  } = useFetchJson<{
    connection?: ZendeskSupportConnectionSettings | null;
    connected?: boolean;
  }>("/api/settings/zendesk/connection", {
    parse: async (response) => {
      const body = (await response.json()) as {
        connection?: ZendeskSupportConnectionSettings | null;
        connected?: boolean;
        error?: string;
      };
      if (!response.ok)
        throw new Error(body.error ?? "Failed to load Zendesk connection");
      return body;
    },
  });

  const connection = payload?.connection ?? null;
  const apiConfigured = Boolean(connection?.zendesk_api_configured);

  const [subdomain, setSubdomain] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [agentEmail, setAgentEmail] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function saveConnection(event: FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/zendesk/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain,
          name: displayName || undefined,
          zendesk_agent_email: agentEmail,
          zendesk_api_token: apiToken,
        }),
      });
      const body = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) {
        setMessage({
          type: "error",
          text:
            body.code === ZENDESK_CONNECT_CREDENTIALS_ERROR_CODE
              ? ZENDESK_CONNECT_CREDENTIALS_ERROR
              : (body.error ?? "Failed to save Zendesk connection"),
        });
        return;
      }
      setMessage({
        type: "success",
        text: "Zendesk connected. Historical tickets are syncing in the background (up to 24 months).",
      });
      setApiToken("");
      reloadConnection();
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Failed to save Zendesk connection",
      });
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    if (!canManage || !apiConfigured) return;
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/zendesk/sync", { method: "POST" });
      const body = (await res.json()) as {
        error?: string;
        ingested?: number;
        tickets_listed?: number;
      };
      if (!res.ok) {
        setMessage({ type: "error", text: body.error ?? "Ticket sync failed" });
        return;
      }
      setMessage({
        type: "success",
        text: `Synced ${body.ingested ?? 0} ticket(s) from ${body.tickets_listed ?? 0} listed.`,
      });
      reloadConnection();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Ticket sync failed",
      });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section
      className="rounded-md border p-5 space-y-5"
      style={{ borderColor: "#e4e3e0", background: "#fff" }}
    >
      <div>
        <h2 className="font-medium text-[13px] leading-5 text-[#1c1f23]" style={{ color: "#1c1f23" }}>
          Zendesk ticket history sync
        </h2>
        <p className="text-[13px] leading-5 text-[#40454a] mt-1" style={{ color: "#64686d" }}>
          Connect Zendesk with an API token so Unauth can import past support
          tickets and link them to Shopify orders and customer profiles.
        </p>
      </div>

      {(message || loadError) && (
        <ConnectorSetupNotice tone={message?.type ?? "error"}>
          {message?.text ?? loadError}
          {(message?.type ?? "error") === "error" ? " Check the credentials or provider access, then retry." : null}
        </ConnectorSetupNotice>
      )}

      {loading ? (
        <p className="text-[13px] leading-5 text-[#40454a]" style={{ color: "#64686d" }}>
          Loading connection…
        </p>
      ) : (
        <>
          {apiConfigured && connection ? (
            <div
              className="text-[12px] leading-[1.45] text-[#40454a] rounded-md border px-3 py-2 space-y-1"
              style={{ borderColor: "#e4e3e0" }}
            >
              <p style={{ color: "#1c1f23" }}>
                Connected: <strong>{connection.provider_account_id}</strong>
                {connection.provider_account_name
                  ? ` (${connection.provider_account_name})`
                  : null}
              </p>
              {connection.last_sync_at ? (
                <p style={{ color: "#64686d" }}>
                  Last sync:{" "}
                  {formatDateTime(connection.last_sync_at)}
                </p>
              ) : (
                <p style={{ color: "#64686d" }}>
                  No ticket sync completed yet.
                </p>
              )}
              {connection.last_error ? (
                <p style={{ color: "#b0431a" }} role="alert">
                  {connection.last_error}
                </p>
              ) : null}
            </div>
          ) : null}

          <form
            onSubmit={(e) => void saveConnection(e)}
            className="space-y-3 max-w-md"
          >
            <label className="text-[13px] leading-5 text-[#40454a] block">
              <span style={{ color: "#64686d" }}>
                Zendesk subdomain
              </span>
              <input
                type="text"
                required
                disabled={!canManage || busy}
                placeholder="yourbrand"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                className="text-[13px] leading-5 text-[#40454a] mt-1 w-full rounded-md border px-3 py-2"
                style={{ borderColor: "#e4e3e0", color: "#1c1f23" }}
              />
            </label>
            <label className="text-[13px] leading-5 text-[#40454a] block">
              <span style={{ color: "#64686d" }}>
                Display name (optional)
              </span>
              <input
                type="text"
                disabled={!canManage || busy}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="text-[13px] leading-5 text-[#40454a] mt-1 w-full rounded-md border px-3 py-2"
                style={{ borderColor: "#e4e3e0", color: "#1c1f23" }}
              />
            </label>
            <label className="text-[13px] leading-5 text-[#40454a] block">
              <span style={{ color: "#64686d" }}>
                Agent email
              </span>
              <input
                type="email"
                required
                disabled={!canManage || busy}
                placeholder="agent@yourbrand.com"
                value={agentEmail}
                onChange={(e) => setAgentEmail(e.target.value)}
                className="text-[13px] leading-5 text-[#40454a] mt-1 w-full rounded-md border px-3 py-2"
                style={{ borderColor: "#e4e3e0", color: "#1c1f23" }}
              />
            </label>
            <label className="text-[13px] leading-5 text-[#40454a] block">
              <span style={{ color: "#64686d" }}>API token</span>
              <input
                type="password"
                required
                autoComplete="off"
                disabled={!canManage || busy}
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                className="text-[13px] leading-5 text-[#40454a] mt-1 w-full rounded-md border px-3 py-2"
                style={{ borderColor: "#e4e3e0", color: "#1c1f23" }}
              />
            </label>
            <p className="text-[11.5px] leading-[1.45] text-[#64686d]" style={{ color: "#64686d" }}>
              Create a token in Zendesk Admin, then open Apps and integrations,
              then APIs and Zendesk API. Use an admin or agent account with ticket read
              access.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={!canManage || busy}
                className="text-[11px] font-medium leading-4 text-[#64686d] rounded-md px-3 py-2 font-medium disabled:opacity-60"
                style={{ background: "#9f4f08", color: "#fff" }}
              >
                {busy
                  ? "Saving…"
                  : apiConfigured
                    ? "Update & resync tickets"
                    : "Connect & sync tickets"}
              </button>
              {apiConfigured ? (
                <button
                  type="button"
                  disabled={!canManage || syncing}
                  onClick={() => void syncNow()}
                  className="text-[11px] font-medium leading-4 text-[#64686d] rounded-md border px-3 py-2 font-medium disabled:opacity-60"
                  style={{ borderColor: "#e4e3e0", color: "#1c1f23" }}
                >
                  {syncing ? "Syncing…" : "Sync tickets now"}
                </button>
              ) : null}
            </div>
          </form>
        </>
      )}
    </section>
  );
}
