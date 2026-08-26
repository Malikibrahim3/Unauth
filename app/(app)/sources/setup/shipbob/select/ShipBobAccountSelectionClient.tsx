"use client";

import { useState } from "react";
import { Check, RefreshCw, Search } from "lucide-react";
import { ConnectorSetupShell } from "@/components/settings/ConnectorSetupShell";
import { Button, ButtonLink, Input, PageFrame, StatusBadge } from "@/components/ui";
import { ProviderLogo } from "@/components/identity/ProviderLogo";
import { useFetchJson } from "@/lib/react/useFetchJson";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import styles from "./ShipBobSelectionOperations.module.css";

type Account = { id: string; name: string | null };
type SelectionResponse = { accounts: Account[]; environment: string; expiresAt: string };

export default function ShipBobAccountSelectionClient({ selectionId, returnTo }: { selectionId: string; returnTo: string }) {
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [submission, setSubmission] = useState<{ status: "idle" | "saving" | "error"; message: string }>({ status: "idle", message: "" });
  const resource = useFetchJson<SelectionResponse>(selectionId ? `/api/integrations/shipbob/selection?selection=${encodeURIComponent(selectionId)}` : null, {
    parse: async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to load ShipBob channels.");
      return body as SelectionResponse;
    },
  });
  const accounts = resource.data?.accounts ?? [];
  const visibleAccounts = accounts.filter((account) => `${account.name ?? ''} ${account.id}`.toLowerCase().includes(query.trim().toLowerCase()));
  const environment = resource.data?.environment ?? "production";
  const expiresAt = resource.data?.expiresAt ?? null;
  const effectiveSelected = selected && visibleAccounts.some((account) => account.id === selected) ? selected : visibleAccounts[0]?.id ?? accounts[0]?.id ?? "";
  const invalidSelection = !selectionId;
  const status = submission.status === "saving" ? "saving" : submission.status === "error" || invalidSelection || resource.status === "error" ? "error" : resource.status === "success" || resource.status === "refreshing" ? "ready" : "loading";
  const message = submission.message || (invalidSelection ? "This selection link is invalid. Start the ShipBob connection again." : resource.status === "error" ? resource.error : resource.isInitialLoading ? "Discovering ShipBob channels…" : accounts.length === 0 ? "No ShipBob channels are available for this account." : "");

  async function submit() {
    if (!effectiveSelected || status !== "ready") return;
    setSubmission({ status: "saving", message: "Connecting the selected channel and starting the initial import…" });
    try {
      const response = await fetch("/api/integrations/shipbob/selection", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ selectionId, accountId: effectiveSelected }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "ShipBob connection failed.");
      window.location.assign(body.redirect);
    } catch (error) {
      setSubmission({ status: "error", message: error instanceof Error ? error.message : "ShipBob connection failed." });
    }
  }

  return (
    <PageFrame
      surfaceId="shipbob-channel-selection"
      archetype="P2-single-select-task"
      title="Connect ShipBob"
      breadcrumbs={[{ label: "Sources", href: "/sources/connected" }, { label: "ShipBob", href: "/sources/shipbob" }, { label: "Select channel" }]}
      actions={(
        <>
          <ButtonLink href={returnTo} variant="secondary" size="sm">Cancel setup</ButtonLink>
          <Button size="sm" loading={status === "saving"} disabled={status !== "ready" || !effectiveSelected} onClick={() => void submit()}>Continue</Button>
        </>
      )}
    >
      <ConnectorSetupShell
        provider="ShipBob"
        requirements="Choose the provider channel that owns this workspace connection. Its imports, webhooks, source health and audit history remain scoped to that channel."
        currentStage="connect"
      >
        <section className={styles.selection} aria-labelledby="shipbob-channels-title" data-state-id={`shipbob-selection-${status}`}>
          <header className={styles.header}>
            <div className={styles.identity}>
              <ProviderLogo provider="shipbob" name="ShipBob" />
              <div><h2 id="shipbob-channels-title">Choose a ShipBob channel</h2><p>Select exactly one channel for this workspace connection.</p></div>
            </div>
            <StatusBadge family="workflowStatus" value={status} />
          </header>

          <div className={styles.scope}>
            <span>Environment · {environment}</span>
            <span>{formatNumber(visibleAccounts.length)} of {formatNumber(accounts.length)} channels · {expiresAt ? `selection expires ${formatDateTime(expiresAt)}` : "expiry unavailable"}</span>
          </div>

          {accounts.length ? <label className={styles.search}><Search size={14} aria-hidden="true" /><span className="sr-only">Search ShipBob channels</span><Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search channel name or ID" aria-label="Search ShipBob channels" /></label> : null}

          {visibleAccounts.length ? (
            <fieldset className={styles.accounts}>
              <legend className="sr-only">ShipBob channel</legend>
              {visibleAccounts.map((account) => {
                const checked = account.id === effectiveSelected;
                return (
                  <label className={styles.account} key={account.id} data-selected={checked}>
                    <span className={styles.check} data-selected={checked}>{checked ? <Check size={13} aria-hidden="true" /> : null}</span>
                    <span><strong>{account.name ?? "Unnamed channel"}</strong><small>Channel ID · {account.id}</small></span>
                    <span>{environment}</span>
                    <input className="sr-only" type="radio" name="shipbob-channel" value={account.id} checked={checked} onChange={() => setSelected(account.id)} />
                  </label>
                );
              })}
            </fieldset>
          ) : (
            <div className={styles.empty} data-state-id={status === "loading" ? "shipbob-selection-loading" : "shipbob-selection-empty"}>
              <RefreshCw size={16} aria-hidden="true" />
              <strong>{status === "loading" ? "Discovering channels" : accounts.length ? "No channels match this search" : "Channel selection unavailable"}</strong>
              <span>{accounts.length ? "Clear the search to show every returned channel." : message || "No accounts were returned by ShipBob."}</span>
              {accounts.length ? <button type="button" onClick={() => setQuery('')}>Clear search</button> : null}
            </div>
          )}

          {message && accounts.length ? <p className={styles.notice} data-tone={status === "error" ? "danger" : "warning"} role={status === "error" ? "alert" : "status"}>{message}</p> : null}

          <footer className={styles.footer}>
            <span>The selected channel is recorded with this source connection.</span>
            <Button loading={status === "saving"} disabled={status !== "ready" || !effectiveSelected} onClick={() => void submit()}>{status === "saving" ? "Connecting…" : "Connect selected channel"}</Button>
          </footer>
        </section>
      </ConnectorSetupShell>
    </PageFrame>
  );
}
