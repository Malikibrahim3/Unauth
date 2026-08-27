"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, RefreshCw, Unplug } from "lucide-react";
import { BeforeYouConfirm, Button, Input, Modal, Select } from "@/components/ui";
import { projectConnectionActionMode } from "@/lib/connections/actionMode";
import type {
  ConnectionConfigurationState,
  ConnectionOperationalState,
} from "@/lib/connections/readModel";
import type { EffectiveConnectionBadge } from "@/lib/connections/effectiveStatus";
import { getIntegrationProvider } from "@/lib/integrations/registry";
import styles from "@/components/sources/SourcesSurface.module.css";

function preserveReturnPath(href: string, returnTo: string | undefined) {
  if (!returnTo) return href;
  const destination = new URL(href, "https://application.local");
  destination.searchParams.set("returnTo", returnTo);
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

export function ConnectionActions({
  providerId,
  providerName,
  configuration,
  operational,
  badge,
  note,
  canManage,
  returnTo,
}: {
  providerId: string;
  providerName: string;
  configuration: ConnectionConfigurationState;
  operational: ConnectionOperationalState;
  badge: EffectiveConnectionBadge;
  note?: string | null;
  canManage: boolean;
  returnTo?: string;
}) {
  const router = useRouter();
  const actionMode = projectConnectionActionMode({ configuration, operational, badge, providerId });
  const connected = configuration === "configured";
  const isCarrier = providerId === "ups" || providerId === "fedex";
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectConfirmation, setDisconnectConfirmation] = useState("");
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
      setDisconnectConfirmation("");
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

  function closeCredentialBoundary() {
    setCredentialOpen(false);
    setClientId("");
    setClientSecret("");
    setAccountNumber("");
  }

  if (!canManage)
    return (
      <div className={styles.actionPanel}>
        You have read-only access. Managing credentials, retries and
        disconnection requires the settings-management permission.
      </div>
    );
  const setup = getIntegrationProvider(providerId)?.setupHref;
  const setupWithReturn = setup ? preserveReturnPath(setup, returnTo) : null;
  if (actionMode.mode === "unavailable") {
    return (
      <div className={styles.actionPanel}>
        Connection controls are unavailable because the resolved configuration and health state are incompatible. No connection action was offered.
      </div>
    );
  }
  if ((actionMode.mode === "connect" || actionMode.mode === "repair") && !setup && !isCarrier && providerId !== "shipbob") {
    return (
      <div className={styles.actionPanel}>
        Connection setup is not available in the shared catalogue yet. The capability contract below documents the currently implemented coverage.
      </div>
    );
  }
  return (
    <section className={styles.actionPanel} aria-labelledby="connection-controls-title">
      <div>
        <h2 id="connection-controls-title" className="ua-text-working-title text-[var(--uo-route-text-primary)]">
          {actionMode.mode === "connect"
            ? `Connect ${providerName}`
            : actionMode.mode === "repair"
              ? `Repair ${providerName}`
              : "Connection controls"}
        </h2>
        <p className="mt-1 ua-text-caption-role">
          {actionMode.mode === "connect"
            ? "Connect this provider to make its supported source records available to your case evidence."
            : actionMode.mode === "repair"
              ? "The connection is established but needs credential or setup repair. Existing records and audit history stay available."
              : "Refresh access, review setup, or stop future ingestion. Existing records and audit history stay available."}
        </p>
      </div>
      {note ? <p className="ua-text-metadata">{note}</p> : null}
      {message ? (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`rounded-md border px-3 py-2 ua-text-body ${message.tone === "error" ? "border-[var(--uo-route-critical-border)] bg-[var(--uo-route-critical-bg)] text-[var(--uo-route-critical)]" : "border-[var(--uo-route-success-border)] bg-[var(--uo-route-success-bg)] text-[var(--uo-route-text-primary)]"}`}
        >
          {message.text}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {actionMode.connectLabel && setupWithReturn && providerId !== "shipbob" && !isCarrier ? (
          <Link
            href={setupWithReturn}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--uo-route-action-primary)] px-4 py-2 ua-text-working-title text-[var(--uo-route-action-primary-fg)]"
          >
            <KeyRound className="h-4 w-4" /> {actionMode.connectLabel} {providerName}
          </Link>
        ) : null}
        {actionMode.connectLabel && providerId === "shipbob" ? (
          <Button
            variant="primary"
            leadingIcon={<KeyRound className="h-4 w-4" />}
            onClick={() => setShipBobOpen(true)}
          >
            {actionMode.connectLabel} {providerName}
          </Button>
        ) : null}
        {actionMode.connectLabel && isCarrier ? (
          <Button
            variant="primary"
            leadingIcon={<KeyRound className="h-4 w-4" />}
            onClick={() => setCredentialOpen(true)}
          >
            {actionMode.connectLabel} {providerName}
          </Button>
        ) : null}
        {actionMode.syncLabel ? (
          <Button
            variant="primary"
            leadingIcon={<RefreshCw className="h-4 w-4" />}
            loading={busy === "sync"}
            onClick={sync}
          >
            {actionMode.syncLabel}
          </Button>
        ) : null}
        {actionMode.mode === "sync_pending" ? (
          <span role="status" className="ua-text-label inline-flex items-center gap-2 text-[var(--uo-route-text-secondary)]">
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Sync in progress
          </span>
        ) : null}
        {actionMode.showManage && setupWithReturn ? (
          <Link
            href={setupWithReturn}
            className="inline-flex items-center rounded-md border border-[var(--uo-route-border-default)] px-4 py-2 ua-text-working-title text-[var(--uo-route-text-primary)]"
          >
            Manage connection
          </Link>
        ) : null}
        {actionMode.showDisconnect ? (
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
        <p className="ua-text-metadata">
          Carrier evidence is fetched for matching case and order tracking numbers. Availability of photos and signatures depends on the shipment and account permissions.
        </p>
      ) : null}
      <Modal
        open={disconnecting}
        onClose={() => { setDisconnecting(false); setDisconnectConfirmation(""); }}
        title={`Disconnect ${providerName}`}
        description="New imports and webhooks stop. Canonical records, evidence and audit history remain available."
        overlayId="connection-and-disconnection-modals"
        actions={[
          {
            label: busy === "disconnect" ? "Disconnecting…" : "Disconnect",
            variant: "danger",
            onClick: disconnect,
            disabled: busy === "disconnect" || disconnectConfirmation !== providerName.toUpperCase(),
          },
        ]}
      >
        <div className="space-y-4">
          <p className="ua-text-body text-[var(--uo-route-text-secondary)]">
            Reconnect later to resume future ingestion. Existing case decisions
            and source provenance are never deleted by this action.
          </p>
          <label className="ua-text-label grid gap-1">
            Type {providerName.toUpperCase()} to confirm
            <Input value={disconnectConfirmation} onChange={(event) => setDisconnectConfirmation(event.target.value)} autoComplete="off" />
          </label>
          <BeforeYouConfirm
            objectSummary={`${providerName} connection`}
            valueSummary="No figure is deleted. Source freshness becomes unavailable rather than zero."
            externalAction={`Yes. Unauth revokes or disables ${providerName} access and stops future ingestion.`}
            reversible="You can reconnect, but any gap in coverage remains visible and may require a source-supported backfill."
            appendOnly="A disconnection event, the resulting coverage changes and an audit entry naming the actor."
          />
        </div>
      </Modal>
      <Modal
        open={shipBobOpen}
        onClose={() => setShipBobOpen(false)}
        title={`${actionMode.connectLabel ?? "Connect"} ${providerName}`}
        description="Choose the ShipBob account environment before authorizing access."
        overlayId="connection-and-disconnection-modals"
      >
        <div className="space-y-3">
          <label className="block ua-text-label">
            Environment
            <Select
              value={environment}
              onChange={(event) => setEnvironment(event.target.value as "sandbox" | "production")}
              className="mt-1 w-full rounded-md border border-[var(--uo-route-border-default)] bg-[var(--uo-route-surface-primary)] px-3 py-2 ua-text-body"
            >
              <option value="production">Production</option>
              <option value="sandbox">Sandbox</option>
            </Select>
          </label>
          <BeforeYouConfirm
            objectSummary={`New ${providerName} connection`}
            valueSummary="No financial value changes. Ingestion only."
            externalAction={`Yes. You leave Unauth for ${providerName} to approve access.`}
            reversible="Yes. Disconnecting stops ingestion and retains canonical records already held."
            appendOnly="A connection record, the provider authorization result and an audit entry."
          />
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
        onClose={closeCredentialBoundary}
        title={`${actionMode.connectLabel ?? "Connect"} ${providerName}`}
        description="Credentials are verified before encrypted storage."
        overlayId="connection-and-disconnection-modals"
      >
        <div className="space-y-3">
          <label className="block ua-text-label">
            Client ID
            <Input
              type="password"
              autoComplete="off"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block ua-text-label">
            Client secret
            <Input
              type="password"
              autoComplete="off"
              value={clientSecret}
              onChange={(event) => setClientSecret(event.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block ua-text-label">
            Shipper account number (optional for basic tracking)
            <Input
              type="password"
              autoComplete="off"
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block ua-text-label">
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
          <BeforeYouConfirm
            objectSummary={`New ${providerName} connection`}
            valueSummary="No financial value changes."
            externalAction={`Yes. Unauth calls ${providerName} to verify the credentials before encrypted storage.`}
            reversible="Yes. Disconnecting stops ingestion; already-ingested records remain."
            appendOnly="A connection record, verification result and an audit entry. Secrets are never shown again."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeCredentialBoundary}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={clientId.trim().length < 3 || clientSecret.trim().length < 3}
              loading={busy === "connect"}
              onClick={connectCarrier}
            >
              Verify and {actionMode.connectLabel === "Reconnect" ? "reconnect" : "connect"}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
