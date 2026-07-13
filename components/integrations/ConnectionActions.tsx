"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, RefreshCw, Unplug } from "lucide-react";
import { Button, Modal, PanelCard } from "@/components/ui";

const SETUP_LINKS: Record<string, string> = {
  shopify: "/settings/integrations/shopify",
  gorgias: "/settings/integrations/gorgias",
  shipbob: "/api/integrations/shipbob/install",
  document_upload: "/settings/agreements",
};

export function ConnectionActions({
  providerId,
  providerName,
  status,
  canManage,
}: {
  providerId: string;
  providerName: string;
  status: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const connected = !["not_connected", "revoked", "disabled"].includes(status);
  const [disconnecting, setDisconnecting] = useState(false);
  const [credentialOpen, setCredentialOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  async function action(path: string, body: unknown = {}) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok)
      throw new Error(payload.error ?? `${providerName} action failed`);
    return payload;
  }

  async function sync() {
    setBusy("sync");
    setMessage(null);
    try {
      const payload =
        providerId === "shipbob"
          ? await action("/api/integrations/shipbob/sync-account")
          : await action(`/api/integrations/${providerId}/sync`);
      setMessage({
        tone: "success",
        text:
          payload.ran === false
            ? "A sync is already running or no retry is due."
            : `Sync completed${payload.importedRecords != null ? ` · ${payload.importedRecords} records` : ""}.`,
      });
      router.refresh();
    } catch (reason) {
      setMessage({
        tone: "error",
        text: reason instanceof Error ? reason.message : "Sync failed",
      });
    } finally {
      setBusy(null);
    }
  }

  async function disconnect() {
    setBusy("disconnect");
    setMessage(null);
    try {
      await action(`/api/integrations/${providerId}/disconnect`);
      setDisconnecting(false);
      setMessage({
        tone: "success",
        text: `${providerName} disconnected. Stored canonical records and audit history were retained.`,
      });
      router.refresh();
    } catch (reason) {
      setMessage({
        tone: "error",
        text: reason instanceof Error ? reason.message : "Disconnect failed",
      });
    } finally {
      setBusy(null);
    }
  }

  async function connectApiKey() {
    setBusy("connect");
    setMessage(null);
    try {
      await action(`/api/integrations/${providerId}/connect`, {
        apiKey,
        webhookSecret: webhookSecret || undefined,
      });
      setCredentialOpen(false);
      setApiKey("");
      setWebhookSecret("");
      setMessage({
        tone: "success",
        text: `${providerName} credentials verified and stored encrypted.`,
      });
      router.refresh();
    } catch (reason) {
      setMessage({
        tone: "error",
        text: reason instanceof Error ? reason.message : "Connection failed",
      });
    } finally {
      setBusy(null);
    }
  }

  if (!canManage)
    return (
      <PanelCard
        variant="appInset"
        className="p-3 text-sm text-[var(--text-secondary)]"
      >
        You have read-only access. Managing credentials, retries and
        disconnection requires the settings-management permission.
      </PanelCard>
    );
  const setup = SETUP_LINKS[providerId];
  return (
    <div className="space-y-3">
      {message ? (
        <p
          role="status"
          className="rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor:
              message.tone === "error" ? "var(--danger)" : "var(--success)",
            color:
              message.tone === "error"
                ? "var(--danger)"
                : "var(--text-primary)",
          }}
        >
          {message.text}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {!connected && setup ? (
          <Link
            href={setup}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            <KeyRound className="h-4 w-4" /> Connect {providerName}
          </Link>
        ) : null}
        {!connected && providerId === "aftership" ? (
          <Button
            variant="primary"
            leadingIcon={<KeyRound className="h-4 w-4" />}
            onClick={() => setCredentialOpen(true)}
          >
            Connect {providerName}
          </Button>
        ) : null}
        {connected && providerId === "shipbob" ? (
          <Button
            variant="primary"
            leadingIcon={<RefreshCw className="h-4 w-4" />}
            loading={busy === "sync"}
            onClick={sync}
          >
            {status === "error" || status === "attention_required"
              ? "Retry import"
              : "Sync account"}
          </Button>
        ) : null}
        {connected &&
        (providerId === "shopify" || providerId === "gorgias") &&
        setup ? (
          <Link
            href={setup}
            className="inline-flex items-center rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
          >
            Manage credentials
          </Link>
        ) : null}
        {connected ? (
          <Button
            variant="ghost"
            leadingIcon={<Unplug className="h-4 w-4" />}
            onClick={() => setDisconnecting(true)}
          >
            Disconnect
          </Button>
        ) : null}
      </div>
      {connected && providerId === "aftership" ? (
        <p className="text-xs text-[var(--text-tertiary)]">
          Tracking evidence is fetched from a case or order because AfterShip
          requires a tracking number; there is no false account-wide sync
          action.
        </p>
      ) : null}
      <Modal
        open={disconnecting}
        onClose={() => setDisconnecting(false)}
        title={`Disconnect ${providerName}`}
        description="New imports and webhooks stop. Canonical records, evidence and audit history remain available."
        actions={[
          {
            label: busy === "disconnect" ? "Disconnecting…" : "Disconnect",
            variant: "danger",
            onClick: disconnect,
          },
        ]}
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Reconnect later to resume future ingestion. Existing case decisions
          and source provenance are never deleted by this action.
        </p>
      </Modal>
      <Modal
        open={credentialOpen}
        onClose={() => setCredentialOpen(false)}
        title={`Connect ${providerName}`}
        description="Credentials are verified before encrypted storage."
      >
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
            API key
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
            Webhook secret (optional)
            <input
              type="password"
              autoComplete="off"
              value={webhookSecret}
              onChange={(event) => setWebhookSecret(event.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCredentialOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={apiKey.trim().length < 8}
              loading={busy === "connect"}
              onClick={connectApiKey}
            >
              Verify and connect
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
