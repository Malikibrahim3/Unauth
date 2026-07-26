"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, RefreshCw, Unplug } from "lucide-react";
import { Button, Card, Input, Modal, Select } from "@/components/ui";
import { getIntegrationProvider } from "@/lib/integrations/registry";

export function isConnectedIntegrationStatus(status: string) {
  return ["connected", "active", "degraded", "syncing", "attention_required"].includes(status);
}

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
  const connected = isConnectedIntegrationStatus(status);
  const isCarrier = providerId === "ups" || providerId === "fedex";
  const [disconnecting, setDisconnecting] = useState(false);
  const [credentialOpen, setCredentialOpen] = useState(false);
  const [shipBobOpen, setShipBobOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("production");
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

  async function connectCarrier() {
    setBusy("connect");
    setMessage(null);
    try {
      await action(`/api/integrations/${providerId}/connect`, {
        clientId,
        clientSecret,
        accountNumber: accountNumber || undefined,
        environment,
      });
      setCredentialOpen(false);
      setClientId("");
      setClientSecret("");
      setAccountNumber("");
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
      <Card unstyled
        variant="muted"
        className="p-3 text-sm text-[var(--ua-text-secondary)]"
      >
        You have read-only access. Managing credentials, retries and
        disconnection requires the settings-management permission.
      </Card>
    );
  const setup = getIntegrationProvider(providerId)?.setupHref;
  if (!connected && !setup && !isCarrier) {
    return (
      <Card unstyled variant="muted" className="p-3 text-sm text-[var(--ua-text-secondary)]">
        Connection setup is not available in the shared catalogue yet. The capability contract below documents the currently implemented coverage.
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {message ? (
        <p
          role="status"
          className="rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor:
              message.tone === "error" ? "var(--ua-critical)" : "var(--ua-success)",
            color:
              message.tone === "error"
                ? "var(--ua-critical)"
                : "var(--ua-text-primary)",
          }}
        >
          {message.text}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {!connected && setup && providerId !== "shipbob" ? (
          <Link
            href={setup}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--ua-action-primary)] px-4 py-2 text-sm font-semibold text-[var(--ua-action-primary-fg)]"
          >
            <KeyRound className="h-4 w-4" /> Connect {providerName}
          </Link>
        ) : null}
        {!connected && providerId === "shipbob" ? (
          <Button
            variant="primary"
            leadingIcon={<KeyRound className="h-4 w-4" />}
            onClick={() => setShipBobOpen(true)}
          >
            Connect {providerName}
          </Button>
        ) : null}
        {!connected && isCarrier ? (
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
        {connected && setup ? (
          <Link
            href={setup}
            className="inline-flex items-center rounded-md border border-[var(--ua-border-default)] px-4 py-2 text-sm font-semibold text-[var(--ua-text-primary)]"
          >
            Manage connection
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
      {connected && isCarrier ? (
        <p className="text-xs text-[var(--ua-text-tertiary)]">
          Carrier evidence is fetched for matching case and order tracking numbers. Availability of photos and signatures depends on the shipment and account permissions.
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
        <p className="text-sm text-[var(--ua-text-secondary)]">
          Reconnect later to resume future ingestion. Existing case decisions
          and source provenance are never deleted by this action.
        </p>
      </Modal>
      <Modal
        open={shipBobOpen}
        onClose={() => setShipBobOpen(false)}
        title={`Connect ${providerName}`}
        description="Choose the ShipBob account environment before authorizing access."
      >
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[var(--ua-text-secondary)]">
            Environment
            <Select
              value={environment}
              onChange={(event) => setEnvironment(event.target.value as "sandbox" | "production")}
              className="mt-1 w-full rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3 py-2 text-sm"
            >
              <option value="production">Production</option>
              <option value="sandbox">Sandbox</option>
            </Select>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShipBobOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => router.push(`/api/integrations/shipbob/install?environment=${environment}`)}
            >
              Continue to ShipBob
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        open={credentialOpen}
        onClose={() => setCredentialOpen(false)}
        title={`Connect ${providerName}`}
        description="Credentials are verified before encrypted storage."
      >
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[var(--ua-text-secondary)]">
            Client ID
            <Input
              type="password"
              autoComplete="off"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--ua-text-secondary)]">
            Client secret
            <Input
              type="password"
              autoComplete="off"
              value={clientSecret}
              onChange={(event) => setClientSecret(event.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--ua-text-secondary)]">
            Shipper account number (optional for basic tracking)
            <Input
              type="password"
              autoComplete="off"
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--ua-text-secondary)]">
            Environment
            <Select
              value={environment}
              onChange={(event) => setEnvironment(event.target.value as "sandbox" | "production")}
              className="mt-1"
            >
              <option value="production">Production</option>
              <option value="sandbox">Sandbox</option>
            </Select>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCredentialOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={clientId.trim().length < 3 || clientSecret.trim().length < 3}
              loading={busy === "connect"}
              onClick={connectCarrier}
            >
              Verify and connect
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
